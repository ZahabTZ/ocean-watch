import { OnboardingData } from './onboarding';
import { ComplianceAlert, Vessel, AlertCategory } from '@/data/mockData';

const REGION_RFMOS: Record<string, string[]> = {
  pacific: ['IATTC', 'WCPFC', 'SPRFMO', 'NPFC'],
  atlantic: ['ICCAT', 'NAFO'],
  indian: ['IOTC'],
  southern: ['CCAMLR'],
  multi: ['IATTC', 'WCPFC', 'IOTC', 'ICCAT', 'CCAMLR', 'SPRFMO', 'NAFO', 'NPFC'],
};

const CATEGORY_MAP: Record<string, AlertCategory> = {
  quota: 'quota',
  closure: 'closure',
  reporting: 'reporting',
  species: 'species_status',
  penalties: 'penalties',
};

const RFMO_ZONES: Record<string, string[]> = {
  IATTC: ['EPO-3'],
  WCPFC: ['WCPO High Seas'],
  IOTC: ['IO-4'],
  CCAMLR: ['Area 48.1'],
  ICCAT: ['NA-2'],
  NAFO: ['NA-2'],
  SPRFMO: [],
  NPFC: [],
};

export interface UserProfile {
  rfmos: string[];
  vesselNames: string[];
  zones: string[];
  species: string[];
  alertCategories: AlertCategory[];
  orgName: string;
  role: string;
  region: string;
}

export function buildUserProfile(data: OnboardingData): UserProfile {
  const rfmos = REGION_RFMOS[data.region] || [];
  const zones = rfmos.flatMap(r => RFMO_ZONES[r] || []);
  const vesselNames = data.vessels.map(v => v.name).filter(Boolean);
  const species = [...new Set(data.vessels.map(v => v.species).filter(Boolean))];
  const alertCategories = (data.alertCategories || [])
    .map(c => CATEGORY_MAP[c])
    .filter((c): c is AlertCategory => !!c);

  return {
    rfmos,
    vesselNames,
    zones,
    species,
    alertCategories,
    orgName: data.orgName || '',
    role: data.role || '',
    region: data.region || '',
  };
}

export function filterAlerts(alerts: ComplianceAlert[], profile: UserProfile): ComplianceAlert[] {
  if (!profile.rfmos.length && !profile.vesselNames.length) return alerts;

  return alerts.filter(alert => {
    const rfmoMatch = profile.rfmos.length === 0 || profile.rfmos.includes(alert.rfmo);
    const categoryMatch = profile.alertCategories.length === 0 || profile.alertCategories.includes(alert.category);
    const vesselOverlap = profile.vesselNames.length > 0 &&
      alert.affectedVessels.some(v => profile.vesselNames.includes(v));

    if (vesselOverlap) return true;
    return rfmoMatch && categoryMatch;
  });
}

export function filterVessels(vessels: Vessel[], profile: UserProfile): Vessel[] {
  if (!profile.rfmos.length && !profile.vesselNames.length) return vessels;

  return vessels.filter(vessel => {
    if (profile.vesselNames.length > 0 && profile.vesselNames.includes(vessel.name)) return true;
    if (profile.zones.length > 0 && profile.zones.includes(vessel.zone)) return true;
    return false;
  });
}
