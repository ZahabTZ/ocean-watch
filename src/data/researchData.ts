import { MOCK_VESSELS } from './mockData';

export interface VesselCapability {
  id: string;
  vesselId: string;
  vesselName: string;
  flag: string;
  operatingRegion: string;
  homePort: string;
  deckSpace: string;
  endurance: string;
  equipment: string[];
  certifications: string[];
  pastMissions: string[];
  availableFrom: string;
  availableTo: string;
  discoverable: boolean;
  matchScore?: number;
  confidenceLevel?: 'high' | 'partial' | 'low';
  verified: boolean;
}

export interface ResearchRequest {
  id: string;
  researcherName: string;
  institution: string;
  missionType: string;
  region: string;
  equipmentNeeded: string[];
  dateRange: string;
  budget: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'negotiating';
  vesselId: string;
  vesselName: string;
  timestamp: string;
  chatMessages: ChatMsg[];
}

export interface ChatMsg {
  id: string;
  sender: 'researcher' | 'operator';
  text: string;
  timestamp: string;
}

export const VESSEL_CAPABILITIES: VesselCapability[] = [
  {
    id: 'vc1', vesselId: 'v1', vesselName: 'MV Pacific Harvester', flag: '🇵🇦',
    operatingRegion: 'Eastern Pacific', homePort: 'Panama City',
    deckSpace: '420 m²', endurance: '45 days',
    equipment: ['ROV', 'Wet Lab', 'A-Frame Crane', 'Multibeam Sonar'],
    certifications: ['ISM Code', 'MARPOL Annex VI', 'SOLAS'],
    pastMissions: ['Hydrothermal Vent Survey 2025', 'Tuna Tagging Program'],
    availableFrom: '2026-04-01', availableTo: '2026-06-30',
    discoverable: true, verified: true,
  },
  {
    id: 'vc2', vesselId: 'v2', vesselName: 'FV Blue Meridian', flag: '🇪🇸',
    operatingRegion: 'Eastern Pacific', homePort: 'Vigo, Spain',
    deckSpace: '280 m²', endurance: '30 days',
    equipment: ['CTD Rosette', 'Plankton Nets', 'Deck Crane'],
    certifications: ['ISM Code', 'EU Fisheries License'],
    pastMissions: ['Sardine Biomass Survey 2024'],
    availableFrom: '2026-03-15', availableTo: '2026-05-15',
    discoverable: true, verified: true,
  },
  {
    id: 'vc3', vesselId: 'v3', vesselName: 'FV Ocean Spirit', flag: '🇯🇵',
    operatingRegion: 'Indian Ocean', homePort: 'Shimizu, Japan',
    deckSpace: '350 m²', endurance: '60 days',
    equipment: ['ROV', 'Dry Lab', 'Wet Lab', 'ADCP', 'Winch System'],
    certifications: ['ISM Code', 'JFA Certified', 'IOTC Observer Ready'],
    pastMissions: ['Indian Ocean Tuna Tagging 2024', 'Coral Reef Assessment'],
    availableFrom: '2026-04-10', availableTo: '2026-08-01',
    discoverable: true, verified: true,
  },
  {
    id: 'vc4', vesselId: 'v4', vesselName: 'MV Coral Runner', flag: '🇰🇷',
    operatingRegion: 'Indian Ocean', homePort: 'Busan, South Korea',
    deckSpace: '200 m²', endurance: '25 days',
    equipment: ['Echo Sounder', 'Deck Crane'],
    certifications: ['ISM Code'],
    pastMissions: [],
    availableFrom: '2026-05-01', availableTo: '2026-07-01',
    discoverable: true, verified: false,
  },
  {
    id: 'vc5', vesselId: 'v6', vesselName: 'FV Southern Explorer', flag: '🇳🇴',
    operatingRegion: 'Southern Ocean', homePort: 'Tromsø, Norway',
    deckSpace: '500 m²', endurance: '90 days',
    equipment: ['ROV', 'AUV', 'Wet Lab', 'Dry Lab', 'Ice-Rated Hull', 'Multibeam Sonar', 'Trawl Winch'],
    certifications: ['ISM Code', 'Polar Code', 'CCAMLR Licensed'],
    pastMissions: ['Antarctic Krill Survey 2025', 'Ice Shelf Mapping 2024', 'Deep Sea Sampling'],
    availableFrom: '2026-04-01', availableTo: '2026-09-30',
    discoverable: true, verified: true,
  },
  {
    id: 'vc6', vesselId: 'v7', vesselName: 'FV Atlantic Prize', flag: '🇵🇹',
    operatingRegion: 'North Atlantic', homePort: 'Lisbon, Portugal',
    deckSpace: '310 m²', endurance: '35 days',
    equipment: ['CTD Rosette', 'Plankton Nets', 'Wet Lab', 'A-Frame Crane'],
    certifications: ['ISM Code', 'EU Fisheries License', 'ICCAT Observer Ready'],
    pastMissions: ['Swordfish Migration Study 2025'],
    availableFrom: '2026-03-01', availableTo: '2026-05-30',
    discoverable: true, verified: true,
  },
];

