import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/use-onboarding';
import type { OnboardingData } from '@/lib/onboarding';
import {
  Anchor, ChevronRight, ChevronLeft, Check, Ship, Globe2, Rss, Twitter, Mail,
  FileText, Plus, X, Wifi, Database, Bell, Smartphone, MessageSquare, Zap,
  MapPin, Fish, User, Building2, ArrowRight, Sparkles, Upload, Clock,
  CalendarDays, AlertTriangle, Radio, Search, Loader2, Link2, Shield,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { fetchWcpfcVesselsByCompanyOrRegistration, type GovernmentVesselRecord } from '@/lib/wcpfcRegistry';

const STEPS = [
  { num: 1, label: 'Profile', icon: <User className="h-4 w-4" /> },
  { num: 2, label: 'Fleet', icon: <Ship className="h-4 w-4" /> },
  { num: 3, label: 'Sources', icon: <Database className="h-4 w-4" /> },
  { num: 4, label: 'Alerts', icon: <Bell className="h-4 w-4" /> },
  { num: 5, label: 'Launch', icon: <Zap className="h-4 w-4" /> },
];

const ROLES = [
  { id: 'manager', label: 'Fisheries Manager', desc: 'Managing vessel operations & compliance', icon: <Ship className="h-5 w-5" /> },
  { id: 'regulator', label: 'Regulator', desc: 'Monitoring & enforcing regulations', icon: <AlertTriangle className="h-5 w-5" /> },
  { id: 'researcher', label: 'Researcher', desc: 'Analyzing fisheries data & trends', icon: <Globe2 className="h-5 w-5" /> },
];

const REGIONS = [
  { id: 'pacific', label: 'Pacific Ocean', rfmos: ['IATTC', 'WCPFC', 'SPRFMO', 'NPFC'] },
  { id: 'atlantic', label: 'Atlantic Ocean', rfmos: ['ICCAT', 'NAFO'] },
  { id: 'indian', label: 'Indian Ocean', rfmos: ['IOTC'] },
  { id: 'southern', label: 'Southern Ocean', rfmos: ['CCAMLR'] },
  { id: 'multi', label: 'Multiple Regions', rfmos: ['IATTC', 'WCPFC', 'IOTC', 'ICCAT', 'CCAMLR', 'SPRFMO', 'NAFO', 'NPFC'] },
];

const SPECIES_LIST = [
  'Bigeye Tuna', 'Yellowfin Tuna', 'Skipjack Tuna', 'Albacore', 'Bluefin Tuna',
  'Swordfish', 'Blue Marlin', 'Antarctic Krill', 'Patagonian Toothfish',
  'Pacific Saury', 'Squid', 'Mackerel', 'Orange Roughy',
];

const GEAR_TYPES = ['Purse Seine', 'Longline', 'Trawl', 'Pole & Line', 'Gillnet', 'Trap'];

const ZONE_MAP: Record<string, string[]> = {
  IATTC: ['EPO-1', 'EPO-2', 'EPO-3'],
  WCPFC: ['WCPO High Seas', 'WCPO-1'],
  IOTC: ['IO-1', 'IO-2', 'IO-3', 'IO-4'],
  ICCAT: ['NA-1', 'NA-2', 'SA-1'],
  CCAMLR: ['Area 48.1', 'Area 48.2', 'Area 58'],
  SPRFMO: ['SP-1', 'SP-2'],
  NAFO: ['3L', '3M', '3NO'],
  NPFC: ['NP-1', 'NP-2'],
};

const SOURCE_TYPES = [
  { id: 'rfmo', label: 'RFMO Official Feeds', icon: <Globe2 className="h-5 w-5" />, desc: 'Auto-added based on your region', auto: true },
  { id: 'rss', label: 'RSS / Atom Feeds', icon: <Rss className="h-5 w-5" />, desc: 'Paste any regulatory feed URL' },
  { id: 'email', label: 'Email Forwarding', icon: <Mail className="h-5 w-5" />, desc: 'Forward updates to your unique inbox' },
  { id: 'twitter', label: 'X / Twitter Accounts', icon: <Twitter className="h-5 w-5" />, desc: 'Monitor @IOTC_Secretariat etc' },
  { id: 'gov', label: 'Government Portals', icon: <Building2 className="h-5 w-5" />, desc: 'URL monitoring for regulatory sites' },
  { id: 'upload', label: 'Custom Upload', icon: <Upload className="h-5 w-5" />, desc: 'Drop a PDF anytime for AI extraction' },
];

const GLOBAL_DATA_SOURCES = [
  { id: 'gfw', label: 'Global Fishing Watch', desc: 'Satellite-based vessel tracking & fishing activity', icon: '🛰️' },
  { id: 'fao', label: 'FAO FishStatJ', desc: 'Global fisheries production & trade statistics', icon: '🐟' },
  { id: 'ais', label: 'AIS Marine Traffic', desc: 'Automatic Identification System vessel positions', icon: '📡' },
  { id: 'iuu', label: 'IUU Vessel Blacklist', desc: 'Combined RFMO IUU vessel lists & sanctions', icon: '🚫' },
  { id: 'noaa', label: 'NOAA Fisheries Data', desc: 'US federal fisheries science & management data', icon: '🌊' },
];

const AI_RECOMMENDED_SOURCES: Record<string, { id: string; label: string; desc: string; reason: string; icon: string }[]> = {
  pacific: [
    { id: 'spc', label: 'SPC / Pacific Community', desc: 'Pacific Island fisheries observer & catch data', reason: 'Covers your Pacific operating region', icon: '🏝️' },
    { id: 'ffa', label: 'FFA Vessel Register', desc: 'Forum Fisheries Agency vessel licensing database', reason: 'Required for WCPO compliance', icon: '📋' },
    { id: 'pna', label: 'PNA VDS Scheme', desc: 'Vessel Day Scheme effort allocation data', reason: 'Critical for purse seine fleet ops', icon: '📊' },
  ],
  atlantic: [
    { id: 'euf', label: 'EU Fleet Register', desc: 'European fishing fleet capacity & licensing', reason: 'Covers Atlantic EU-flagged vessels', icon: '🇪🇺' },
    { id: 'nmfs', label: 'NMFS Permits Database', desc: 'US Atlantic & Gulf fishing permits', reason: 'Required for NA-1/NA-2 zone ops', icon: '📜' },
  ],
  indian: [
    { id: 'iotcdb', label: 'IOTC Catch Database', desc: 'Indian Ocean catch & effort statistics', reason: 'Direct feed from your primary RFMO', icon: '🎣' },
    { id: 'iioe', label: 'IIOE Oceanographic Data', desc: 'Indian Ocean environmental & species data', reason: 'Correlates environmental shifts to catch', icon: '🌡️' },
  ],
  southern: [
    { id: 'ccamlrdb', label: 'CCAMLR Catch Limits', desc: 'Antarctic catch documentation scheme data', reason: 'Mandatory for Southern Ocean ops', icon: '🧊' },
    { id: 'scar', label: 'SCAR Biodiversity DB', desc: 'Antarctic ecosystem & biodiversity monitoring', reason: 'Required for precautionary approach', icon: '🐧' },
  ],
  multi: [
    { id: 'spc', label: 'SPC / Pacific Community', desc: 'Pacific Island fisheries observer & catch data', reason: 'Covers Pacific operations', icon: '🏝️' },
    { id: 'euf', label: 'EU Fleet Register', desc: 'European fishing fleet capacity & licensing', reason: 'Covers Atlantic operations', icon: '🇪🇺' },
    { id: 'iotcdb', label: 'IOTC Catch Database', desc: 'Indian Ocean catch & effort statistics', reason: 'Covers Indian Ocean operations', icon: '🎣' },
  ],
};

type RegistryLookupResult = GovernmentVesselRecord;

const ALERT_CATEGORIES = [
  { id: 'quota', label: 'Quota Changes', icon: '📊' },
  { id: 'closure', label: 'Area Closures', icon: '🚫' },
  { id: 'reporting', label: 'Reporting Requirements', icon: '📋' },
  { id: 'species', label: 'Species Protections', icon: '🐟' },
  { id: 'penalties', label: 'Penalty Updates', icon: '⚠️' },
];

const URGENCY_OPTIONS = [
  { id: 'immediate', label: 'Immediate', desc: 'Real-time push for critical alerts', icon: <Zap className="h-4 w-4" /> },
  { id: 'daily', label: 'Daily Digest', desc: 'Morning summary of all changes', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'weekly', label: 'Weekly Summary', desc: 'End-of-week compliance report', icon: <Clock className="h-4 w-4" /> },
];

type OnboardingVessel = {
  name: string;
  zone: string;
  species: string;
  gear: string;
  trackingTag: string;
  source?: 'manual' | 'government';
  registrationNumber?: string;
  ownerName?: string;
  imo?: string;
  ircs?: string;
  win?: string;
  sourceUrl?: string;
};

const mapGovernmentGear = (vesselType?: string) => {
  const normalized = vesselType?.toLowerCase() || '';
  if (normalized.includes('purse')) return 'Purse Seine';
  if (normalized.includes('longline') || normalized.includes('liner')) return 'Longline';
  if (normalized.includes('trawl')) return 'Trawl';
  if (normalized.includes('pole') || normalized.includes('line')) return 'Pole & Line';
  if (normalized.includes('gillnet')) return 'Gillnet';
  return '';
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { data: savedData, saveOnboarding } = useOnboarding();
  const [step, setStep] = useState(1);

  // Step 1
  const [role, setRole] = useState(savedData?.role ?? '');
  const [orgName, setOrgName] = useState(savedData?.orgName ?? '');
  const [registryQuery, setRegistryQuery] = useState('');
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryLastImported, setRegistryLastImported] = useState(0);
  const [region, setRegion] = useState(savedData?.region ?? '');

  // Step 2
  const [vessels, setVessels] = useState<OnboardingVessel[]>(
    savedData?.vessels?.length
      ? savedData.vessels.map(v => ({ ...v, trackingTag: v.trackingTag ?? '' }))
      : [{ name: '', zone: '', species: '', gear: '', trackingTag: '' }],
  );
  const [registryResults, setRegistryResults] = useState<RegistryLookupResult[]>([]);
  const [registrySearchedFor, setRegistrySearchedFor] = useState('');
  const [selectedRegistryVessels, setSelectedRegistryVessels] = useState<Set<string>>(new Set());
  const [registrySubscribed, setRegistrySubscribed] = useState(false);

  // Step 3
  const [enabledSources, setEnabledSources] = useState<string[]>(savedData?.enabledSources ?? ['rfmo']);
  const [rssFeeds, setRssFeeds] = useState<string[]>(savedData?.rssFeeds ?? []);
  const [rssFeedUrl, setRssFeedUrl] = useState('');
  const [twitterHandles, setTwitterHandles] = useState<string[]>(savedData?.twitterHandles ?? []);
  const [twitterInput, setTwitterInput] = useState('');
  const [govUrls, setGovUrls] = useState<string[]>(savedData?.govUrls ?? []);
  const [govInput, setGovInput] = useState('');
  const [enabledGlobalSources, setEnabledGlobalSources] = useState<string[]>(
    savedData?.enabledGlobalSources ?? GLOBAL_DATA_SOURCES.map(s => s.id)
  );
  const [enabledAiSources, setEnabledAiSources] = useState<string[]>(savedData?.enabledAiSources ?? []);

  // Step 4
  const [alertCategories, setAlertCategories] = useState<string[]>(savedData?.alertCategories ?? ['quota', 'closure', 'reporting', 'species', 'penalties']);
  const [channels, setChannels] = useState(savedData?.channels ?? { email: true, sms: false, whatsapp: false, push: true });
  const [urgency, setUrgency] = useState(savedData?.urgency ?? 'immediate');

  const progress = (step / STEPS.length) * 100;
  const selectedRegion = REGIONS.find(r => r.id === region);
  const recommendedRfmos = selectedRegion?.rfmos || [];
  const availableZones = recommendedRfmos.flatMap(r => ZONE_MAP[r] || []);
  const aiSources = region ? (AI_RECOMMENDED_SOURCES[region] || []) : [];

  // Initialize AI sources when region changes
  const [lastRegion, setLastRegion] = useState('');
  if (region && region !== lastRegion) {
    setLastRegion(region);
    setEnabledAiSources((AI_RECOMMENDED_SOURCES[region] || []).map(s => s.id));
  }

  const next = () => step < 5 && setStep(step + 1);
  const prev = () => step > 1 && setStep(step - 1);

  const addVessel = () => setVessels(p => [...p, { name: '', zone: '', species: '', gear: '', trackingTag: '' }]);
  const removeVessel = (i: number) => setVessels(p => p.filter((_, idx) => idx !== i));
  const updateVessel = (i: number, field: string, value: string) =>
    setVessels(p => p.map((v, idx) => idx === i ? { ...v, [field]: value } : v));

  const toggleSource = (id: string) => setEnabledSources(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCategory = (id: string) => setAlertCategories(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleGlobalSource = (id: string) => setEnabledGlobalSources(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAiSource = (id: string) => setEnabledAiSources(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, inputSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) { setter(p => [...p, value.trim()]); inputSetter(''); }
  };
  const removeItem = (i: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(p => p.filter((_, idx) => idx !== i));
  const loadGovernmentVessels = async () => {
    const query = registryQuery.trim();
    if (!query) {
      setRegistryError('Enter company name or registration ID.');
      return;
    }

    setRegistryLoading(true);
    setRegistryError('');
    setRegistryLastImported(0);

    try {
      const results = await fetchWcpfcVesselsByCompanyOrRegistration(query);
      setRegistrySearchedFor(query);

      if (!results.length) {
        setRegistryResults([]);
        setSelectedRegistryVessels(new Set());
        setRegistryError('No registered vessels found for that company/registration ID.');
        return;
      }

      setRegistryResults(results);
      setSelectedRegistryVessels(new Set());

      if (!orgName.trim()) {
        const owner = results.find(r => r.ownerName)?.ownerName;
        if (owner) setOrgName(owner);
      }
    } catch {
      setRegistryResults([]);
      setSelectedRegistryVessels(new Set());
      setRegistryError('Government registry lookup failed. Please try again in a minute.');
    } finally {
      setRegistryLoading(false);
    }
  };

  const toggleRegistryVessel = (id: string) => {
    setSelectedRegistryVessels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addRegistryVessels = () => {
    if (!registryResults.length || selectedRegistryVessels.size === 0) return;

    const selectedRows = registryResults.filter(v => selectedRegistryVessels.has(v.vid));
    const newVessels: OnboardingVessel[] = selectedRows.map(v => ({
      name: v.name,
      zone: '',
      species: '',
      gear: mapGovernmentGear(v.vesselType),
      trackingTag: '',
      source: 'government',
      registrationNumber: v.registrationNumber,
      ownerName: v.ownerName,
      imo: v.imo,
      ircs: v.ircs,
      win: v.win,
      sourceUrl: v.sourceUrl,
    }));

    setVessels(p => {
      const cleaned = p.filter(v => v.name.trim());
      return cleaned.length > 0 ? [...cleaned, ...newVessels] : newVessels;
    });

    setRegistryLastImported(newVessels.length);
    setSelectedRegistryVessels(new Set());

    if (!orgName.trim()) {
      const owner = selectedRows.find(v => v.ownerName)?.ownerName;
      if (owner) setOrgName(owner);
    }
  };

  const filledVessels = vessels.filter(v => v.name.trim());

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Anchor className="h-3.5 w-3.5 text-primary" />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              MARE<span className="text-primary">WATCH</span>
              <span className="text-muted-foreground font-normal ml-2 text-xs">Setup</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-muted-foreground">Step {step} of 5</span>
            <Progress value={progress} className="w-32 h-1.5 bg-secondary/30" />
          </div>
        </div>
      </header>

      {/* Step Bar */}
      <div className="border-b border-border bg-card/40 px-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {STEPS.map((s, i) => {
            const isActive = s.num === step;
            const isDone = s.num < step;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all ${
                    isActive ? 'text-primary bg-primary/10' : isDone ? 'text-success cursor-pointer hover:bg-success/10' : 'text-muted-foreground/40'
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-success/40' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* ── Step 1: Who are you? ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Who are you?</h2>
                <p className="text-sm text-muted-foreground mt-1">We'll customize everything based on your role and region.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Your Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        role === r.id
                          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-secondary/20'
                      }`}
                    >
                      <div className={`mb-2 ${role === r.id ? 'text-primary' : 'text-muted-foreground'}`}>{r.icon}</div>
                      <p className={`text-sm font-semibold ${role === r.id ? 'text-primary' : 'text-foreground'}`}>{r.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Organization</label>
                <input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Pacific Fleet Management Ltd."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>


              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Region of Operation</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REGIONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRegion(r.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        region === r.id ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-secondary/20'
                      }`}
                    >
                      <p className={`text-sm font-medium ${region === r.id ? 'text-primary' : 'text-foreground'}`}>{r.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">{r.rfmos.join(' · ')}</p>
                    </button>
                  ))}
                </div>
                {region && (
                  <p className="text-[10px] text-primary/80 flex items-center gap-1 mt-1">
                    <Check className="h-3 w-3" />
                    {recommendedRfmos.length} RFMOs will be auto-monitored for your region
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Your Fleet ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Ship className="h-5 w-5 text-primary" /> Your Fleet
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tag each vessel with zone, species, gear type, and tracking tag. We'll use this to filter everything that matters to you.
                </p>
              </div>

              {/* CSV hint */}
              <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-secondary/30 flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Have a vessel list?</p>
                  <p className="text-[10px] text-muted-foreground">Upload a CSV with columns: name, zone, species, gear type, tracking tag</p>
                </div>
                <button className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  Upload CSV
                </button>
              </div>

              {/* WCPFC Registry Lookup */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">WCPFC Government Registry</p>
                    <p className="text-[10px] text-muted-foreground">Search by company name or registration number</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={registryQuery}
                    onChange={e => setRegistryQuery(e.target.value)}
                    placeholder="e.g. SHENZHEN RONGHENG OCEAN FISHERY CO.,LTD."
                    className="flex-1 px-3 py-2 rounded-md border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && loadGovernmentVessels()}
                  />
                  <button
                    onClick={loadGovernmentVessels}
                    disabled={registryLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Source: WCPFC Record of Fishing Vessels (government/intergovernmental registry).
                </p>
                {registryError && <p className="text-[11px] text-destructive">{registryError}</p>}
                {!registryError && registryLastImported > 0 && (
                  <p className="text-[11px] text-success flex items-center gap-1">
                    <Check className="h-3 w-3" /> Imported {registryLastImported} vessel{registryLastImported > 1 ? 's' : ''} to your fleet.
                  </p>
                )}

                {registryLoading && (
                  <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-mono">Querying national registries…</span>
                  </div>
                )}

                {registryResults.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">
                        {registryResults.length} vessels found for "{registrySearchedFor || registryQuery.trim()}"
                      </p>
                      <button
                        onClick={() => {
                          if (selectedRegistryVessels.size === registryResults.length) {
                            setSelectedRegistryVessels(new Set());
                          } else {
                            setSelectedRegistryVessels(new Set(registryResults.map(v => v.vid)));
                          }
                        }}
                        className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {selectedRegistryVessels.size === registryResults.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {registryResults.map(result => {
                      const selected = selectedRegistryVessels.has(result.vid);
                      return (
                        <button
                          key={result.vid}
                          onClick={() => toggleRegistryVessel(result.vid)}
                          className={`w-full rounded-lg border p-3 text-left transition-all ${
                            selected ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/10 hover:bg-secondary/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                            }`}>
                              {selected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-foreground truncate">{result.name}</p>
                                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">VID {result.vid}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                Owner: {result.ownerName || '—'}
                              </p>
                              <div className="flex flex-wrap gap-1.5 text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">Reg {result.registrationNumber || '—'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">IMO {result.imo || '—'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">IRCS {result.ircs || '—'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">WIN {result.win || '—'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">Type {result.vesselType || '—'}</span>
                              </div>
                              {result.sourceUrl && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                                  <Link2 className="h-2.5 w-2.5" /> Government source available
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {selectedRegistryVessels.size > 0 && (
                      <button
                        onClick={addRegistryVessels}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add {selectedRegistryVessels.size} vessel{selectedRegistryVessels.size > 1 ? 's' : ''} to fleet
                      </button>
                    )}

                    <div className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                      registrySubscribed ? 'border-success/40 bg-success/5' : 'border-border bg-secondary/10'
                    }`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        registrySubscribed ? 'bg-success/15 text-success' : 'bg-secondary/30 text-muted-foreground'
                      }`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">Subscribe to this registry</p>
                        <p className="text-[10px] text-muted-foreground">Auto-add new vessels registered under this company ID</p>
                      </div>
                      <Switch
                        checked={registrySubscribed}
                        onCheckedChange={setRegistrySubscribed}
                        className="data-[state=checked]:bg-success flex-shrink-0"
                      />
                    </div>
                    {registrySubscribed && (
                      <p className="text-[10px] text-success/80 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        You'll be notified when new vessels are added to this registry
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Vessel cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Vessels ({vessels.length})</label>
                  <button onClick={addVessel} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                    <Plus className="h-3 w-3" /> Add vessel
                  </button>
                </div>

                {vessels.map((v, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={v.name}
                        onChange={e => updateVessel(i, 'name', e.target.value)}
                        placeholder="Vessel name (e.g. MV Pacific Harvester)"
                        className="flex-1 px-3 py-2 rounded-md border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      {vessels.length > 1 && (
                        <button onClick={() => removeVessel(i)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Tracking Tag */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-secondary/20 flex-1">
                        <Radio className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <input
                          value={v.trackingTag}
                          onChange={e => updateVessel(i, 'trackingTag', e.target.value)}
                          placeholder="Electronic tracking tag ID (e.g. ELT-2024-08291)"
                          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={v.zone}
                        onChange={e => updateVessel(i, 'zone', e.target.value)}
                        className="px-2 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="">Zone</option>
                        {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <select
                        value={v.species}
                        onChange={e => updateVessel(i, 'species', e.target.value)}
                        className="px-2 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="">Species</option>
                        {SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        value={v.gear}
                        onChange={e => updateVessel(i, 'gear', e.target.value)}
                        className="px-2 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="">Gear Type</option>
                        {GEAR_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {v.source === 'government' && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                        <p className="text-[10px] font-mono text-primary uppercase">Government record</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {v.ownerName ? `Owner: ${v.ownerName}` : 'Owner: —'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reg: {v.registrationNumber || '—'} · IMO: {v.imo || '—'} · IRCS: {v.ircs || '—'}
                        </p>
                        {v.sourceUrl && (
                          <a
                            href={v.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-primary hover:underline"
                          >
                            View source
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Sources ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" /> Your Sources
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Start with our recommended sources for your region — add or remove anything.
                </p>
              </div>

              {/* Auto-added RFMO banner */}
              {recommendedRfmos.length > 0 && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <p className="text-xs font-semibold text-success flex items-center gap-1.5 mb-1.5">
                    <Check className="h-3.5 w-3.5" /> Auto-added for {selectedRegion?.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedRfmos.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded bg-success/10 text-[10px] font-mono text-success border border-success/20">{r}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {SOURCE_TYPES.map(src => {
                  const enabled = enabledSources.includes(src.id);
                  return (
                    <div key={src.id} className={`rounded-lg border p-4 transition-all ${
                      enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            enabled ? 'bg-primary/15 text-primary' : 'bg-secondary/30 text-muted-foreground'
                          }`}>{src.icon}</div>
                          <div>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {src.label}
                              {src.auto && <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/15 text-success font-mono">AUTO</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{src.desc}</p>
                          </div>
                        </div>
                        <Switch checked={enabled} onCheckedChange={() => toggleSource(src.id)} className="data-[state=checked]:bg-primary flex-shrink-0" />
                      </div>

                      {/* Inline config */}
                      {enabled && src.id === 'rss' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex gap-2">
                            <input value={rssFeedUrl} onChange={e => setRssFeedUrl(e.target.value)} placeholder="https://rfmo.org/feed.xml"
                              className="flex-1 px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                              onKeyDown={e => e.key === 'Enter' && addItem(rssFeedUrl, setRssFeeds, setRssFeedUrl)} />
                            <button onClick={() => addItem(rssFeedUrl, setRssFeeds, setRssFeedUrl)} className="px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">Add</button>
                          </div>
                          {rssFeeds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rssFeeds.map((f, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/30 text-[10px] font-mono text-muted-foreground">
                                  <Rss className="h-2.5 w-2.5" />{f.length > 35 ? f.slice(0, 35) + '…' : f}
                                  <button onClick={() => removeItem(i, setRssFeeds)} className="hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {enabled && src.id === 'twitter' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex gap-2">
                            <input value={twitterInput} onChange={e => setTwitterInput(e.target.value)} placeholder="@IOTC_Secretariat"
                              className="flex-1 px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                              onKeyDown={e => e.key === 'Enter' && addItem(twitterInput.replace(/^@/, ''), setTwitterHandles, setTwitterInput)} />
                            <button onClick={() => addItem(twitterInput.replace(/^@/, ''), setTwitterHandles, setTwitterInput)} className="px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">Add</button>
                          </div>
                          {twitterHandles.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {twitterHandles.map((h, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/30 text-[10px] font-mono text-muted-foreground">
                                  @{h}<button onClick={() => removeItem(i, setTwitterHandles)} className="hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {enabled && src.id === 'email' && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/20 border border-border/50">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[11px] font-mono text-foreground">ingest-{orgName ? orgName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'yourorg'}@marewatch.io</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">Forward emails here</span>
                          </div>
                        </div>
                      )}

                      {enabled && src.id === 'gov' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex gap-2">
                            <input value={govInput} onChange={e => setGovInput(e.target.value)} placeholder="https://fisheries.gov.au/regulations"
                              className="flex-1 px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                              onKeyDown={e => e.key === 'Enter' && addItem(govInput, setGovUrls, setGovInput)} />
                            <button onClick={() => addItem(govInput, setGovUrls, setGovInput)} className="px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">Add</button>
                          </div>
                          {govUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {govUrls.map((u, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/30 text-[10px] font-mono text-muted-foreground">
                                  <Globe2 className="h-2.5 w-2.5" />{u.length > 35 ? u.slice(0, 35) + '…' : u}
                                  <button onClick={() => removeItem(i, setGovUrls)} className="hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Suggested Global Data Sources ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-primary" />
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Suggested Global Data Sources</label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono">RECOMMENDED</span>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">Essential data feeds used by all fisheries — enabled by default.</p>
                {GLOBAL_DATA_SOURCES.map(src => {
                  const enabled = enabledGlobalSources.includes(src.id);
                  return (
                    <div key={src.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                      enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                    }`}>
                      <span className="text-lg flex-shrink-0">{src.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{src.label}</p>
                        <p className="text-[10px] text-muted-foreground">{src.desc}</p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={() => toggleGlobalSource(src.id)} className="data-[state=checked]:bg-primary flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {/* ── AI Recommended Data Sources ── */}
              {aiSources.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-warning" />
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">AI-Recommended Sources</label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-mono">AI</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Based on your region ({selectedRegion?.label}), industry, and organization profile.
                  </p>
                  {aiSources.map(src => {
                    const enabled = enabledAiSources.includes(src.id);
                    return (
                      <div key={src.id} className={`rounded-lg border p-3 transition-all ${
                        enabled ? 'border-warning/30 bg-warning/5' : 'border-border bg-card'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg flex-shrink-0">{src.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{src.label}</p>
                            <p className="text-[10px] text-muted-foreground">{src.desc}</p>
                          </div>
                          <Switch checked={enabled} onCheckedChange={() => toggleAiSource(src.id)} className="data-[state=checked]:bg-warning flex-shrink-0" />
                        </div>
                        <div className="mt-1.5 ml-10">
                          <p className="text-[10px] text-warning/80 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> {src.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Alert Preferences ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Alert Preferences
                </h2>
                <p className="text-sm text-muted-foreground mt-1">What triggers an alert, where, and how urgent.</p>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">What triggers an alert?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALERT_CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => toggleCategory(c.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        alertCategories.includes(c.id) ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-secondary/20'
                      }`}>
                      <span className="text-lg">{c.icon}</span>
                      <p className={`text-xs font-medium mt-1 ${alertCategories.includes(c.id) ? 'text-primary' : 'text-foreground'}`}>{c.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Where?</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'email' as const, label: 'Email', icon: <Mail className="h-4 w-4" /> },
                    { key: 'sms' as const, label: 'SMS', icon: <Smartphone className="h-4 w-4" /> },
                    { key: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
                    { key: 'push' as const, label: 'In-App Push', icon: <Bell className="h-4 w-4" /> },
                  ]).map(ch => (
                    <button key={ch.key} onClick={() => setChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all ${
                        channels[ch.key] ? 'border-primary/50 bg-primary/10' : 'border-border bg-card hover:bg-secondary/20'
                      }`}>
                      <div className={channels[ch.key] ? 'text-primary' : 'text-muted-foreground'}>{ch.icon}</div>
                      <span className={`text-sm font-medium ${channels[ch.key] ? 'text-primary' : 'text-foreground'}`}>{ch.label}</span>
                      {channels[ch.key] && <Check className="h-3 w-3 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">How urgent?</label>
                <div className="space-y-2">
                  {URGENCY_OPTIONS.map(u => (
                    <button key={u.id} onClick={() => setUrgency(u.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        urgency === u.id ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-secondary/20'
                      }`}>
                      <div className={urgency === u.id ? 'text-primary' : 'text-muted-foreground'}>{u.icon}</div>
                      <div>
                        <p className={`text-sm font-medium ${urgency === u.id ? 'text-primary' : 'text-foreground'}`}>{u.label}</p>
                        <p className="text-[10px] text-muted-foreground">{u.desc}</p>
                      </div>
                      {urgency === u.id && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Review & Launch ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-success/10 border border-success/20 mx-auto">
                  <Sparkles className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Review & Go Live</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">Here's your setup summary. Everything can be changed later from the Comm tab.</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Organization</p>
                  <p className="text-sm font-semibold text-foreground">{orgName || '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ROLES.find(r => r.id === role)?.label || '—'} · {selectedRegion?.label || '—'}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Fleet</p>
                  <p className="text-2xl font-bold text-primary">{filledVessels.length}</p>
                  <p className="text-[10px] text-muted-foreground">vessels configured</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Sources</p>
                  <p className="text-2xl font-bold text-primary">{enabledSources.length + enabledGlobalSources.length + enabledAiSources.length}</p>
                  <p className="text-[10px] text-muted-foreground">active ingestion channels</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Monitoring</p>
                  <p className="text-2xl font-bold text-primary">{recommendedRfmos.length}</p>
                  <p className="text-[10px] text-muted-foreground">RFMOs tracked</p>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Alert Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {alertCategories.map(c => {
                      const cat = ALERT_CATEGORIES.find(a => a.id === c);
                      return <span key={c} className="px-2 py-0.5 rounded bg-primary/10 text-[10px] font-mono text-primary border border-primary/20">{cat?.icon} {cat?.label}</span>;
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Notification Channels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(channels).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-secondary/40 text-[10px] font-mono text-foreground border border-border capitalize">{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Urgency</p>
                  <span className="px-2 py-0.5 rounded bg-warning/10 text-[10px] font-mono text-warning border border-warning/20 capitalize">{urgency}</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button onClick={() => {
                  const onboardingData: OnboardingData = {
                    role,
                    orgName,
                    region,
                    vessels: vessels.filter(v => v.name.trim()),
                    enabledSources,
                    rssFeeds,
                    twitterHandles,
                    govUrls,
                    enabledGlobalSources,
                    enabledAiSources,
                    alertCategories,
                    channels,
                    urgency,
                    completedAt: new Date().toISOString(),
                  };
                  saveOnboarding(onboardingData);
                  navigate('/');
                }}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  Start Monitoring
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {step > 0 && step < 5 && (
        <div className="border-t border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={prev} disabled={step === 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              step === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={next}
            className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
