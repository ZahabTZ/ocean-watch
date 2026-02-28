import type { MapVessel } from '@/data/mapData';

const GFW_API_BASE = 'https://gateway.api.globalfishingwatch.org/v3';
const GFW_VESSEL_DATASET = 'public-global-vessel-identity:latest';
const GFW_EVENTS_DATASET = 'public-global-fishing-events:latest';

export type GfwPosition = {
  lat: number;
  lon: number;
  timestamp?: string;
  vesselId: string;
};

const getToken = () => import.meta.env.VITE_GFW_API_TOKEN as string | undefined;

const hasUsableToken = () => Boolean(getToken() && getToken()?.trim().length);

const buildHeaders = () => {
  const token = getToken();
  if (!token) {
    throw new Error('Missing VITE_GFW_API_TOKEN');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const parseSearchEntries = (payload: unknown): Record<string, unknown>[] => {
  if (!payload || typeof payload !== 'object') return [];
  const objectPayload = payload as Record<string, unknown>;

  const candidates = [
    objectPayload.entries,
    objectPayload.data,
    objectPayload.results,
    objectPayload.vessels,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
  }

  return [];
};

const normalizeText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const stringsFromUnknown = (value: unknown): string[] => {
  if (typeof value === 'string' && value.trim().length) return [value];
  if (!Array.isArray(value)) return [];
  return value
    .flatMap(item => (item && typeof item === 'object' ? Object.values(item as Record<string, unknown>) : []))
    .filter((item): item is string => typeof item === 'string' && item.trim().length);
};

const extractVesselIds = (row: Record<string, unknown>): string[] => {
  const direct = [row.id, row.vesselId, row.vessel_id, row.gfw_id]
    .filter((field): field is string => typeof field === 'string' && field.trim().length);
  const fromSelf = stringsFromUnknown(row.selfReportedInfo).filter(id => /^[a-z0-9-]{20,}$/i.test(id));
  const fromCombined = stringsFromUnknown(row.combinedSourcesInfo).filter(id => /^[a-z0-9-]{20,}$/i.test(id));
  return Array.from(new Set([...direct, ...fromSelf, ...fromCombined]));
};

const extractPrimaryVesselId = (row: Record<string, unknown>) => {
  const ids = extractVesselIds(row);
  return ids[0];
};

const extractField = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length) return value;
    if (typeof value === 'number') return String(value);
  }
  const nestedPools = [row.selfReportedInfo, row.combinedSourcesInfo, row.registryInfo];
  for (const pool of nestedPools) {
    if (!Array.isArray(pool)) continue;
    for (const item of pool) {
      if (!item || typeof item !== 'object') continue;
      for (const key of keys) {
        const value = (item as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.trim().length) return value;
        if (typeof value === 'number') return String(value);
      }
    }
  }
  return undefined;
};

