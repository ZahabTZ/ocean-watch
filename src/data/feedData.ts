export type FeedSourceType = 'pdf' | 'rss' | 'email' | 'tweet' | 'api' | 'upload';
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

export const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-001',
    sourceType: 'pdf',
    sourceName: 'CM-2024-01',
    sourceUrl: 'https://iotc.org/measures/2024',
    sourceOrg: 'IOTC',
    region: 'Indian Ocean',
    category: 'quota',
    status: 'flagged',
    title: 'Conservation Measure 24-01 Bigeye Tuna Quota Reduction',
    rawSummary: '47-page PDF conservation measure detailing revised catch limits for bigeye tuna in IO-4. Includes annexes with national allocation tables and monitoring specifications.',
    rawFormat: 'PDF',
    rawLanguage: 'Spanish → English (auto-translated)',
    rawPages: 47,
    aiCategory: 'Quota Change',
    aiSpecies: 'Bigeye Tuna',
    aiZone: 'IO-4',
    aiChange: 'Quota cut: 12% reduction (18,500t → 16,280t)',
    aiEffectiveDate: '2026-03-01',
    aiConfidence: 96,
    actionRecommendation: 'Redirect Vessel 3 (FV Deep Blue) to Zone 6',
    actionVessels: ['FV Deep Blue', 'MV Coral Runner', 'FV Ocean Spirit'],
    actionDeadline: '2026-03-01',
    actionStatus: 'pending',
    ingestedAt: '2026-02-28T10:46:00Z',
    minutesAgo: 14,
  },
  {
    id: 'feed-002',
    sourceType: 'pdf',
    sourceName: 'RES-C-26-01',
    sourceUrl: 'https://iattc.org/resolutions/2026',
    sourceOrg: 'IATTC',
    region: 'Eastern Pacific',
    category: 'quota',
    status: 'processed',
    title: 'Resolution C-26-01 EPO Bigeye Tuna Annual Quota',
    rawSummary: '32-page resolution with annexes on bigeye tuna catch allocation adjustments for the Eastern Pacific Ocean zone EPO-3.',
    rawFormat: 'PDF',
    rawLanguage: 'Spanish → English (auto-translated)',
    rawPages: 32,
    aiCategory: 'Quota Change',
    aiSpecies: 'Bigeye Tuna',
    aiZone: 'EPO-3',
    aiChange: 'Quota cut: 8% reduction (62,000t → 57,040t)',
    aiEffectiveDate: '2026-03-15',
    aiConfidence: 94,
    actionRecommendation: 'Recalculate vessel-level allocations for Pacific fleet',
    actionVessels: ['MV Pacific Harvester', 'FV Blue Meridian'],
    actionDeadline: '2026-03-10',
    actionStatus: 'approved',
    ingestedAt: '2026-02-27T08:20:00Z',
    minutesAgo: 1586,
  },
  {
    id: 'feed-003',
    sourceType: 'rss',
    sourceName: 'CCAMLR News Feed',
    sourceUrl: 'https://ccamlr.org/news/area-48-closure',
    sourceOrg: 'CCAMLR',
    region: 'Southern Ocean',
    category: 'closure',
    status: 'processed',
    title: 'Temporary Closure of Krill Fishery — Area 48.1',
    rawSummary: 'RSS feed announcement of 45-day acoustic survey requiring temporary closure of Area 48.1 to all krill fishing operations.',
    rawFormat: 'RSS/HTML',
    rawLanguage: 'English',
    aiCategory: 'Zone Closure',
    aiSpecies: 'Antarctic Krill',
    aiZone: 'Area 48.1',
    aiChange: 'Full closure for 45-day acoustic survey',
    aiEffectiveDate: '2026-03-20',
    aiConfidence: 99,
    actionRecommendation: 'Exit FV Southern Explorer from Area 48.1 by March 20',
    actionVessels: ['FV Southern Explorer'],
    actionDeadline: '2026-03-15',
    actionStatus: 'pending',
    ingestedAt: '2026-02-26T16:45:00Z',
    minutesAgo: 2535,
  },
  {
    id: 'feed-004',
    sourceType: 'email',
    sourceName: 'WCPFC Circular 2026/04',
    sourceUrl: 'https://wcpfc.int/circulars/2026-04',
    sourceOrg: 'WCPFC',
    region: 'Western Pacific',
    category: 'reporting',
    status: 'processed',
    title: 'Updated VMS Reporting Requirements — High Seas Pockets',
    rawSummary: 'Official circular updating vessel monitoring system polling intervals from 4-hour to 2-hour for all vessels operating in WCPO high seas pockets.',
    rawFormat: 'Email (PDF attachment)',
    rawLanguage: 'English',
    rawPages: 8,
    aiCategory: 'Reporting Change',
    aiSpecies: 'All Species',
    aiZone: 'WCPO High Seas',
    aiChange: 'VMS interval: 4h → 2h polling required',
    aiEffectiveDate: '2026-04-01',
    aiConfidence: 98,
    actionRecommendation: 'Check VMS firmware compatibility on MV Pacific Harvester',
    actionVessels: ['MV Pacific Harvester'],
    actionDeadline: '2026-03-25',
    actionStatus: 'pending',
    ingestedAt: '2026-02-24T11:00:00Z',
    minutesAgo: 5820,
  },
  {
    id: 'feed-005',
    sourceType: 'api',
    sourceName: 'ICCAT Catch Data API',
    sourceUrl: 'https://iccat.int/api/catch-limits/na-2',
    sourceOrg: 'ICCAT',
    region: 'North Atlantic',
    category: 'quota',
    status: 'flagged',
    title: 'Swordfish Bycatch Limit at 87% — Approaching Auto-Closure',
    rawSummary: 'Automated API monitoring detected swordfish bycatch allocation in NA-2 has reached 87% utilization (2,340t of 2,700t).',
    rawFormat: 'JSON API',
    rawLanguage: 'English',
    aiCategory: 'Quota Warning',
    aiSpecies: 'Swordfish',
    aiZone: 'NA-2',
    aiChange: 'Bycatch at 87% of limit — auto-closure at 100%',
    aiEffectiveDate: '2026-02-28',
    aiConfidence: 100,
    actionRecommendation: 'Reduce swordfish bycatch immediately — consider gear modifications',
    actionVessels: ['FV Atlantic Prize', 'MV Northern Star'],
    actionDeadline: '2026-03-05',
    actionStatus: 'pending',
    ingestedAt: '2026-02-27T22:10:00Z',
    minutesAgo: 770,
  },
  {
    id: 'feed-006',
    sourceType: 'tweet',
    sourceName: '@SPRFMO_Official',
    sourceUrl: 'https://twitter.com/SPRFMO_Official/status/123456',
    sourceOrg: 'SPRFMO',
    region: 'South Pacific',
    category: 'species',
    status: 'pending',
    title: 'New Deep-Sea Species Protection Measures Announced',
    rawSummary: 'Tweet thread announcing new bottom trawl restrictions and VME encounter protocols for the South Pacific.',
    rawFormat: 'Twitter Thread (6 tweets)',
    rawLanguage: 'English',
    aiCategory: 'Species Protection',
    aiSpecies: 'Deep-Sea Corals',
    aiZone: 'South Pacific',
    aiChange: 'New VME encounter protocol — mandatory move-on rule at 50kg threshold',
    aiEffectiveDate: '2026-06-01',
    aiConfidence: 72,
    actionRecommendation: 'Monitor — no immediate action for current fleet',
    actionVessels: [],
    actionDeadline: '',
    actionStatus: 'pending',
    ingestedAt: '2026-02-28T09:30:00Z',
    minutesAgo: 90,
  },
  {
    id: 'feed-007',
    sourceType: 'pdf',
    sourceName: 'NAFO FC Doc 26/01',
    sourceUrl: 'https://nafo.int/docs/fc-26-01',
    sourceOrg: 'NAFO',
    region: 'NW Atlantic',
    category: 'penalty',
    status: 'processed',
    title: 'Revised Penalty Framework for IUU Fishing Violations',
    rawSummary: '28-page document revising the penalty and sanction framework for illegal, unreported and unregulated fishing activities.',
    rawFormat: 'PDF',
    rawLanguage: 'English / French',
    rawPages: 28,
    aiCategory: 'Penalty Update',
    aiSpecies: 'All Species',
    aiZone: 'NW Atlantic',
    aiChange: 'Fines increased 40% — minimum €75,000 per offense',
    aiEffectiveDate: '2026-07-01',
    aiConfidence: 91,
    actionRecommendation: 'Review compliance procedures for Atlantic fleet',
    actionVessels: ['FV Atlantic Prize', 'MV Northern Star'],
    actionDeadline: '2026-06-01',
    actionStatus: 'pending',
    ingestedAt: '2026-02-22T14:00:00Z',
    minutesAgo: 8460,
  },
];

export const FEED_SOURCE_TYPES: FeedSourceType[] = ['pdf', 'rss', 'email', 'tweet', 'api', 'upload'];
export const FEED_CATEGORIES: FeedCategory[] = ['quota', 'closure', 'species', 'reporting', 'penalty'];
export const FEED_REGIONS = ['Indian Ocean', 'Eastern Pacific', 'Southern Ocean', 'Western Pacific', 'North Atlantic', 'South Pacific', 'NW Atlantic'];
