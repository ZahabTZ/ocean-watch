import scrapedAlertsPayload from '../../packages/rfmo-ingestion-pipeline/alerts.json';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'action_required' | 'acknowledged' | 'resolved';
export type AlertCategory = 'quota' | 'closure' | 'species_status' | 'reporting' | 'penalties';

export const CATEGORY_META: Record<AlertCategory, { label: string; icon: string; description: string }> = {
  quota: { label: 'Quota', icon: '📊', description: 'Species, zone, amount, change vs. previous' },
  closure: { label: 'Closure', icon: '🚫', description: 'Area, dates, what is prohibited' },
  species_status: { label: 'Species Status', icon: '🐟', description: 'New protections, measures, or process changes' },
  reporting: { label: 'Reporting', icon: '📋', description: 'New forms, deadlines, and frequencies' },
  penalties: { label: 'Penalties', icon: '⚠️', description: 'Compliance risk and enforcement impact' },
};

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  title: string;
  summary: string;
  rfmo: string;
  species: string;
  zone: string;
  effectiveDate: string;
  publishedDate: string;
  affectedVessels: string[];
  actionDeadline: string;
  changeDetail: string;
  previousValue?: string;
  newValue?: string;
  penaltyAmount?: string;
  sourceUrl?: string;
}

export interface Vessel {
  id: string;
  name: string;
  flag: string;
  zone: string;
  species: string[];
  status: 'compliant' | 'action_needed' | 'at_risk';
  lastUpdate: string;
  imo?: string;
  mmsi?: string;
  ircs?: string;
  win?: string;
  sourceUrl?: string;
}

export interface RFMOSource {
  id: string;
  name: string;
  acronym: string;
  lastChecked: string;
  lastUpdate: string;
  status: 'online' | 'checking' | 'error';
  documentsIngested: number;
  region: string;
}

export const DEMO_COMPANY = {
  name: 'Rongheng Ocean Fishery',
  registrationId: 'FT-200002',
  region: 'Western Pacific',
  demoAlertId: 'alert-wcpfc-cmm-2024-04',
};

const ZONE_BY_RFMO: Record<string, string> = {
  WCPFC: 'WCPO High Seas',
  ICCAT: 'NA-2',
  IOTC: 'IO-4',
};

const RFMO_FULL_NAME: Record<string, string> = {
  WCPFC: 'Western and Central Pacific Fisheries Commission',
  ICCAT: 'International Commission for the Conservation of Atlantic Tunas',
  IOTC: 'Indian Ocean Tuna Commission',
};

const RFMO_REGION: Record<string, string> = {
  WCPFC: 'Western Pacific',
  ICCAT: 'Atlantic Ocean',
  IOTC: 'Indian Ocean',
};

const SPECIES_KEYWORDS = [
  'Bigeye Tuna',
  'Yellowfin Tuna',
  'Skipjack Tuna',
  'Bluefin Tuna',
  'Swordfish',
  'Sea Turtles',
  'Atlantic Tunas',
];

type ScrapedAlert = {
  rfmo: string;
  alert_type: string;
  severity: 'high' | 'medium' | 'low' | string;
  document_type?: string;
  title: string;
  document_number?: string | null;
  published_date?: string | null;
  due_date?: string | null;
  what_changed?: string;
  action_required?: string;
  source_url?: string;
};

const SCRAPED_ALERTS = ((scrapedAlertsPayload as { alerts?: ScrapedAlert[] }).alerts || []).filter(
  (row): row is ScrapedAlert => Boolean(row?.rfmo && row?.title),
);

