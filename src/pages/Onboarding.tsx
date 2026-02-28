import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor, ChevronRight, ChevronLeft, Check, Ship, Globe2, Mail,
  FileText, Plus, X, Wifi, Database, Bell, Smartphone, MessageSquare, Zap,
  MapPin, Fish, User, Building2, ArrowRight, Sparkles, Upload, Clock,
  CalendarDays, AlertTriangle, Radio, Search, Loader2, Link2, Shield,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { fetchWcpfcVesselsByCompanyOrRegistration, type GovernmentVesselRecord } from '@/lib/wcpfcRegistry';
import { DEMO_COMPANY, DEMO_FLEET_PROFILE, saveFleetProfile, seedDemoFleetProfile } from '@/data/liveData';

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
  { id: 'pacific', label: 'Pacific Ocean', rfmos: ['WCPFC'] },
  { id: 'atlantic', label: 'Atlantic Ocean', rfmos: ['ICCAT'] },
  { id: 'indian', label: 'Indian Ocean', rfmos: ['IOTC'] },
  { id: 'multi', label: 'Multiple Regions', rfmos: ['WCPFC', 'IOTC', 'ICCAT'] },
];

const SPECIES_LIST = [
  'Bigeye Tuna', 'Yellowfin Tuna', 'Skipjack Tuna', 'Albacore', 'Bluefin Tuna',
  'Swordfish', 'Blue Marlin', 'Antarctic Krill', 'Patagonian Toothfish',
  'Pacific Saury', 'Squid', 'Mackerel', 'Orange Roughy',
];

const GEAR_TYPES = ['Purse Seine', 'Longline', 'Trawl', 'Pole & Line', 'Gillnet', 'Trap'];

const ZONE_MAP: Record<string, string[]> = {
  WCPFC: ['WCPO High Seas'],
  IOTC: ['IO-4'],
  ICCAT: ['NA-2'],
};

const SOURCE_TYPES = [
  { id: 'rfmo_iccat', label: 'ICCAT Official Documents', icon: <Globe2 className="h-5 w-5" />, desc: 'Scraped ingestion feed (live)', auto: true },
  { id: 'rfmo_wcpfc', label: 'WCPFC Official Documents', icon: <Globe2 className="h-5 w-5" />, desc: 'Scraped ingestion feed (live)', auto: true },
  { id: 'rfmo_iotc', label: 'IOTC Official Documents', icon: <Globe2 className="h-5 w-5" />, desc: 'Scraped ingestion feed (live)', auto: true },
  { id: 'wcpfc_registry', label: 'WCPFC Vessel Registry', icon: <Database className="h-5 w-5" />, desc: 'Live company/vessel lookup source', auto: true },
  { id: 'gfw_tracking', label: 'Global Fishing Watch Tracking', icon: <Wifi className="h-5 w-5" />, desc: 'Live vessel position enrichment (requires API token)', auto: true },
];

const GLOBAL_DATA_SOURCES = [
  { id: 'gfw', label: 'Global Fishing Watch', desc: 'Satellite-based vessel tracking and latest positions', icon: '🛰️' },
  { id: 'wcpfc_registry', label: 'WCPFC Registry', desc: 'Company and vessel registry records', icon: '📋' },
];

const AI_RECOMMENDED_SOURCES: Record<string, { id: string; label: string; desc: string; reason: string; icon: string }[]> = {
  pacific: [
    { id: 'rfmo_wcpfc', label: 'WCPFC Documents', desc: 'Live WCPFC ingestion feed', reason: 'Primary RFMO for Pacific profile', icon: '🌊' },
  ],
  atlantic: [
    { id: 'rfmo_iccat', label: 'ICCAT Documents', desc: 'Live ICCAT ingestion feed', reason: 'Primary RFMO for Atlantic profile', icon: '🌊' },
  ],
  indian: [
    { id: 'rfmo_iotc', label: 'IOTC Documents', desc: 'Live IOTC ingestion feed', reason: 'Primary RFMO for Indian profile', icon: '🌊' },
  ],
  multi: [
    { id: 'rfmo_wcpfc', label: 'WCPFC Documents', desc: 'Live WCPFC ingestion feed', reason: 'Needed for Pacific segment', icon: '🌊' },
    { id: 'rfmo_iotc', label: 'IOTC Documents', desc: 'Live IOTC ingestion feed', reason: 'Needed for Indian segment', icon: '🌊' },
    { id: 'rfmo_iccat', label: 'ICCAT Documents', desc: 'Live ICCAT ingestion feed', reason: 'Needed for Atlantic segment', icon: '🌊' },
  ],
};

