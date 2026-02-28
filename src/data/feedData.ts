import scrapedAlertsPayload from '../../packages/rfmo-ingestion-pipeline/alerts.json';

export type FeedSourceType = 'pdf' | 'html' | 'docx' | 'unknown';
export type FeedCategory = 'quota' | 'closure' | 'species' | 'reporting' | 'penalty';
export type FeedStatus = 'processed' | 'pending' | 'flagged';

export interface FeedItem {
  id: string;
  sourceType: FeedSourceType;
  sourceName: string;
  sourceUrl: string;
  sourceOrg: string;
  region: string;
  category: FeedCategory;
  status: FeedStatus;
  title: string;
  rawSummary: string;
  rawFormat: string;
  rawLanguage: string;
  rawPages?: number;
  storedPath?: string;
  extractedTextPath?: string;
  aiCategory: string;
  aiSpecies: string;
  aiZone: string;
  aiChange: string;
  aiEffectiveDate: string;
  aiConfidence: number;
  actionRecommendation: string;
  actionVessels: string[];
  actionDeadline: string;
  actionStatus: 'pending' | 'approved' | 'dismissed';
  ingestedAt: string;
  minutesAgo: number;
}

type ScrapedAlert = {
  rfmo: string;
  alert_type: string;
  severity: string;
  document_type?: string;
  title: string;
  document_number?: string | null;
  published_date?: string | null;
  due_date?: string | null;
  what_changed?: string;
  action_required?: string;
  source_url?: string;
  stored_path?: string;
  extracted_text_path?: string;
};

const REGION_BY_RFMO: Record<string, string> = {
  IOTC: 'Indian Ocean',
  WCPFC: 'Western Pacific',
  ICCAT: 'Atlantic Ocean',
};

function sourceTypeFromUrl(url?: string): FeedSourceType {
  const lower = (url || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.html') || lower.includes('/measure/') || lower.includes('/meetings/')) return 'html';
  return 'unknown';
}

function feedCategoryFromAlertType(alertType: string): FeedCategory {
  if (alertType === 'QUOTA_OR_ALLOCATION_NOTICE') return 'quota';
  if (alertType === 'REPORTING_DEADLINE') return 'reporting';
  if (alertType === 'COMPLIANCE_SYSTEM_CHANGE') return 'penalty';
  return 'species';
}

function feedStatusFromSeverity(severity: string): FeedStatus {
  if (severity === 'high') return 'flagged';
  if (severity === 'medium') return 'pending';
  return 'processed';
}

function minutesAgoFromDate(isoDate?: string): number {
  if (!isoDate) return 99999;
  const parsed = Date.parse(isoDate);
  if (!Number.isFinite(parsed)) return 99999;
  return Math.max(0, Math.floor((Date.now() - parsed) / 60000));
}

const scrapedAlerts = ((scrapedAlertsPayload as { alerts?: ScrapedAlert[] }).alerts || []).filter(
  (row): row is ScrapedAlert => Boolean(row?.rfmo && row?.title),
);

const categoryToUi = (category: FeedCategory) => {
  if (category === 'penalty') return 'penalties';
  if (category === 'species') return 'species_status';
  return category;
};

export function getFeedItems(): FeedItem[] {
  return scrapedAlerts.map((alert, idx) => {
    const sourceType = sourceTypeFromUrl(alert.source_url || alert.stored_path);
    const published = alert.published_date || new Date().toISOString();
    const status = feedStatusFromSeverity(alert.severity);
    const category = feedCategoryFromAlertType(alert.alert_type);

    return {
    id: `feed-${idx + 1}`,
    sourceType,
    sourceName: alert.document_type || 'rfmo_document',
    sourceUrl: alert.source_url || '#',
    sourceOrg: alert.rfmo,
    region: REGION_BY_RFMO[alert.rfmo] || 'Global',
    category,
    status,
    title: alert.title,
    rawSummary: alert.what_changed || 'Scraped document update detected.',
    rawFormat: sourceType.toUpperCase(),
    rawLanguage: 'Unknown',
    rawPages: undefined,
    storedPath: alert.stored_path,
    extractedTextPath: alert.extracted_text_path,
    aiCategory: categoryToUi(category),
    aiSpecies: 'All Species',
    aiZone: alert.rfmo === 'WCPFC' ? 'WCPO High Seas' : alert.rfmo === 'ICCAT' ? 'NA-2' : alert.rfmo === 'IOTC' ? 'IO-4' : 'Unknown',
    aiChange: alert.what_changed || 'No parsed change summary.',
    aiEffectiveDate: published.slice(0, 10),
    aiConfidence: alert.severity === 'high' ? 95 : alert.severity === 'medium' ? 88 : 80,
    actionRecommendation: alert.action_required || 'Review source and decide implementation steps.',
    actionVessels: [],
    actionDeadline: alert.due_date || '',
    actionStatus: status === 'flagged' ? 'pending' : 'approved',
    ingestedAt: published,
    minutesAgo: minutesAgoFromDate(published),
    };
  });
}

export const FEED_SOURCE_TYPES: FeedSourceType[] = ['pdf', 'html', 'docx', 'unknown'];
export const FEED_CATEGORIES: FeedCategory[] = ['quota', 'closure', 'species', 'reporting', 'penalty'];
export const FEED_REGIONS = ['Indian Ocean', 'Western Pacific', 'Atlantic Ocean'];
