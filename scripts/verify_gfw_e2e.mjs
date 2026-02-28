#!/usr/bin/env node

const token = process.env.VITE_GFW_API_TOKEN;
if (!token || !token.trim()) {
  console.error('Missing VITE_GFW_API_TOKEN in environment.');
  console.error('Example: VITE_GFW_API_TOKEN=... node scripts/verify_gfw_e2e.mjs');
  process.exit(2);
}

const API = 'https://gateway.api.globalfishingwatch.org/v3';
const VESSEL_DATASET = 'public-global-vessel-identity:latest';
const EVENTS_DATASET = 'public-global-fishing-events:latest';
const EXPECTED_ID = '73e866c9f-f06f-5274-c045-96901220ee82';

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function getJson(url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

function pickEntries(payload) {
  if (!payload || typeof payload !== 'object') return [];
  for (const k of ['entries', 'data', 'results', 'vessels']) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  return [];
}

function vesselId(row) {
  for (const k of ['id', 'vesselId', 'vessel_id', 'gfw_id']) {
    const v = row?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  const nested = []
    .concat(Array.isArray(row?.selfReportedInfo) ? row.selfReportedInfo : [])
    .concat(Array.isArray(row?.combinedSourcesInfo) ? row.combinedSourcesInfo : []);
  for (const item of nested) {
    if (!item || typeof item !== 'object') continue;
    for (const k of ['id', 'vesselId', 'vessel_id']) {
      const v = item[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return undefined;
}

async function search(query) {
  const url = `${API}/vessels/search?query=${encodeURIComponent(query)}&datasets[0]=${encodeURIComponent(VESSEL_DATASET)}&limit=20`;
  const out = await getJson(url);
  if (!out.ok) throw new Error(`search failed for ${query}: ${out.status}`);
  return pickEntries(out.payload);
}

async function latestEvent(vesselIdValue) {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const params = new URLSearchParams();
  params.set('datasets[0]', EVENTS_DATASET);
  params.set('vessels[0]', vesselIdValue);
  params.set('start-date', start.toISOString());
  params.set('end-date', end.toISOString());
  params.set('limit', '1');
  params.set('offset', '0');
  params.set('sort', '-start');
  const out = await getJson(`${API}/events?${params.toString()}`);
  if (!out.ok) throw new Error(`events failed: ${out.status}`);
  const entries = pickEntries(out.payload);
  return entries[0];
}

(async () => {
  const queries = ['8689230', '412354269', 'RONGHENG13'];
  const foundIds = new Set();
  for (const q of queries) {
    const entries = await search(q);
    for (const row of entries) {
      const id = vesselId(row);
      if (id) foundIds.add(id);
    }
    console.log(`query=${q} matches=${entries.length}`);
  }

  const chosen = foundIds.has(EXPECTED_ID) ? EXPECTED_ID : [...foundIds][0];
  if (!chosen) {
    console.error('No GFW vessel match found');
    process.exit(1);
  }

  const event = await latestEvent(chosen);
  if (!event) {
    console.error('No latest event found');
    process.exit(1);
  }

  const coords = event?.geometry?.coordinates;
  const lon = Array.isArray(coords) ? coords[0] : (event?.position?.lon ?? event.lon ?? event.longitude ?? null);
  const lat = Array.isArray(coords) ? coords[1] : (event?.position?.lat ?? event.lat ?? event.latitude ?? null);
  const ts = event.start ?? event.timestamp ?? event.end ?? event.date ?? null;

  console.log('vessel_id', chosen);
  console.log('expected_id_match', chosen === EXPECTED_ID);
  console.log('latest_lat', lat);
  console.log('latest_lon', lon);
  console.log('latest_time', ts);

  if (chosen !== EXPECTED_ID) {
    console.warn('Warning: expected vessel id not found in top matches, using alternative id');
  }
})();