const chooseBestVesselMatch = (entries: Record<string, unknown>[], vessel: MapVessel) => {
  if (!entries.length) return undefined;

  const normalizedName = normalizeText(vessel.name);
  const targetMmsi = vessel.mmsi?.trim();
  const targetImo = vessel.imo?.trim();

  const scored = entries
    .map(row => {
      const id = extractPrimaryVesselId(row);
      if (!id) return null;

      const rowName = extractField(row, ['name', 'shipName', 'ship_name', 'vesselName', 'shipname', 'nShipname']);
      const rowMmsi = extractField(row, ['mmsi', 'ssvid']);
      const rowImo = extractField(row, ['imo']);

      let score = 0;
      if (targetMmsi && rowMmsi && targetMmsi === rowMmsi) score += 100;
      if (targetImo && rowImo && targetImo === rowImo) score += 100;
      if (rowName && normalizeText(rowName) === normalizedName) score += 50;
      if (rowName && normalizeText(rowName).includes(normalizedName)) score += 20;
      if (score === 0 && entries.length === 1) score = 1;

      return { id, score };
    })
    .filter((item): item is { id: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.id;
};

const searchVesselId = async (vessel: MapVessel): Promise<string | undefined> => {
  const queries = Array.from(new Set([vessel.imo, vessel.mmsi, vessel.name].filter(Boolean))).map(value => String(value));

  for (const query of queries) {
    const response = await fetch(
      `${GFW_API_BASE}/vessels/search?query=${encodeURIComponent(query)}&datasets[0]=${encodeURIComponent(GFW_VESSEL_DATASET)}&limit=20`,
      { headers: buildHeaders() },
    );

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    const entries = parseSearchEntries(payload);
    const matchedId = chooseBestVesselMatch(entries, vessel);
    if (matchedId) return matchedId;
  }

  return undefined;
};

const parseEvents = (payload: unknown): Record<string, unknown>[] => {
  if (!payload || typeof payload !== 'object') return [];
  const objectPayload = payload as Record<string, unknown>;

  const candidates = [
    objectPayload.entries,
    objectPayload.data,
    objectPayload.events,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
  }

  return [];
};

const parseCoordinates = (event: Record<string, unknown>): { lat: number; lon: number } | undefined => {
  const geometry = event.geometry as Record<string, unknown> | undefined;
  const geometryCoords = geometry?.coordinates;

  if (Array.isArray(geometryCoords) && geometryCoords.length >= 2) {
    const lon = Number(geometryCoords[0]);
    const lat = Number(geometryCoords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat: clamp(lat, -90, 90),
        lon: clamp(lon, -180, 180),
      };
    }
  }

  const position = event.position as Record<string, unknown> | undefined;
  if (position) {
    const lat = Number(position.lat);
    const lon = Number(position.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat: clamp(lat, -90, 90),
        lon: clamp(lon, -180, 180),
      };
    }
  }

  const latField = event.lat ?? event.latitude;
  const lonField = event.lon ?? event.lng ?? event.longitude;
  if (latField !== undefined && lonField !== undefined) {
    const lat = Number(latField);
    const lon = Number(lonField);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        lat: clamp(lat, -90, 90),
        lon: clamp(lon, -180, 180),
      };
    }
  }

  return undefined;
};

const parseEventTimestamp = (event: Record<string, unknown>) => {
  const fields = [event.start, event.timestamp, event.end, event.date];
  const value = fields.find(field => typeof field === 'string');
  return typeof value === 'string' ? value : undefined;
};

const fetchLatestPositionByVesselId = async (vesselId: string): Promise<GfwPosition | undefined> => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 1000 * 60 * 60 * 24 * 365);

  const params = new URLSearchParams();
  params.set('datasets[0]', GFW_EVENTS_DATASET);
  params.set('vessels[0]', vesselId);
  params.set('start-date', startDate.toISOString());
  params.set('end-date', endDate.toISOString());
  params.set('limit', '1');
  params.set('offset', '0');
  params.set('sort', '-start');

  const response = await fetch(`${GFW_API_BASE}/events?${params.toString()}`, { headers: buildHeaders() });
  if (!response.ok) {
    return undefined;
  }

  const payload = await response.json();
  const events = parseEvents(payload);
  if (!events.length) return undefined;

  const coordinates = parseCoordinates(events[0]);
  if (!coordinates) return undefined;

  return {
    ...coordinates,
    timestamp: parseEventTimestamp(events[0]),
    vesselId,
  };
};

const mapWithConcurrency = async <T, R>(
  list: T[],
  mapper: (item: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < list.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(list[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
};

export const enrichMapVesselsWithGfw = async (vessels: MapVessel[]): Promise<MapVessel[]> => {
  if (!hasUsableToken()) {
    return vessels;
  }

  const enriched = await mapWithConcurrency(vessels, async vessel => {
    try {
      const vesselId = await searchVesselId(vessel);
      if (!vesselId) return vessel;

      const latestPosition = await fetchLatestPositionByVesselId(vesselId);
      if (!latestPosition) {
        return {
          ...vessel,
          gfwVesselId: vesselId,
        };
      }

      return {
        ...vessel,
        position: [latestPosition.lat, latestPosition.lon] as [number, number],
        positionSource: 'gfw' as const,
        positionTimestamp: latestPosition.timestamp,
        gfwVesselId: vesselId,
      };
    } catch {
      return vessel;
    }
  }, 3);

  return enriched;
};

export const isGfwConfigured = () => hasUsableToken();
