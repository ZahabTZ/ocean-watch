import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor, ChevronRight, ChevronLeft, Check, Ship, Globe2, Rss, Twitter, Mail,
  FileText, Plus, X, Wifi, Database, Bell, Smartphone, MessageSquare, Zap,
  MapPin, Fish, Shield, ArrowRight, Sparkles, Radio,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

// ─── Types ───
type Step = 'welcome' | 'fleet' | 'zones' | 'sources' | 'channels' | 'launch';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'welcome', label: 'Welcome', icon: <Anchor className="h-4 w-4" /> },
  { id: 'fleet', label: 'Fleet', icon: <Ship className="h-4 w-4" /> },
  { id: 'zones', label: 'Zones & Species', icon: <Globe2 className="h-4 w-4" /> },
  { id: 'sources', label: 'Data Sources', icon: <Database className="h-4 w-4" /> },
  { id: 'channels', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'launch', label: 'Launch', icon: <Zap className="h-4 w-4" /> },
];

// ─── Predefined options ───
const RFMO_ZONES = [
  { id: 'iattc', label: 'IATTC', region: 'Eastern Pacific', zones: ['EPO-1', 'EPO-2', 'EPO-3'] },
  { id: 'iotc', label: 'IOTC', region: 'Indian Ocean', zones: ['IO-1', 'IO-2', 'IO-3', 'IO-4'] },
  { id: 'wcpfc', label: 'WCPFC', region: 'Western & Central Pacific', zones: ['WCPO High Seas', 'WCPO-1'] },
  { id: 'iccat', label: 'ICCAT', region: 'Atlantic Ocean', zones: ['NA-1', 'NA-2', 'SA-1'] },
  { id: 'ccamlr', label: 'CCAMLR', region: 'Southern Ocean', zones: ['Area 48.1', 'Area 48.2', 'Area 58'] },
  { id: 'sprfmo', label: 'SPRFMO', region: 'South Pacific', zones: ['SP-1', 'SP-2'] },
  { id: 'nafo', label: 'NAFO', region: 'NW Atlantic', zones: ['3L', '3M', '3NO'] },
  { id: 'npfc', label: 'NPFC', region: 'North Pacific', zones: ['NP-1', 'NP-2'] },
];

const SPECIES_LIST = [
  'Bigeye Tuna', 'Yellowfin Tuna', 'Skipjack Tuna', 'Albacore', 'Bluefin Tuna',
  'Swordfish', 'Blue Marlin', 'Antarctic Krill', 'Patagonian Toothfish', 'Orange Roughy',
  'Pacific Saury', 'Squid', 'Mackerel',
];

const SOURCE_TYPES = [
  { id: 'rfmo_crawl', label: 'RFMO Website Crawler', icon: <Globe2 className="h-5 w-5" />, desc: 'Auto-crawl official RFMO websites for new resolutions, circulars, and updates', pre: true },
  { id: 'rss', label: 'RSS / Atom Feeds', icon: <Rss className="h-5 w-5" />, desc: 'Subscribe to RSS feeds from regulatory bodies, news outlets, or custom sources' },
  { id: 'email', label: 'Email Forwarding', icon: <Mail className="h-5 w-5" />, desc: 'Forward regulatory emails to your MAREWATCH inbox for automatic parsing' },
  { id: 'twitter', label: 'X / Twitter Accounts', icon: <Twitter className="h-5 w-5" />, desc: 'Monitor official RFMO and regulatory accounts for announcements' },
  { id: 'pdf_upload', label: 'PDF / Document Upload', icon: <FileText className="h-5 w-5" />, desc: 'Upload regulatory PDFs, circulars, and documents for AI extraction' },
  { id: 'api', label: 'Custom API', icon: <Wifi className="h-5 w-5" />, desc: 'Connect any REST/JSON API endpoint that publishes regulatory data' },
];