const normalizeText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const isoToday = () => new Date().toISOString().slice(0, 10);

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const toUiSeverity = (severity: string): AlertSeverity => {
  if (severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'info';
};

const toUiCategory = (alertType: string): AlertCategory => {
  if (alertType === 'REPORTING_DEADLINE') return 'reporting';
  if (alertType === 'QUOTA_OR_ALLOCATION_NOTICE') return 'quota';
  if (alertType === 'COMPLIANCE_SYSTEM_CHANGE') return 'penalties';
  return 'species_status';
};

const inferSpecies = (title: string): string => {
  const lower = normalizeText(title);
  const matched = SPECIES_KEYWORDS.find(species => lower.includes(normalizeText(species)));
  return matched || 'All Species';
};

const toUiStatus = (row: ScrapedAlert, severity: AlertSeverity): AlertStatus => {
  if (row.due_date) return 'action_required';
  if (severity === 'critical') return 'action_required';
  if (row.alert_type === 'COMPLIANCE_SYSTEM_CHANGE' || row.alert_type === 'QUOTA_OR_ALLOCATION_NOTICE') {
    return 'action_required';
  }
  return 'acknowledged';
};

const toUiAlert = (row: ScrapedAlert, idx: number): ComplianceAlert => {
  const publishedDate = row.published_date || isoToday();
  const severity = toUiSeverity(row.severity);
  const actionDeadline = row.due_date || addDays(publishedDate, severity === 'critical' ? 7 : 14);
  const category = toUiCategory(row.alert_type);
  const rfmo = row.rfmo.toUpperCase();
  const documentNumber = row.document_number ? ` (${row.document_number})` : '';
  const status = toUiStatus(row, severity);
  const summary = row.what_changed || `New RFMO update detected in ${rfmo}.`;
  const actionDetail = row.action_required || 'Review document and issue implementation guidance to impacted vessels.';

  return {
    id: `alert-${rfmo.toLowerCase()}-${idx + 1}`,
    severity,
    status,
    category,
    title: `${row.title}${documentNumber}`.trim(),
    summary,
    rfmo,
    species: inferSpecies(row.title),
    zone: ZONE_BY_RFMO[rfmo] || 'Unknown',
    effectiveDate: publishedDate,
    publishedDate,
    affectedVessels: [],
    actionDeadline,
    changeDetail: actionDetail,
    sourceUrl: row.source_url,
  };
};

export const LIVE_ALERTS: ComplianceAlert[] = SCRAPED_ALERTS.map(toUiAlert);

export const RAW_SOURCE_EXAMPLE = SCRAPED_ALERTS[0]
  ? `${SCRAPED_ALERTS[0].title}\n\nAction: ${SCRAPED_ALERTS[0].action_required || 'Review and implement the measure.'}\n\nSource URL:\n${SCRAPED_ALERTS[0].source_url || 'N/A'}`
  : 'No scraped source loaded.';

const KNOWN_DEMO_VESSELS: Vessel[] = [
  {
    id: 'demo-rongheng-13',
    name: 'RONGHENG13',
    flag: '🇨🇳',
    zone: 'WCPO High Seas',
    species: ['Bigeye Tuna', 'Skipjack Tuna'],
    status: 'action_needed',
    lastUpdate: 'live',
    imo: '8689230',
    mmsi: '412354269',
    ircs: 'BZU5Q',
    win: 'BZU5Q',
    sourceUrl: 'https://vessels.wcpfc.int/vessel/11891',
  },
  {
    id: 'demo-yanghe11',
    name: 'YANGHE11',
    flag: '🇨🇳',
    zone: 'WCPO High Seas',
    species: ['Bigeye Tuna'],
    status: 'action_needed',
    lastUpdate: 'live',
    imo: '8996229',
    ircs: 'BZSE8',
    win: 'BZSE8',
    sourceUrl: 'https://vessels.wcpfc.int/vessel/4405',
  },
];

export interface FleetProfile {
  companyName: string;
  registrationId: string;
  rfmos: string[];
  zones: string[];
  species: string[];
  vessels: Array<{
    name: string;
    zone: string;
    species: string;
    gear?: string;
    imo?: string;
    mmsi?: string;
    ircs?: string;
    win?: string;
    sourceUrl?: string;
  }>;
}

const FLEET_PROFILE_KEY = 'marewatch.fleetProfile.v1';

export const DEMO_FLEET_PROFILE: FleetProfile = {
  companyName: DEMO_COMPANY.name,
  registrationId: DEMO_COMPANY.registrationId,
  rfmos: ['WCPFC'],
  zones: ['WCPO High Seas'],
  species: ['Bigeye Tuna', 'Skipjack Tuna'],
  vessels: KNOWN_DEMO_VESSELS.map(v => ({
    name: v.name,
    zone: v.zone,
    species: v.species[0] || 'All Species',
    imo: v.imo,
    mmsi: v.mmsi,
    ircs: v.ircs,
    win: v.win,
    sourceUrl: v.sourceUrl,
  })),
};

export function loadFleetProfile(): FleetProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FLEET_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FleetProfile;
    if (!parsed || !parsed.companyName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFleetProfile(profile: FleetProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLEET_PROFILE_KEY, JSON.stringify(profile));
}

export function hasFleetProfile(): boolean {
  return !!loadFleetProfile();
}

export function seedDemoFleetProfile(): FleetProfile {
  saveFleetProfile(DEMO_FLEET_PROFILE);
  return DEMO_FLEET_PROFILE;
}

export function getFleetVessels(): Vessel[] {
  const profile = loadFleetProfile();
  if (!profile || !profile.vessels.length) return [];

  const activeAlerts = LIVE_ALERTS.filter(a => profile.rfmos.includes(a.rfmo));
  const needsActionByZone = new Set(
    activeAlerts.filter(a => a.status === 'action_required').map(a => a.zone),
  );

  const fromProfile = profile.vessels.map((v, idx) => {
    const template =
      KNOWN_DEMO_VESSELS.find(base => normalizeText(base.name) === normalizeText(v.name)) ||
      KNOWN_DEMO_VESSELS.find(base => base.zone === v.zone) ||
      KNOWN_DEMO_VESSELS[idx % KNOWN_DEMO_VESSELS.length];
    const zone = v.zone || template.zone;
    const status: Vessel['status'] = needsActionByZone.has(zone) ? 'action_needed' : 'compliant';

    return {
      ...template,
      id: `profile-vessel-${idx + 1}`,
      name: v.name,
      zone,
      species: v.species ? [v.species] : template.species,
      status,
      imo: v.imo || template.imo,
      mmsi: v.mmsi || template.mmsi,
      ircs: v.ircs || template.ircs,
      win: v.win || template.win,
      sourceUrl: v.sourceUrl || template.sourceUrl,
    };
  });
  return fromProfile;
}

export function getComplianceAlerts(): ComplianceAlert[] {
  const profile = loadFleetProfile();
  if (!profile) return [];
  const vessels = getFleetVessels();
  const vesselNames = new Set(vessels.map(v => v.name));
  const zones = new Set(profile.zones);
  const rfmos = new Set(profile.rfmos);
  const species = new Set(profile.species.map(s => s.toLowerCase()));

  const applicable = LIVE_ALERTS.filter(alert => {
    const byRfmo = rfmos.size === 0 || rfmos.has(alert.rfmo);
    const byZone = zones.size === 0 || zones.has(alert.zone);
    const byVessel = alert.affectedVessels.some(v => vesselNames.has(v));
    const bySpecies =
      !species.size ||
      species.has(alert.species.toLowerCase()) ||
      Array.from(species).some(s => alert.title.toLowerCase().includes(s));
    return byRfmo && (byZone || byVessel || bySpecies);
  });

  return applicable.map(alert => {
    const mappedVessels = vessels
      .filter(v => v.zone === alert.zone || normalizeText(v.name).includes(normalizeText(alert.rfmo)))
      .map(v => v.name);
    return {
      ...alert,
      affectedVessels: mappedVessels.length ? mappedVessels : vessels.slice(0, 1).map(v => v.name),
    };
  });
}

export function getRfmoSources(): RFMOSource[] {
  const profile = loadFleetProfile();
  if (!profile) return [];

  const tracked = new Set(profile.rfmos.map(r => r.toUpperCase()));
  const perRfmoCounts = SCRAPED_ALERTS.reduce<Record<string, number>>((acc, row) => {
    const rfmo = row.rfmo.toUpperCase();
    acc[rfmo] = (acc[rfmo] || 0) + 1;
    return acc;
  }, {});
  const latestByRfmo = SCRAPED_ALERTS.reduce<Record<string, string>>((acc, row) => {
    const rfmo = row.rfmo.toUpperCase();
    const published = row.published_date || '';
    if (!acc[rfmo] || published > acc[rfmo]) {
      acc[rfmo] = published;
    }
    return acc;
  }, {});

  return Array.from(tracked).map((rfmo) => ({
    id: `src-${rfmo.toLowerCase()}`,
    name: RFMO_FULL_NAME[rfmo] || rfmo,
    acronym: rfmo,
    lastChecked: 'just now',
    lastUpdate: latestByRfmo[rfmo] || isoToday(),
    status: 'online',
    documentsIngested: perRfmoCounts[rfmo] || 0,
    region: RFMO_REGION[rfmo] || 'Global',
  }));
}
