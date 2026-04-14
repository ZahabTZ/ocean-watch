import { LatLngExpression } from 'leaflet';
import { getComplianceAlerts, getFleetVessels } from './liveData';

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
  'SA-1': [
    [-15, -20], [-15, 15], [-35, 15], [-35, -20],
  ],
};

// Demo positions: approximate center of each zone for placing vessels
const ZONE_DEMO_CENTERS: Record<string, [number, number]> = {
  'EPO-3': [-20, -120],
  'IO-4': [-15, 67],
  'Area 48.1': [-62, -52],
  'WCPO High Seas': [-5, 157],
  'NA-2': [32, -42],
  'SA-1': [-25, -2],
};

export function buildMapZones(): MapZone[] {
  const alerts = getComplianceAlerts();
  const vessels = getFleetVessels();
  const allZoneNames = new Set([
    ...alerts.map(a => a.zone),
    ...vessels.map(v => v.zone),
    // Always show all known zones
    ...Object.keys(ZONE_POLYGONS),
  ]);

  return Array.from(allZoneNames).map(zoneName => {
    const coords = ZONE_POLYGONS[zoneName];
    if (!coords) return null;

    const zoneAlerts = alerts.filter(a => a.zone === zoneName);
    const zoneVessels = vessels.filter(v => v.zone === zoneName);

    let status: MapZone['status'] = 'green';
    if (zoneName === 'EPO-3') status = 'red';
    else if (zoneAlerts.some(a => a.severity === 'critical')) status = 'red';
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
  position?: LatLngExpression;
  status: 'compliant' | 'action_needed' | 'at_risk';
  zone: string;
  species: string[];
  imo?: string;
  mmsi?: string;
  positionSource?: 'gfw' | 'demo';
  positionTimestamp?: string;
  gfwVesselId?: string;
}

export function buildMapVessels(): MapVessel[] {
  // Count vessels per zone so we can spread them evenly within the zone box
  const zoneIndexMap = new Map<string, number>();

  return getFleetVessels().map(v => {
    const center = ZONE_DEMO_CENTERS[v.zone];
    const zoneIdx = zoneIndexMap.get(v.zone) ?? 0;
    zoneIndexMap.set(v.zone, zoneIdx + 1);

    // Spread in a grid-ish pattern within ±4° lat / ±5° lng of zone center
    const row = Math.floor(zoneIdx / 3);
    const col = zoneIdx % 3;
    const position: LatLngExpression | undefined = center
      ? [center[0] + (row - 1) * 3, center[1] + (col - 1) * 4]
      : undefined;

    return {
      id: v.id,
      name: v.name,
      flag: v.flag,
      status: v.status,
      zone: v.zone,
      species: v.species,
      imo: v.imo,
      mmsi: v.mmsi,
      position,
      positionSource: position ? 'demo' : undefined,
    };
  });
}
