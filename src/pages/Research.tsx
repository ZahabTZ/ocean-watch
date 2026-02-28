import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Search, Filter, Ship, MapPin, Calendar, Star, Send, ChevronRight, CheckCircle, AlertCircle, XCircle, Microscope, ArrowLeft, MessageSquare, X, Wrench, Shield, Clock, Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VESSEL_CAPABILITIES, ALL_EQUIPMENT, ALL_REGIONS, MISSION_TYPES, VesselCapability } from '@/data/researchData';

type Tab = 'discover' | 'matches' | 'messages';

interface MissionBrief {
  region: string;
  equipment: string[];
  missionType: string;
  dateRange: string;
  budget: string;
}

function scoreMatch(vessel: VesselCapability, brief: MissionBrief): { score: number; level: 'high' | 'partial' | 'low' } {
  let score = 0;
  const maxScore = 100;

  // Region match (40 points)
  if (brief.region && vessel.operatingRegion === brief.region) score += 40;
  else if (brief.region) score += 0;
  else score += 20;

  // Equipment match (40 points)
  if (brief.equipment.length > 0) {
    const matched = brief.equipment.filter(e => vessel.equipment.includes(e)).length;
    score += Math.round((matched / brief.equipment.length) * 40);
  } else {
    score += 20;
  }

  // Availability (10 points)
  score += 10;

  // Verified bonus (10 points)
  if (vessel.verified) score += 10;

  const level = score >= 70 ? 'high' : score >= 40 ? 'partial' : 'low';
  return { score, level };
}