const REGISTRY_VESSELS_SAMPLE = [
  { id: 'REG-001', name: 'FV Southern Cross', imo: '9234567', flag: '🇳🇿', type: 'Longline', registered: '2019' },
  { id: 'REG-002', name: 'MV Pacific Star', imo: '9345678', flag: '🇫🇯', type: 'Purse Seine', registered: '2021' },
  { id: 'REG-003', name: 'FV Ocean Venture', imo: '9456789', flag: '🇦🇺', type: 'Trawl', registered: '2018' },
  { id: 'REG-004', name: 'RV Coral Explorer', imo: '9567890', flag: '🇵🇬', type: 'Pole & Line', registered: '2022' },
];

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
  const [step, setStep] = useState(1);

  // Step 1
  const [role, setRole] = useState('manager');
  const [orgName, setOrgName] = useState(DEMO_COMPANY.name);
  const [registryQuery, setRegistryQuery] = useState(DEMO_COMPANY.registrationId);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryLastImported, setRegistryLastImported] = useState(0);
  const [region, setRegion] = useState('pacific');

  // Step 2
  const [vessels, setVessels] = useState<OnboardingVessel[]>(
    DEMO_FLEET_PROFILE.vessels.map((v, idx) => ({
      name: v.name,
      zone: v.zone,
      species: v.species,
      gear: idx < 2 ? 'Longline' : idx === 2 ? 'Purse Seine' : 'Longline',
      trackingTag: `DEMO-${idx + 1}`,
    }))
  );
  const [registryCompanyId, setRegistryCompanyId] = useState('');
  const [registrySearching, setRegistrySearching] = useState(false);
  const [registryResults, setRegistryResults] = useState<typeof REGISTRY_VESSELS_SAMPLE | null>(null);
  const [selectedRegistryVessels, setSelectedRegistryVessels] = useState<Set<string>>(new Set());
  const [registrySubscribed, setRegistrySubscribed] = useState(false);

  // Step 3
  const [enabledSources, setEnabledSources] = useState<string[]>([
    'rfmo_wcpfc',
    'rfmo_iccat',
    'rfmo_iotc',
    'wcpfc_registry',
    'gfw_tracking',
  ]);
  const [enabledGlobalSources, setEnabledGlobalSources] = useState<string[]>(GLOBAL_DATA_SOURCES.map(s => s.id));
  const [enabledAiSources, setEnabledAiSources] = useState<string[]>(['rfmo_wcpfc']);

  // Step 4
  const [alertCategories, setAlertCategories] = useState<string[]>(['quota', 'closure', 'reporting', 'species', 'penalties']);
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false, push: true });
  const [urgency, setUrgency] = useState('immediate');

  const progress = (step / STEPS.length) * 100;
  const selectedRegion = REGIONS.find(r => r.id === region);
  const recommendedRfmos = selectedRegion?.rfmos || [];
  const availableZones = recommendedRfmos.flatMap(r => ZONE_MAP[r] || []);
  const aiSources = region ? (AI_RECOMMENDED_SOURCES[region] || []) : [];

  // Keep source recommendations aligned with selected region.
  useEffect(() => {
    const regionRfmos = (AI_RECOMMENDED_SOURCES[region] || []).map(s => s.id);
    setEnabledSources(prev => {
      const mandatory = ['wcpfc_registry', 'gfw_tracking'];
      const merged = new Set([...prev.filter(id => !id.startsWith('rfmo_')), ...mandatory, ...regionRfmos]);
      return Array.from(merged);
    });
    setEnabledAiSources(regionRfmos.length ? regionRfmos : []);
  }, [region]);

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

  const loadGovernmentVessels = async () => {
    const query = registryQuery.trim();
    if (!query) {
      setRegistryError('Enter company name or registration ID.');
      return;
    }

    setRegistryLoading(true);
    setRegistryError('');

    try {
      const results = await fetchWcpfcVesselsByCompanyOrRegistration(query);
      if (!results.length) {
        setRegistryError('No registered vessels found for that company/registration ID.');
        setRegistryLastImported(0);
        return;
      }

      const importedVessels: OnboardingVessel[] = results.map((record: GovernmentVesselRecord) => ({
        name: record.name,
        zone: '',
        species: '',
        gear: mapGovernmentGear(record.vesselType),
        source: 'government',
        registrationNumber: record.registrationNumber,
        ownerName: record.ownerName,
        imo: record.imo,
        ircs: record.ircs,
        win: record.win,
        sourceUrl: record.sourceUrl,
      }));

      setVessels(importedVessels);
      setRegistryLastImported(importedVessels.length);
      setStep(2);

      if (!orgName.trim()) {
        const owner = results.find(r => r.ownerName)?.ownerName;
        if (owner) setOrgName(owner);
      }
    } catch {
      setRegistryError('Government registry lookup failed. Please try again in a minute.');
      setRegistryLastImported(0);
    } finally {
      setRegistryLoading(false);
    }
  };

  const searchRegistry = () => {
    if (!registryCompanyId.trim()) return;
    setRegistrySearching(true);
    setRegistryResults(null);
    setTimeout(() => {
      setRegistryResults(REGISTRY_VESSELS_SAMPLE);
      setRegistrySearching(false);
    }, 1500);
  };

  const toggleRegistryVessel = (id: string) => {
    setSelectedRegistryVessels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addRegistryVessels = () => {
    if (!registryResults) return;
    const toAdd = registryResults.filter(v => selectedRegistryVessels.has(v.id));
    const newVessels: OnboardingVessel[] = toAdd.map(v => ({
      name: v.name,
      zone: '',
      species: '',
      gear: v.type,
      trackingTag: '',
    }));
    setVessels(p => {
      const cleaned = p.filter(v => v.name.trim());
      return cleaned.length > 0 ? [...cleaned, ...newVessels] : newVessels;
    });
    setSelectedRegistryVessels(new Set());
    setRegistryResults(null);
    setRegistryCompanyId('');
  };

  const filledVessels = vessels.filter(v => v.name.trim());

  const persistProfileAndLaunch = () => {
    const sourceToRfmo: Record<string, string> = {
      rfmo_iccat: 'ICCAT',
      rfmo_wcpfc: 'WCPFC',
      rfmo_iotc: 'IOTC',
    };
    const selectedRfmos = Array.from(
      new Set(
        enabledSources
          .map(source => sourceToRfmo[source])
          .filter(Boolean),
      ),
    );

    const profile = {
      companyName: orgName.trim() || DEMO_COMPANY.name,
      registrationId: registryQuery.trim() || DEMO_COMPANY.registrationId,
      rfmos: selectedRfmos.length ? selectedRfmos : recommendedRfmos,
      zones: Array.from(new Set(filledVessels.map(v => v.zone).filter(Boolean))),
      species: Array.from(new Set(filledVessels.map(v => v.species).filter(Boolean))),
      vessels: filledVessels.map(v => ({
        name: v.name.trim(),
        zone: v.zone,
        species: v.species,
        gear: v.gear,
        imo: v.imo,
        ircs: v.ircs,
        win: v.win,
        sourceUrl: v.sourceUrl,
      })),
    };
    saveFleetProfile(profile);
    navigate('/');
  };

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
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Company / Registration ID</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={registryQuery}
                    onChange={e => setRegistryQuery(e.target.value)}
                    placeholder="e.g. FT-200002 or RONGHENG"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    onClick={loadGovernmentVessels}
                    disabled={registryLoading}
                    className="sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {registryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Pull from Registry
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Source: WCPFC Record of Fishing Vessels (government/intergovernmental registry).
                </p>
                {registryError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                    <p className="text-[11px] text-destructive">{registryError}</p>
                    <p className="text-[10px] text-destructive/80">
                      Try an exact registration number/IMO, or continue with the preloaded demo profile.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          seedDemoFleetProfile();
                          navigate('/');
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Use Demo Fleet Now
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        className="px-2.5 py-1.5 rounded-md border border-border text-[10px] text-foreground hover:bg-secondary/30 transition-colors"
                      >
                        Continue with Manual Fleet
                      </button>
                    </div>
                  </div>
                )}
                {!registryError && registryLastImported > 0 && (
                  <p className="text-[11px] text-success flex items-center gap-1">
                    <Check className="h-3 w-3" /> Imported {registryLastImported} registered vessel{registryLastImported > 1 ? 's' : ''}.
                  </p>
                )}
                <button
                  onClick={() => {
                    seedDemoFleetProfile();
                    navigate('/');
                  }}
                  className="mt-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Load working demo profile and continue
                </button>
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

              {/* Registry Lookup */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">National Registry Lookup</p>
                    <p className="text-[10px] text-muted-foreground">Find registered vessels by your company ID</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={registryCompanyId}
                    onChange={e => setRegistryCompanyId(e.target.value)}
                    placeholder="Enter Company / Operator ID (e.g. CID-48291)"
                    className="flex-1 px-3 py-2 rounded-md border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && searchRegistry()}
                  />
                  <button
                    onClick={searchRegistry}
                    disabled={registrySearching || !registryCompanyId.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registrySearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </button>
                </div>

                {registrySearching && (
                  <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-mono">Querying national registries…</span>
                  </div>
                )}

                {registryResults && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">
                        {registryResults.length} vessels found for "{registryCompanyId}"
                      </p>
                      <button
                        onClick={() => {
                          if (selectedRegistryVessels.size === registryResults.length) {
                            setSelectedRegistryVessels(new Set());
                          } else {
                            setSelectedRegistryVessels(new Set(registryResults.map(v => v.id)));
                          }
                        }}
                        className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {selectedRegistryVessels.size === registryResults.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    {registryResults.map(rv => {
                      const selected = selectedRegistryVessels.has(rv.id);
                      return (
                        <button
                          key={rv.id}
                          onClick={() => toggleRegistryVessel(rv.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-all ${
                            selected ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/10 hover:bg-secondary/20'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                          }`}>
                            {selected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{rv.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{rv.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">IMO {rv.imo} · {rv.type} · Reg. {rv.registered}</p>
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

                    {/* Subscribe to registry */}
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

                      {enabled && src.id === 'gfw_tracking' && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/20 border border-border/50">
                            <Wifi className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[11px] font-mono text-foreground">Requires `VITE_GFW_API_TOKEN` in environment</span>
                          </div>
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
                <button onClick={persistProfileAndLaunch}
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