export const MOCK_RESEARCH_REQUESTS: ResearchRequest[] = [
  {
    id: 'rr1',
    researcherName: 'Dr. Elena Vasquez',
    institution: 'Scripps Institution of Oceanography',
    missionType: 'Deep Sea Survey',
    region: 'Eastern Pacific',
    equipmentNeeded: ['ROV', 'Multibeam Sonar'],
    dateRange: 'April–May 2026',
    budget: '$120,000–$180,000',
    message: 'We are planning a hydrothermal vent survey near the East Pacific Rise. We need a vessel with ROV capability and multibeam sonar for bathymetric mapping. Our team of 6 scientists would need wet lab access.',
    status: 'pending',
    vesselId: 'v1',
    vesselName: 'MV Pacific Harvester',
    timestamp: '2026-02-27T14:30:00Z',
    chatMessages: [
      { id: 'cm1', sender: 'researcher', text: 'Hi, we\'re very interested in chartering your vessel for our hydrothermal vent survey. Is the ROV rated for 3000m depth?', timestamp: '2026-02-27T14:30:00Z' },
      { id: 'cm2', sender: 'operator', text: 'Welcome Dr. Vasquez. Yes, our ROV is rated to 3500m. We also have real-time video relay to the wet lab.', timestamp: '2026-02-27T15:10:00Z' },
      { id: 'cm3', sender: 'researcher', text: 'Perfect. Can we schedule a call to discuss logistics and berthing for our 6-person science team?', timestamp: '2026-02-27T16:00:00Z' },
    ],
  },
  {
    id: 'rr2',
    researcherName: 'Prof. James Thornton',
    institution: 'Woods Hole Oceanographic Institution',
    missionType: 'Acoustic Monitoring',
    region: 'North Atlantic',
    equipmentNeeded: ['CTD Rosette', 'Plankton Nets'],
    dateRange: 'March–April 2026',
    budget: '$80,000–$120,000',
    message: 'Looking for a vessel to support our annual plankton survey and CTD transect in the North Atlantic. We need 20 days of ship time with wet lab access.',
    status: 'negotiating',
    vesselId: 'v7',
    vesselName: 'FV Atlantic Prize',
    timestamp: '2026-02-25T09:15:00Z',
    chatMessages: [
      { id: 'cm4', sender: 'researcher', text: 'We\'d like to discuss a 20-day charter for our annual plankton survey. Your vessel seems like a great fit.', timestamp: '2026-02-25T09:15:00Z' },
      { id: 'cm5', sender: 'operator', text: 'Prof. Thornton, thank you for reaching out. We can accommodate your team. Our daily rate for research charters is €4,200.', timestamp: '2026-02-25T11:00:00Z' },
      { id: 'cm6', sender: 'researcher', text: 'That\'s within our budget. Can we negotiate on the mobilization fee? Also, do you provide onboard catering?', timestamp: '2026-02-25T14:30:00Z' },
      { id: 'cm7', sender: 'operator', text: 'We can waive the mobilization if departing from Lisbon. Full catering included. Shall I send a formal quote?', timestamp: '2026-02-26T08:00:00Z' },
    ],
  },
  {
    id: 'rr3',
    researcherName: 'Dr. Yuki Tanaka',
    institution: 'JAMSTEC',
    missionType: 'Coral Reef Assessment',
    region: 'Indian Ocean',
    equipmentNeeded: ['ROV', 'Wet Lab'],
    dateRange: 'May–July 2026',
    budget: '$200,000–$300,000',
    message: 'JAMSTEC is conducting a coral reef health assessment across 12 sites in the Indian Ocean. We need a vessel with ROV for visual surveys and sample collection, plus wet lab for immediate processing.',
    status: 'pending',
    vesselId: 'v3',
    vesselName: 'FV Ocean Spirit',
    timestamp: '2026-02-28T06:00:00Z',
    chatMessages: [
      { id: 'cm8', sender: 'researcher', text: 'Konnichiwa. JAMSTEC would like to charter your vessel for a 60-day coral assessment mission. Can you share your equipment specs and crew capability for hosting a science party of 8?', timestamp: '2026-02-28T06:00:00Z' },
    ],
  },
];

export const ALL_EQUIPMENT = ['ROV', 'AUV', 'Wet Lab', 'Dry Lab', 'CTD Rosette', 'Multibeam Sonar', 'ADCP', 'Plankton Nets', 'A-Frame Crane', 'Deck Crane', 'Winch System', 'Echo Sounder', 'Ice-Rated Hull', 'Trawl Winch'];
export const ALL_REGIONS = ['Eastern Pacific', 'Indian Ocean', 'Southern Ocean', 'North Atlantic', 'Western Pacific', 'South Pacific'];
export const MISSION_TYPES = ['Deep Sea Survey', 'Acoustic Monitoring', 'Coral Reef Assessment', 'Species Tagging', 'Bathymetric Mapping', 'Environmental Sampling', 'Ice Shelf Research', 'Fisheries Observer'];
