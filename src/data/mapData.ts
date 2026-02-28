import { LatLngExpression } from 'leaflet';
import { MOCK_ALERTS, MOCK_VESSELS } from './mockData';

export interface MapZone {
  id: string;
  name: string;
  coordinates: LatLngExpression[];
  status: 'red' | 'yellow' | 'green';
  alertIds: string[];
  vesselIds: string[];
}

// Approximate ocean zone polygons
const ZONE_POLYGONS: Record<string, LatLngExpression[]> = {
  'EPO-3': [
    [-5, -140], [-5, -100], [-25, -100], [-25, -80], [-35, -80], [-35, -140],
  ],
  'IO-4': [
    [-5, 55], [-5, 80], [-25, 80], [-25, 55],
  ],
  'Area 48.1': [
    [-60, -65], [-60, -40], [-65, -40], [-65, -65],
  ],
  'WCPO High Seas': [
    [5, 140], [5, 175], [-15, 175], [-15, 140],
  ],
  'NA-2': [
    [25, -55], [25, -30], [40, -30], [40, -55],
  ],
};

export function buildMapZones(): MapZone[] {
  const allZoneNames = new Set([
    ...MOCK_ALERTS.map(a => a.zone),
    ...MOCK_VESSELS.map(v => v.zone),
  ]);

  return Array.from(allZoneNames).map(zoneName => {
    const coords = ZONE_POLYGONS[zoneName];
    if (!coords) return null;

    const zoneAlerts = MOCK_ALERTS.filter(a => a.zone === zoneName);
    const zoneVessels = MOCK_VESSELS.filter(v => v.zone === zoneName);

    let status: MapZone['status'] = 'green';
    if (zoneAlerts.some(a => a.severity === 'critical')) status = 'red';
    else if (zoneAlerts.some(a => a.severity === 'warning')) status = 'yellow';

    return {
      id: zoneName,
      name: zoneName,
      coordinates: coords,
      status,
      alertIds: zoneAlerts.map(a => a.id),
      vesselIds: zoneVessels.map(v => v.id),
    };
  }).filter(Boolean) as MapZone[];
}

export interface MapVessel {
  id: string;
  name: string;
  flag: string;
  position: LatLngExpression;
  status: 'compliant' | 'action_needed' | 'at_risk';
  zone: string;
  species: string[];
}

// Scatter vessels within their zone polygons
const VESSEL_POSITIONS: Record<string, [number, number]> = {
  'v1': [-12, -118],
  'v2': [-18, -108],
  'v3': [-10, 62],
  'v4': [-15, 70],
  'v5': [-18, 75],
  'v6': [-62, -52],
  'v7': [32, -42],
  'v8': [35, -38],
};

export function buildMapVessels(): MapVessel[] {
  return MOCK_VESSELS.map(v => ({
    id: v.id,
    name: v.name,
    flag: v.flag,
    position: VESSEL_POSITIONS[v.id] || [0, 0],
    status: v.status,
    zone: v.zone,
    species: v.species,
  }));
}