// ─── Component ───
const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');

  // Fleet state
  const [orgName, setOrgName] = useState('');
  const [vessels, setVessels] = useState<{ name: string; flag: string }[]>([
    { name: '', flag: '' },
  ]);

  // Zones & species
  const [selectedRfmos, setSelectedRfmos] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);

  // Sources
  const [enabledSources, setEnabledSources] = useState<string[]>(['rfmo_crawl']);
  const [rssFeedUrl, setRssFeedUrl] = useState('');
  const [rssFeeds, setRssFeeds] = useState<string[]>([]);
  const [twitterHandles, setTwitterHandles] = useState<string[]>([]);
  const [twitterInput, setTwitterInput] = useState('');
  const [emailForward, setEmailForward] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');

  // Channels
  const [channels, setChannels] = useState({ email: true, sms: false, whatsapp: false, push: true });

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((stepIndex) / (STEPS.length - 1)) * 100;

  const next = () => {
    const i = STEPS.findIndex(s => s.id === currentStep);
    if (i < STEPS.length - 1) setCurrentStep(STEPS[i + 1].id);
  };
  const prev = () => {
    const i = STEPS.findIndex(s => s.id === currentStep);
    if (i > 0) setCurrentStep(STEPS[i - 1].id);
  };

  const toggleRfmo = (id: string) => {
    setSelectedRfmos(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    // Auto-select zones
    const rfmo = RFMO_ZONES.find(r => r.id === id);
    if (rfmo && !selectedRfmos.includes(id)) {
      setSelectedZones(prev => [...new Set([...prev, ...rfmo.zones])]);
    }
  };

  const toggleZone = (z: string) => setSelectedZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);
  const toggleSpecies = (s: string) => setSelectedSpecies(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleSource = (id: string) => setEnabledSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const addVessel = () => setVessels(prev => [...prev, { name: '', flag: '' }]);
  const removeVessel = (i: number) => setVessels(prev => prev.filter((_, idx) => idx !== i));
  const updateVessel = (i: number, field: 'name' | 'flag', value: string) => {
    setVessels(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  };

  const addRssFeed = () => {
    if (rssFeedUrl.trim()) {
      setRssFeeds(prev => [...prev, rssFeedUrl.trim()]);
      setRssFeedUrl('');
    }
  };
  const addTwitter = () => {
    if (twitterInput.trim()) {
      setTwitterHandles(prev => [...prev, twitterInput.trim().replace(/^@/, '')]);
      setTwitterInput('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
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
          {currentStep !== 'welcome' && currentStep !== 'launch' && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground">
                Step {stepIndex} of {STEPS.length - 2}
              </span>
              <Progress value={progress} className="w-32 h-1.5 bg-secondary/30" />
            </div>
          )}
        </div>
      </header>

      {/* Step indicators */}
      {currentStep !== 'welcome' && currentStep !== 'launch' && (
        <div className="border-b border-border bg-card/40 px-6 py-2 flex-shrink-0">
          <div className="flex items-center gap-1 max-w-3xl mx-auto">
            {STEPS.filter(s => s.id !== 'welcome' && s.id !== 'launch').map((s, i) => {
              const si = STEPS.findIndex(st => st.id === s.id);
              const isActive = si === stepIndex;
              const isDone = si < stepIndex;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => si <= stepIndex && setCurrentStep(s.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : isDone
                          ? 'text-success cursor-pointer hover:bg-success/10'
                          : 'text-muted-foreground/40'
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < 3 && <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-success/40' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* ─── Welcome ─── */}
          {currentStep === 'welcome' && (
            <div className="text-center space-y-8 py-12">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
                <Anchor className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  Welcome to MARE<span className="text-primary">WATCH</span>
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Let's set up your compliance intelligence system. We'll configure your fleet, zones,
                  data sources, and notification preferences in just a few minutes.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                {[
                  { icon: <Ship className="h-4 w-4" />, text: 'Define your fleet & vessels' },
                  { icon: <Globe2 className="h-4 w-4" />, text: 'Select zones & species' },
                  { icon: <Database className="h-4 w-4" />, text: 'Connect data sources' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
                    <div className="text-primary">{item.icon}</div>
                    <span className="text-xs text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── Fleet ─── */}
          {currentStep === 'fleet' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Ship className="h-5 w-5 text-primary" /> Your Fleet
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us about your organization and vessels.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Organization Name</label>
                <input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Pacific Fleet Management Ltd."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Vessels</label>
                  <button onClick={addVessel} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                    <Plus className="h-3 w-3" /> Add vessel
                  </button>
                </div>
                {vessels.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={v.name}
                      onChange={e => updateVessel(i, 'name', e.target.value)}
                      placeholder="Vessel name"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <input
                      value={v.flag}
                      onChange={e => updateVessel(i, 'flag', e.target.value)}
                      placeholder="Flag (e.g. 🇵🇦)"
                      className="w-28 px-3 py-2 rounded-lg border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {vessels.length > 1 && (
                      <button onClick={() => removeVessel(i)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Zones & Species ─── */}
          {currentStep === 'zones' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Zones & Species
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Select the RFMOs, zones, and species relevant to your fleet. Only matching alerts will be surfaced.</p>
              </div>

              {/* RFMOs */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">RFMOs You Operate Under</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RFMO_ZONES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggleRfmo(r.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRfmos.includes(r.id)
                          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:border-border hover:bg-secondary/20'
                      }`}
                    >
                      <p className={`text-xs font-bold ${selectedRfmos.includes(r.id) ? 'text-primary' : 'text-foreground'}`}>{r.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{r.region}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zones */}
              {selectedRfmos.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Specific Zones</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RFMO_ZONES.filter(r => selectedRfmos.includes(r.id)).flatMap(r => r.zones).map(z => (
                      <button
                        key={z}
                        onClick={() => toggleZone(z)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                          selectedZones.includes(z)
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Species */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Target Species</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIES_LIST.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSpecies(s)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                        selectedSpecies.includes(s)
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      <Fish className="h-3 w-3" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Data Sources ─── */}
          {currentStep === 'sources' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" /> Data Sources
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Connect the feeds and sources MAREWATCH should monitor. Toggle on what you use — configure details after setup.</p>
              </div>

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
                          }`}>
                            {src.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {src.label}
                              {src.pre && <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/15 text-success font-mono">PRE-CONFIGURED</span>}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{src.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleSource(src.id)}
                          className="data-[state=checked]:bg-primary flex-shrink-0"
                        />
                      </div>

                      {/* Inline config for enabled sources */}
                      {enabled && src.id === 'rss' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={rssFeedUrl}
                              onChange={e => setRssFeedUrl(e.target.value)}
                              placeholder="https://rfmo.org/feed.xml"
                              className="flex-1 px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                              onKeyDown={e => e.key === 'Enter' && addRssFeed()}
                            />
                            <button onClick={addRssFeed} className="px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                              Add
                            </button>
                          </div>
                          {rssFeeds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rssFeeds.map((f, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/30 text-[10px] font-mono text-muted-foreground">
                                  <Rss className="h-2.5 w-2.5" />
                                  {f.length > 40 ? f.slice(0, 40) + '…' : f}
                                  <button onClick={() => setRssFeeds(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {enabled && src.id === 'twitter' && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={twitterInput}
                              onChange={e => setTwitterInput(e.target.value)}
                              placeholder="@IATTC_official"
                              className="flex-1 px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                              onKeyDown={e => e.key === 'Enter' && addTwitter()}
                            />
                            <button onClick={addTwitter} className="px-3 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                              Add
                            </button>
                          </div>
                          {twitterHandles.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {twitterHandles.map((h, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/30 text-[10px] font-mono text-muted-foreground">
                                  @{h}
                                  <button onClick={() => setTwitterHandles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
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
                            <span className="text-[11px] font-mono text-foreground">ingest-{orgName ? orgName.toLowerCase().replace(/\s+/g, '') : 'yourorg'}@marewatch.io</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">Forward emails here</span>
                          </div>
                        </div>
                      )}

                      {enabled && src.id === 'api' && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <input
                            value={apiEndpoint}
                            onChange={e => setApiEndpoint(e.target.value)}
                            placeholder="https://api.example.com/v1/regulations"
                            className="w-full px-3 py-1.5 rounded-md border border-border bg-secondary/20 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Channels ─── */}
          {currentStep === 'channels' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notification Channels
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to receive compliance alerts. You can fine-tune per alert category later.</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'email' as const, label: 'Email', icon: <Mail className="h-5 w-5" />, desc: 'Detailed digests and critical alert emails' },
                  { key: 'sms' as const, label: 'SMS', icon: <Smartphone className="h-5 w-5" />, desc: 'Instant text messages for critical & time-sensitive alerts' },
                  { key: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="h-5 w-5" />, desc: 'Rich notifications with images and read receipts' },
                  { key: 'push' as const, label: 'In-App Push', icon: <Bell className="h-5 w-5" />, desc: 'Real-time notifications inside MAREWATCH' },
                ].map(ch => (
                  <div key={ch.key} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    channels[ch.key] ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        channels[ch.key] ? 'bg-primary/15 text-primary' : 'bg-secondary/30 text-muted-foreground'
                      }`}>
                        {ch.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{ch.label}</p>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={channels[ch.key]}
                      onCheckedChange={() => setChannels(prev => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Smart Routing Available</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      After setup, you can configure per-category routing in the <span className="text-primary font-medium">Comm</span> tab — e.g. "Send quota changes to email, closures to SMS immediately."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Launch ─── */}
          {currentStep === 'launch' && (
            <div className="text-center space-y-8 py-12">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-success/10 border border-success/20 mx-auto">
                <Sparkles className="h-10 w-10 text-success" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">You're All Set</h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  MAREWATCH is now configured for your fleet. We'll start monitoring your selected sources and send alerts through your chosen channels.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left">
                {[
                  { label: 'Vessels', value: vessels.filter(v => v.name.trim()).length || '—' },
                  { label: 'Zones', value: selectedZones.length || '—' },
                  { label: 'Species', value: selectedSpecies.length || '—' },
                  { label: 'Sources', value: enabledSources.length },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{item.value}</p>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">{item.label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Launch MAREWATCH
                <Zap className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {currentStep !== 'welcome' && currentStep !== 'launch' && (
        <div className="border-t border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={prev}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {stepIndex === STEPS.length - 2 ? 'Finish' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
