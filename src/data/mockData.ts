export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'action_required' | 'acknowledged' | 'resolved';
export type AlertCategory = 'quota' | 'closure' | 'species_status' | 'reporting' | 'penalties';

export const CATEGORY_META: Record<AlertCategory, { label: string; icon: string; description: string }> = {
  quota: { label: 'Quota', icon: '📊', description: 'Species, zone, amount, change vs. previous' },
  closure: { label: 'Closure', icon: '🚫', description: 'Area, dates, what\'s prohibited' },
  species_status: { label: 'Species Status', icon: '🐟', description: 'New protections, gear restrictions' },
  reporting: { label: 'Reporting', icon: '📋', description: 'New forms, deadlines, frequencies' },
  penalties: { label: 'Penalties', icon: '⚠️', description: 'What non-compliance now costs' },
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

export const MOCK_ALERTS: ComplianceAlert[] = [
  {
    id: 'alert-001',
    severity: 'critical',
    status: 'action_required',
    category: 'quota',
    title: 'Bigeye Tuna Quota Reduction — IATTC',
    summary: 'IATTC reduced bigeye tuna quota by 8% in Zone EPO-3. Your 2 vessels fishing there need updated catch limits immediately.',
    rfmo: 'IATTC',
    species: 'Bigeye Tuna',
    zone: 'EPO-3',
    effectiveDate: '2026-03-15',
    publishedDate: '2026-02-27',
    affectedVessels: ['MV Pacific Harvester', 'FV Blue Meridian'],
    actionDeadline: '2026-03-10',
    changeDetail: 'Annual quota reduced from 62,000t to 57,040t (-8%). Vessel-level allocations must be recalculated.',
    previousValue: '62,000t',
    newValue: '57,040t',
  },
  {
    id: 'alert-002',
    severity: 'critical',
    status: 'action_required',
    category: 'quota',
    title: 'Yellowfin Tuna Quota Cut — IOTC',
    summary: 'IOTC reduced yellowfin tuna quota by 12% in Zone 4 effective March 1. Your 3 vessels fishing there need updated catch limits.',
    rfmo: 'IOTC',
    species: 'Yellowfin Tuna',
    zone: 'IO-4',
    effectiveDate: '2026-03-01',
    publishedDate: '2026-02-25',
    affectedVessels: ['FV Ocean Spirit', 'MV Coral Runner', 'FV Deep Blue'],
    actionDeadline: '2026-02-28',
    changeDetail: 'Quarterly allocation cut from 18,500t to 16,280t. Non-compliance penalty: €45,000 per vessel.',
    previousValue: '18,500t',
    newValue: '16,280t',
    penaltyAmount: '€45,000 per vessel',
  },
  {
    id: 'alert-003',
    severity: 'warning',
    status: 'action_required',
    category: 'closure',
    title: 'Temporary Closure — CCAMLR Area 48.1',
    summary: 'CCAMLR announced temporary closure of krill fishery in Area 48.1 for environmental survey. Reopening TBD.',
    rfmo: 'CCAMLR',
    species: 'Antarctic Krill',
    zone: 'Area 48.1',
    effectiveDate: '2026-03-20',
    publishedDate: '2026-02-26',
    affectedVessels: ['FV Southern Explorer'],
    actionDeadline: '2026-03-15',
    changeDetail: 'Zone closed for 45-day acoustic survey. Vessels must exit by March 20. Alternate zones permitted.',
  },
  {
    id: 'alert-004',
    severity: 'info',
    status: 'acknowledged',
    category: 'reporting',
    title: 'Updated VMS Requirements — WCPFC',
    summary: 'WCPFC updated vessel monitoring system reporting frequency from 4-hour to 2-hour intervals in high seas pockets.',
    rfmo: 'WCPFC',
    species: 'All Species',
    zone: 'WCPO High Seas',
    effectiveDate: '2026-04-01',
    publishedDate: '2026-02-24',
    affectedVessels: ['MV Pacific Harvester'],
    actionDeadline: '2026-03-25',
    changeDetail: 'VMS polling interval reduced. Firmware update may be required for older transponders.',
  },
  {
    id: 'alert-005',
    severity: 'warning',
    status: 'action_required',
    category: 'quota',
    title: 'Swordfish Bycatch Limit Approaching — ICCAT',
    summary: 'ICCAT seasonal bycatch limit for swordfish in North Atlantic at 87% utilization. Approaching closure threshold.',
    rfmo: 'ICCAT',
    species: 'Swordfish',
    zone: 'NA-2',
    effectiveDate: '2026-02-28',
    publishedDate: '2026-02-27',
    affectedVessels: ['FV Atlantic Prize', 'MV Northern Star'],
    actionDeadline: '2026-03-05',
    changeDetail: 'Seasonal bycatch allocation: 2,340t used of 2,700t limit (87%). Auto-closure at 100%.',
    previousValue: '2,700t limit',
    newValue: '2,340t used (87%)',
  },
];

export const MOCK_VESSELS: Vessel[] = [
  { id: 'v1', name: 'MV Pacific Harvester', flag: '🇵🇦', zone: 'EPO-3', species: ['Bigeye Tuna', 'Skipjack'], status: 'action_needed', lastUpdate: '2h ago' },
  { id: 'v2', name: 'FV Blue Meridian', flag: '🇪🇸', zone: 'EPO-3', species: ['Bigeye Tuna'], status: 'action_needed', lastUpdate: '4h ago' },
  { id: 'v3', name: 'FV Ocean Spirit', flag: '🇯🇵', zone: 'IO-4', species: ['Yellowfin Tuna', 'Albacore'], status: 'at_risk', lastUpdate: '1h ago' },
  { id: 'v4', name: 'MV Coral Runner', flag: '🇰🇷', zone: 'IO-4', species: ['Yellowfin Tuna'], status: 'at_risk', lastUpdate: '30m ago' },
  { id: 'v5', name: 'FV Deep Blue', flag: '🇹🇼', zone: 'IO-4', species: ['Yellowfin Tuna', 'Bigeye Tuna'], status: 'at_risk', lastUpdate: '2h ago' },
  { id: 'v6', name: 'FV Southern Explorer', flag: '🇳🇴', zone: 'Area 48.1', species: ['Antarctic Krill'], status: 'action_needed', lastUpdate: '6h ago' },
  { id: 'v7', name: 'FV Atlantic Prize', flag: '🇵🇹', zone: 'NA-2', species: ['Swordfish', 'Blue Marlin'], status: 'action_needed', lastUpdate: '3h ago' },
  { id: 'v8', name: 'MV Northern Star', flag: '🇬🇧', zone: 'NA-2', species: ['Swordfish'], status: 'compliant', lastUpdate: '1h ago' },
];

export const MOCK_RFMO_SOURCES: RFMOSource[] = [
  { id: 'r1', name: 'Inter-American Tropical Tuna Commission', acronym: 'IATTC', lastChecked: '2m ago', lastUpdate: '2026-02-27', status: 'online', documentsIngested: 342, region: 'Eastern Pacific' },
  { id: 'r2', name: 'Indian Ocean Tuna Commission', acronym: 'IOTC', lastChecked: '5m ago', lastUpdate: '2026-02-25', status: 'online', documentsIngested: 289, region: 'Indian Ocean' },
  { id: 'r3', name: 'Commission for the Conservation of Antarctic Marine Living Resources', acronym: 'CCAMLR', lastChecked: '1m ago', lastUpdate: '2026-02-26', status: 'online', documentsIngested: 198, region: 'Southern Ocean' },
  { id: 'r4', name: 'Western and Central Pacific Fisheries Commission', acronym: 'WCPFC', lastChecked: '8m ago', lastUpdate: '2026-02-24', status: 'online', documentsIngested: 456, region: 'Western Pacific' },
  { id: 'r5', name: 'International Commission for the Conservation of Atlantic Tunas', acronym: 'ICCAT', lastChecked: '3m ago', lastUpdate: '2026-02-27', status: 'checking', documentsIngested: 521, region: 'Atlantic Ocean' },
  { id: 'r6', name: 'South Pacific Regional Fisheries Management Organisation', acronym: 'SPRFMO', lastChecked: '12m ago', lastUpdate: '2026-02-20', status: 'online', documentsIngested: 134, region: 'South Pacific' },
  { id: 'r7', name: 'Northwest Atlantic Fisheries Organization', acronym: 'NAFO', lastChecked: '15m ago', lastUpdate: '2026-02-22', status: 'online', documentsIngested: 267, region: 'NW Atlantic' },
  { id: 'r8', name: 'North Pacific Fisheries Commission', acronym: 'NPFC', lastChecked: '7m ago', lastUpdate: '2026-02-23', status: 'online', documentsIngested: 178, region: 'North Pacific' },
];

export const RAW_SOURCE_EXAMPLE = `RESOLUCIÓN C-26-01

LA COMISIÓN INTERAMERICANA DEL ATÚN TROPICAL (CIAT),

Considerando que el stock de atún patudo (Thunnus obesus) en el Océano Pacífico Oriental muestra señales de sobrepesca según las evaluaciones más recientes del personal científico;

Considerando las recomendaciones del Comité Científico Asesor presentadas en su reunión de octubre de 2025;

RESUELVE:

1. Reducir la captura total permitida de atún patudo en la zona EPO-3 en un 8% para el período 2026-2027, estableciendo un nuevo límite de 57,040 toneladas métricas anuales.

2. Las Partes Contratantes deberán ajustar sus asignaciones nacionales proporcionalmente antes del 10 de marzo de 2026.

3. El incumplimiento de esta resolución podrá resultar en sanciones según el Artículo XIV del Convenio...

[Continúa por 47 páginas con anexos técnicos, tablas de asignación por país, y especificaciones de monitoreo]`;
