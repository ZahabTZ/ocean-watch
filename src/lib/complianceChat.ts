import { MOCK_ALERTS, MOCK_VESSELS, MOCK_RFMO_SOURCES, CATEGORY_META, ComplianceAlert } from '@/data/mockData';
import { UserProfile, filterAlerts, filterVessels } from './userProfile';

/**
 * Local compliance knowledge base query engine.
 * Answers natural language questions by querying structured RFMO data.
 * This is the demo layer — plug in Lovable AI for production.
 */

interface QueryResult {
  answer: string;
  sources: ComplianceAlert[];
}

const DEFAULT_FLEET_PROFILE = {
  zones: ['EPO-3', 'IO-4', 'Area 48.1', 'WCPO High Seas', 'NA-2'],
  species: ['Bigeye Tuna', 'Yellowfin Tuna', 'Swordfish', 'Antarctic Krill'],
  vesselNames: MOCK_VESSELS.map(v => v.name),
};

function matchesQuery(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

function extractKeywords(query: string): string[] {
  return query.toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['what', 'the', 'that', 'this', 'how', 'does', 'are', 'was', 'for', 'with', 'from', 'have', 'has', 'can', 'will', 'need', 'any', 'about'].includes(w));
}

function findRelevantAlerts(query: string, alerts: ComplianceAlert[] = MOCK_ALERTS): ComplianceAlert[] {
  const keywords = extractKeywords(query);
  const lower = query.toLowerCase();

  return alerts.filter(alert => {
    // Category-level matching
    if (lower.includes('quota') && alert.category === 'quota') return true;
    if (lower.includes('clos') && alert.category === 'closure') return true;
    if (lower.includes('report') && alert.category === 'reporting') return true;
    if (lower.includes('penalt') && alert.category === 'penalties') return true;
    if (lower.includes('species') && alert.category === 'species_status') return true;

    // Zone matching
    if (matchesQuery(query, [alert.zone])) return true;
    if (lower.includes('zone 4') && alert.zone === 'IO-4') return true;

    // Species matching
    if (matchesQuery(query, [alert.species])) return true;
    if (lower.includes('tuna') && alert.species.toLowerCase().includes('tuna')) return true;
    if (lower.includes('swordfish') && alert.species === 'Swordfish') return true;
    if (lower.includes('krill') && alert.species.includes('Krill')) return true;

    // RFMO matching
    if (matchesQuery(query, [alert.rfmo])) return true;

    // Vessel matching
    for (const v of alert.affectedVessels) {
      if (matchesQuery(query, [v])) return true;
    }

    // General keyword matching
    const searchable = `${alert.title} ${alert.summary} ${alert.changeDetail} ${alert.species} ${alert.zone}`.toLowerCase();
    const matched = keywords.filter(k => searchable.includes(k));
    return matched.length >= 2;
  });
}

function isComplianceQuestion(query: string): boolean {
  const lower = query.toLowerCase();
  return lower.includes('complian') || lower.includes('am i') || lower.includes('are we') || lower.includes('status');
}

function isDeadlineQuestion(query: string): boolean {
  const lower = query.toLowerCase();
  return lower.includes('before') || lower.includes('deadline') || lower.includes('by when') || lower.includes('need to do') || lower.includes('action');
}

function isWeeklyQuestion(query: string): boolean {
  const lower = query.toLowerCase();
  return lower.includes('this week') || lower.includes('changed') || lower.includes('new') || lower.includes('recent') || lower.includes('latest');
}

