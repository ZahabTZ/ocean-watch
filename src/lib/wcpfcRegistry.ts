const WCPFC_ORIGIN = 'https://vessels.wcpfc.int';
const WCPFC_BASE_URL = import.meta.env.DEV ? '/api/wcpfc' : WCPFC_ORIGIN;

type AutocompleteResponseItem = {
  value: string;
  label: string;
};

export type GovernmentVesselRecord = {
  vid: string;
  name: string;
  flag?: string;
  vesselType?: string;
  registrationNumber?: string;
  ircs?: string;
  win?: string;
  imo?: string;
  ownerName?: string;
  sourceUrl: string;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripTags = (value: string) =>
  value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const extractAutocompleteField = (label: string, key: string) => {
  const htmlRegex = new RegExp(`<b>\\s*${escapeRegExp(key)}:\\s*<\\/b>\\s*([^<]+)`, 'i');
  const htmlMatch = label.match(htmlRegex);
  const cleaned = stripTags(htmlMatch?.[1] || '');
  const fallbackRegex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
  const fallbackMatch = stripTags(label).match(fallbackRegex);
  const value = (cleaned || fallbackMatch?.[1] || '').trim();
  if (!value || /not available/i.test(value)) {
    return undefined;
  }
  return value;
};

const parseAutocompleteItem = (item: AutocompleteResponseItem) => {
  if (!item?.value || /no vessel found/i.test(item.label)) {
    return null;
  }

  const vidMatch = item.value.match(/\((\d+)\)\s*$/);
  if (!vidMatch) {
    return null;
  }

  const name = item.value.replace(/\s*\(VID:.*$/i, '').trim();
  const vid = vidMatch[1];

  return {
    vid,
    name,
    registrationNumber: extractAutocompleteField(item.label, 'Registration'),
    ircs: extractAutocompleteField(item.label, 'IRCS'),
    win: extractAutocompleteField(item.label, 'WIN'),
    imo: extractAutocompleteField(item.label, 'IMO'),
  };
};

const readTextBySelectors = (doc: Document, selectors: string[]) => {
  for (const selector of selectors) {
    const value = doc.querySelector(selector)?.textContent?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
};

export const parseWcpfcVesselHtml = (html: string, fallbackVid: string): GovernmentVesselRecord => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const pageTitle = doc.querySelector('.page-title')?.textContent?.trim() || '';
  const name = pageTitle.replace(/\s*\(VID:\s*\d+\)\s*$/i, '').trim();

  return {
    vid: fallbackVid,
    name,
    flag: readTextBySelectors(doc, ['.vessel-version__vsl-flag-cty-id .field__item']),
    vesselType: readTextBySelectors(doc, ['.vessel-version__vsl-vty-id .field__item']),
    registrationNumber: readTextBySelectors(doc, ['.vessel-version__vsl-registration-number .field__item']),
    ircs: readTextBySelectors(doc, ['.vessel-version__vsl-ircs .field__item']),
    win: readTextBySelectors(doc, ['.vessel-version__vsl-win .field__item']),
    imo: readTextBySelectors(doc, ['.vessel-origin__vslo-imo-number .field__item']),
    ownerName: readTextBySelectors(doc, ['.vessel-version__vsl-owner-name .field__item']),
    sourceUrl: `${WCPFC_ORIGIN}/vessel/${fallbackVid}`,
  };
};

const fetchVesselDetails = async (vid: string) => {
  const response = await fetch(`${WCPFC_BASE_URL}/vessel/${encodeURIComponent(vid)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch vessel ${vid}: ${response.status}`);
  }
  return parseWcpfcVesselHtml(await response.text(), vid);
};

const mapWithConcurrency = async <T, R>(
  list: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < list.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(list[current]);
    }
  });

  await Promise.all(workers);
  return results;
};

const looksLikeRegistrationLookup = (query: string) => /\d/.test(query) || /[-()\/]/.test(query);

const fetchAutocompleteCandidates = async (query: string) => {
  const response = await fetch(`${WCPFC_BASE_URL}/vessel/results?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Government lookup failed: ${response.status}`);
  }
  const payload: AutocompleteResponseItem[] = await response.json();
  return payload
    .map(parseAutocompleteItem)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

const fallbackTokenQueries = (query: string) => {
  const ignoredTokens = new Set(['co', 'company', 'ltd', 'limited', 'inc', 'corp', 'corporation', 'llc']);
  const tokenScores = query
    .split(/[^a-zA-Z0-9]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 4)
    .map(token => token.toLowerCase())
    .filter(token => !ignoredTokens.has(token));

  return Array.from(new Set(tokenScores)).sort((a, b) => b.length - a.length);
};

export const fetchWcpfcVesselsByCompanyOrRegistration = async (
  rawQuery: string,
  options?: { maxCandidates?: number },
): Promise<GovernmentVesselRecord[]> => {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  let candidates = await fetchAutocompleteCandidates(query);
  if (!candidates.length && !looksLikeRegistrationLookup(query)) {
    const fallbackTokens = fallbackTokenQueries(query);
    for (const token of fallbackTokens) {
      candidates = await fetchAutocompleteCandidates(token);
      if (candidates.length) {
        break;
      }
    }
  }

  if (!candidates.length) {
    return [];
  }

  const maxCandidates = Math.max(1, options?.maxCandidates ?? 20);
  const selectedCandidates = candidates.slice(0, maxCandidates);

  const detailRows = await mapWithConcurrency(selectedCandidates, 4, async candidate => {
    try {
      const detail = await fetchVesselDetails(candidate.vid);
      return {
        ...detail,
        name: detail.name || candidate.name,
        registrationNumber: detail.registrationNumber || candidate.registrationNumber,
        ircs: detail.ircs || candidate.ircs,
        win: detail.win || candidate.win,
        imo: detail.imo || candidate.imo,
      };
    } catch {
      return {
        vid: candidate.vid,
        name: candidate.name,
        registrationNumber: candidate.registrationNumber,
        ircs: candidate.ircs,
        win: candidate.win,
        imo: candidate.imo,
        sourceUrl: `${WCPFC_BASE_URL}/vessel/${candidate.vid}`,
      };
    }
  });

  const normalizedQuery = normalize(query);
  const byRegistration = looksLikeRegistrationLookup(query);

  const filteredRows = byRegistration
    ? detailRows.filter(row =>
        [row.registrationNumber, row.imo, row.win, row.ircs, row.vid].some(value => normalize(value || '').includes(normalizedQuery)),
      )
    : detailRows.filter(row => normalize(row.ownerName || '').includes(normalizedQuery));

  return (filteredRows.length ? filteredRows : detailRows).sort((a, b) => a.name.localeCompare(b.name));
};

export const WCPFC_REGISTRY_SOURCE = WCPFC_ORIGIN;