function VesselPassport({ vessel, onContact, onClose }: { vessel: VesselCapability; onContact: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold font-mono text-foreground">{vessel.flag} {vessel.vesselName}</h2>
            {vessel.verified && <Badge className="text-[9px] bg-success/20 text-success border-success/30">Verified</Badge>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MapPin, label: 'Operating Region', value: vessel.operatingRegion },
                { icon: MapPin, label: 'Home Port', value: vessel.homePort },
                { icon: Ruler, label: 'Deck Space', value: vessel.deckSpace },
                { icon: Clock, label: 'Endurance', value: vessel.endurance },
              ].map(item => (
                <div key={item.label} className="bg-secondary/20 border border-border rounded-md p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <item.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] font-mono uppercase text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Equipment
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {vessel.equipment.map(e => (
                  <Badge key={e} variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{e}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Certifications
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {vessel.certifications.map(c => (
                  <Badge key={c} variant="outline" className="text-[10px] font-mono border-success/30 text-success">{c}</Badge>
                ))}
              </div>
            </div>

            {vessel.pastMissions.length > 0 && (
              <div>
                <h3 className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-2">Past Missions</h3>
                <div className="space-y-1">
                  {vessel.pastMissions.map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 text-primary" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <h3 className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Availability Window
              </h3>
              <span className="text-xs font-medium text-foreground">{vessel.availableFrom} → {vessel.availableTo}</span>
            </div>

            <button
              onClick={onContact}
              className="w-full flex items-center justify-center gap-2 bg-primary/20 border border-primary/30 text-primary rounded-md px-4 py-2.5 text-xs font-mono hover:bg-primary/30 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send Collaboration Request
            </button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function ContactModal({ vessel, onClose }: { vessel: VesselCapability; onClose: () => void }) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-success mx-auto" />
          <h2 className="text-sm font-bold text-foreground">Request Sent!</h2>
          <p className="text-xs text-muted-foreground">Your collaboration request has been sent to {vessel.vesselName}. You'll be notified when they respond.</p>
          <button onClick={onClose} className="bg-primary/20 border border-primary/30 text-primary rounded-md px-4 py-2 text-xs font-mono hover:bg-primary/30 transition-colors">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold font-mono text-foreground">Contact {vessel.vesselName}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Mission Summary</label>
            <textarea className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono min-h-[80px]" placeholder="Describe your research mission, objectives, and what you need from this vessel..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Dates Needed</label>
              <input className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" placeholder="e.g. April–May 2026" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Budget Range</label>
              <input className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" placeholder="e.g. $80k–$120k" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Team Size</label>
            <input className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" placeholder="e.g. 6 scientists" />
          </div>
          <button
            onClick={() => setSent(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary/20 border border-primary/30 text-primary rounded-md px-4 py-2.5 text-xs font-mono hover:bg-primary/30 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Research() {
  const [tab, setTab] = useState<Tab>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<VesselCapability | null>(null);
  const [contactVessel, setContactVessel] = useState<VesselCapability | null>(null);
  const [missionBrief, setMissionBrief] = useState<MissionBrief>({ region: '', equipment: [], missionType: '', dateRange: '', budget: '' });
  const [showMatches, setShowMatches] = useState(false);

  const filteredVessels = VESSEL_CAPABILITIES.filter(v => {
    if (!v.discoverable) return false;
    if (searchQuery && !v.vesselName.toLowerCase().includes(searchQuery.toLowerCase()) && !v.operatingRegion.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedRegion && v.operatingRegion !== selectedRegion) return false;
    if (selectedEquipment.length > 0 && !selectedEquipment.some(e => v.equipment.includes(e))) return false;
    return true;
  });

  const matchedVessels = VESSEL_CAPABILITIES
    .filter(v => v.discoverable)
    .map(v => ({ ...v, ...scoreMatch(v, missionBrief) }))
    .sort((a, b) => b.score - a.score);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm z-50 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono">MAREWATCH</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-accent/10 border border-accent/20">
                <Microscope className="h-3.5 w-3.5 text-accent" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-foreground">
                  RESEARCH <span className="text-primary">PORTAL</span>
                </h1>
                <p className="text-[9px] font-mono text-muted-foreground tracking-wider">VESSEL DISCOVERY & COLLABORATION</p>
              </div>
            </div>
          </div>

          <div className="flex items-center rounded-md border border-border bg-secondary/30 p-0.5">
            {([
              { key: 'discover' as Tab, label: 'Discover', icon: Search },
              { key: 'matches' as Tab, label: 'Match', icon: Star },
              { key: 'messages' as Tab, label: 'Messages', icon: MessageSquare },
            ]).map(v => (
              <button
                key={v.key}
                onClick={() => setTab(v.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  tab === v.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <v.icon className="h-3 w-3" />
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'discover' && (
          <div className="h-full flex flex-col">
            {/* Search & Filters */}
            <div className="flex-shrink-0 border-b border-border bg-card/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search vessels by name, region, or capability..."
                    className="w-full bg-secondary/30 border border-border rounded-md pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                  />
                </div>
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  className="bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                >
                  <option value="">All Regions</option>
                  {ALL_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="h-3 w-3 text-muted-foreground" />
                {ALL_EQUIPMENT.slice(0, 8).map(eq => (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      selectedEquipment.includes(eq) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Vessel Grid */}
            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVessels.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVessel(v)}
                    className="text-left bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-card/80 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">{v.flag} {v.vesselName}</span>
                      </div>
                      {v.verified && <Badge className="text-[8px] bg-success/20 text-success border-success/30">✓ Verified</Badge>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{v.operatingRegion}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {v.equipment.slice(0, 3).map(e => (
                          <Badge key={e} variant="outline" className="text-[9px] font-mono border-border text-muted-foreground">{e}</Badge>
                        ))}
                        {v.equipment.length > 3 && (
                          <Badge variant="outline" className="text-[9px] font-mono border-border text-muted-foreground">+{v.equipment.length - 3}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Available: {v.availableFrom} → {v.availableTo}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View Capability Passport</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {tab === 'matches' && (
          <div className="h-full flex flex-col">
            {/* Mission Brief Form */}
            {!showMatches ? (
              <ScrollArea className="flex-1">
                <div className="max-w-lg mx-auto p-6 space-y-4">
                  <div className="text-center mb-6">
                    <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h2 className="text-sm font-bold text-foreground">Mission Brief</h2>
                    <p className="text-[11px] text-muted-foreground mt-1">Tell us what you need and we'll find the best vessel matches</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground">Operating Region Needed</label>
                    <select
                      value={missionBrief.region}
                      onChange={e => setMissionBrief(b => ({ ...b, region: e.target.value }))}
                      className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">Any Region</option>
                      {ALL_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground">Equipment Required</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ALL_EQUIPMENT.map(eq => (
                        <button
                          key={eq}
                          onClick={() => setMissionBrief(b => ({
                            ...b,
                            equipment: b.equipment.includes(eq) ? b.equipment.filter(e => e !== eq) : [...b.equipment, eq]
                          }))}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-colors ${
                            missionBrief.equipment.includes(eq) ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {eq}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground">Mission Type</label>
                    <select
                      value={missionBrief.missionType}
                      onChange={e => setMissionBrief(b => ({ ...b, missionType: e.target.value }))}
                      className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">Select mission type</option>
                      {MISSION_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Date Range</label>
                      <input
                        value={missionBrief.dateRange}
                        onChange={e => setMissionBrief(b => ({ ...b, dateRange: e.target.value }))}
                        placeholder="e.g. April–May 2026"
                        className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Budget Range</label>
                      <input
                        value={missionBrief.budget}
                        onChange={e => setMissionBrief(b => ({ ...b, budget: e.target.value }))}
                        placeholder="e.g. $80k–$150k"
                        className="w-full mt-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMatches(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary/20 border border-primary/30 text-primary rounded-md px-4 py-3 text-xs font-mono font-bold hover:bg-primary/30 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    Find Matching Vessels
                  </button>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 border-b border-border bg-card/30 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">{matchedVessels.length} Vessels Ranked</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {missionBrief.region && `${missionBrief.region} · `}
                      {missionBrief.equipment.length > 0 && `${missionBrief.equipment.join(', ')}`}
                    </span>
                  </div>
                  <button onClick={() => setShowMatches(false)} className="text-[10px] font-mono text-primary hover:underline">Edit Brief</button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {matchedVessels.map((v, i) => {
                      const MatchIcon = v.level === 'high' ? CheckCircle : v.level === 'partial' ? AlertCircle : XCircle;
                      const matchColor = v.level === 'high' ? 'text-success' : v.level === 'partial' ? 'text-warning' : 'text-destructive';
                      const matchBg = v.level === 'high' ? 'border-success/20 bg-success/5' : v.level === 'partial' ? 'border-warning/20 bg-warning/5' : 'border-destructive/20 bg-destructive/5';
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVessel(v)}
                          className={`w-full text-left border rounded-lg p-4 hover:bg-card/80 transition-all ${matchBg}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                              <Ship className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold text-foreground">{v.flag} {v.vesselName}</span>
                              {v.verified && <Badge className="text-[8px] bg-success/20 text-success border-success/30">✓</Badge>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MatchIcon className={`h-3.5 w-3.5 ${matchColor}`} />
                              <span className={`text-xs font-mono font-bold ${matchColor}`}>{v.score}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                            <span>{v.operatingRegion}</span>
                            <span>·</span>
                            <span>{v.deckSpace}</span>
                            <span>·</span>
                            <span>{v.endurance}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {v.equipment.map(e => {
                              const isNeeded = missionBrief.equipment.includes(e);
                              return (
                                <Badge key={e} variant="outline" className={`text-[9px] font-mono ${isNeeded ? 'border-primary/40 text-primary' : 'border-border text-muted-foreground'}`}>{e}</Badge>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
              <h2 className="text-sm font-bold text-foreground">No Messages Yet</h2>
              <p className="text-xs text-muted-foreground max-w-xs">Send a collaboration request to a vessel owner to start a conversation.</p>
            </div>
          </div>
        )}
      </div>

      {selectedVessel && (
        <VesselPassport vessel={selectedVessel} onContact={() => { setContactVessel(selectedVessel); setSelectedVessel(null); }} onClose={() => setSelectedVessel(null)} />
      )}
      {contactVessel && <ContactModal vessel={contactVessel} onClose={() => setContactVessel(null)} />}
    </div>
  );
}