export function queryKnowledgeBase(query: string, profile?: UserProfile): QueryResult {
  const lower = query.toLowerCase();
  const baseAlerts = profile ? filterAlerts(MOCK_ALERTS, profile) : MOCK_ALERTS;
  const baseVessels = profile ? filterVessels(MOCK_VESSELS, profile) : MOCK_VESSELS;
  const baseSources = profile ? MOCK_RFMO_SOURCES.filter(s => profile.rfmos.includes(s.acronym)) : MOCK_RFMO_SOURCES;
  const fleetProfile = profile
    ? { zones: profile.zones, species: profile.species, vesselNames: profile.vesselNames }
    : DEFAULT_FLEET_PROFILE;
  const relevantAlerts = findRelevantAlerts(query, baseAlerts);

  // "What changed this week?"
  if (isWeeklyQuestion(lower) && relevantAlerts.length === 0) {
    const actionAlerts = baseAlerts.filter(a => a.status === 'action_required');
    const summary = actionAlerts.map(a => {
      const cat = CATEGORY_META[a.category];
      return `• **${cat.icon} ${a.title}** (${cat.label})\n  ${a.summary}`;
    }).join('\n\n');

    return {
      answer: `Here's what changed this week affecting your fleet:\n\n${summary}\n\n**${actionAlerts.length} items require action.** The most urgent deadline is ${actionAlerts.reduce((earliest, a) => a.actionDeadline < earliest ? a.actionDeadline : earliest, '9999-99-99')}.`,
      sources: actionAlerts,
    };
  }

  // Specific alerts found
  if (relevantAlerts.length > 0) {
    // Compliance check
    if (isComplianceQuestion(query)) {
      const actionNeeded = relevantAlerts.filter(a => a.status === 'action_required');
      if (actionNeeded.length > 0) {
        const details = actionNeeded.map(a => {
          const cat = CATEGORY_META[a.category];
          return `• **${cat.icon} ${a.title}**: ${a.changeDetail}\n  ⏰ Deadline: ${a.actionDeadline}`;
        }).join('\n\n');

        return {
          answer: `**⚠️ You are NOT fully compliant.** ${actionNeeded.length} issue(s) require action:\n\n${details}\n\nAffected vessels: ${[...new Set(actionNeeded.flatMap(a => a.affectedVessels))].join(', ')}.`,
          sources: actionNeeded,
        };
      }
      return {
        answer: `✅ **You are compliant** for the areas matching your query. No outstanding actions required.`,
        sources: relevantAlerts,
      };
    }

    // Deadline question
    if (isDeadlineQuestion(query)) {
      const withDeadlines = relevantAlerts
        .filter(a => a.status === 'action_required')
        .sort((a, b) => a.actionDeadline.localeCompare(b.actionDeadline));

      if (withDeadlines.length === 0) {
        return { answer: 'No pending deadlines match your query.', sources: relevantAlerts };
      }

      const list = withDeadlines.map(a => {
        const cat = CATEGORY_META[a.category];
        return `• **By ${a.actionDeadline}**: ${cat.icon} ${a.title}\n  ${a.changeDetail}\n  Vessels: ${a.affectedVessels.join(', ')}`;
      }).join('\n\n');

      return {
        answer: `Here's what you need to do:\n\n${list}`,
        sources: withDeadlines,
      };
    }

    // General answer
    const details = relevantAlerts.map(a => {
      const cat = CATEGORY_META[a.category];
      return `### ${cat.icon} ${a.title}\n**Category:** ${cat.label} | **RFMO:** ${a.rfmo} | **Zone:** ${a.zone}\n\n${a.summary}\n\n**Detail:** ${a.changeDetail}${a.previousValue ? `\n**Previous:** ${a.previousValue} → **New:** ${a.newValue}` : ''}${a.penaltyAmount ? `\n**Penalty:** ${a.penaltyAmount}` : ''}\n**Deadline:** ${a.actionDeadline} | **Effective:** ${a.effectiveDate}\n**Affected vessels:** ${a.affectedVessels.join(', ')}`;
    }).join('\n\n---\n\n');

    return {
      answer: `Found ${relevantAlerts.length} relevant update(s):\n\n${details}`,
      sources: relevantAlerts,
    };
  }

  // Fallback — general fleet status
  if (lower.includes('fleet') || lower.includes('vessel') || lower.includes('status')) {
    const atRisk = baseVessels.filter(v => v.status === 'at_risk');
    const actionNeeded = baseVessels.filter(v => v.status === 'action_needed');
    const compliant = baseVessels.filter(v => v.status === 'compliant');

    return {
      answer: `**Fleet Overview:**\n\n🔴 **At Risk (${atRisk.length}):** ${atRisk.map(v => `${v.flag} ${v.name}`).join(', ') || 'None'}\n\n🟡 **Action Needed (${actionNeeded.length}):** ${actionNeeded.map(v => `${v.flag} ${v.name}`).join(', ') || 'None'}\n\n🟢 **Compliant (${compliant.length}):** ${compliant.map(v => `${v.flag} ${v.name}`).join(', ') || 'None'}\n\nTotal: ${baseVessels.length} vessels across ${new Set(baseVessels.map(v => v.zone)).size} zones.`,
      sources: [],
    };
  }

  // Sources status
  if (lower.includes('source') || lower.includes('rfmo') || lower.includes('monitor')) {
    const online = baseSources.filter(s => s.status === 'online').length;
    return {
      answer: `**RFMO Monitoring Status:** ${online}/${baseSources.length} sources online.\n\n${baseSources.map(s => `• **${s.acronym}** (${s.region}): ${s.status === 'online' ? '🟢' : '🟡'} ${s.status} — ${s.documentsIngested} docs ingested, last checked ${s.lastChecked}`).join('\n')}`,
      sources: [],
    };
  }

  return {
    answer: `I searched your compliance knowledge base but didn't find specific matches for that query. Try asking about:\n\n• **Quotas** — "What quota changes affect my tuna fleet?"\n• **Zones** — "Am I compliant in Zone 4?"\n• **Deadlines** — "What do I need to do before March?"\n• **Fleet** — "Show me my fleet status"\n• **Sources** — "Are all RFMO sources online?"`,
    sources: [],
  };
}
