import { useState } from 'react';
import { Mail, MessageSquare, Smartphone, Bell, Shield, Zap, CheckCircle2, XCircle, ChevronRight, TrendingUp, Lock, Unlock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { CATEGORY_META, type AlertCategory } from '@/data/mockData';

type Channel = 'email' | 'sms' | 'whatsapp' | 'push';
type AutonomyStage = 'inform' | 'recommend' | 'auto';

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, description: 'Detailed alerts with attachments' },
  { id: 'sms', label: 'SMS', icon: <Smartphone className="h-4 w-4" />, description: 'Instant critical notifications' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" />, description: 'Rich media with read receipts' },
  { id: 'push', label: 'In-App Push', icon: <Bell className="h-4 w-4" />, description: 'Real-time in-app notifications' },
];

const AUTONOMY_STAGES: { id: AutonomyStage; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'inform', label: 'Inform', description: 'AI detects → sends alert → you decide', icon: <Bell className="h-4 w-4" /> },
  { id: 'recommend', label: 'Recommend', description: 'AI suggests action → you approve/reject', icon: <Shield className="h-4 w-4" /> },
  { id: 'auto', label: 'Auto-Execute', description: 'AI acts → notifies after → you can undo', icon: <Zap className="h-4 w-4" /> },
];

interface CategoryAutonomy {
  stage: AutonomyStage;
  approvalRate: number;
  totalDecisions: number;
  approved: number;
  rejected: number;
  autoEligible: boolean;
}

const INITIAL_AUTONOMY: Record<AlertCategory, CategoryAutonomy> = {
  quota: { stage: 'inform', approvalRate: 72, totalDecisions: 18, approved: 13, rejected: 5, autoEligible: false },
  closure: { stage: 'recommend', approvalRate: 91, totalDecisions: 23, approved: 21, rejected: 2, autoEligible: true },
  species_status: { stage: 'inform', approvalRate: 68, totalDecisions: 12, approved: 8, rejected: 4, autoEligible: false },
  reporting: { stage: 'auto', approvalRate: 96, totalDecisions: 47, approved: 45, rejected: 2, autoEligible: true },
  penalties: { stage: 'inform', approvalRate: 55, totalDecisions: 9, approved: 5, rejected: 4, autoEligible: false },
};

const INITIAL_ROUTING: Record<AlertCategory, Record<Channel, boolean>> = {
  quota: { email: true, sms: true, whatsapp: false, push: true },
  closure: { email: true, sms: true, whatsapp: true, push: true },
  species_status: { email: true, sms: false, whatsapp: false, push: true },
  reporting: { email: true, sms: false, whatsapp: false, push: false },
  penalties: { email: true, sms: true, whatsapp: true, push: true },
};

// Mock action log
const RECENT_ACTIONS = [
  { id: 1, category: 'reporting' as AlertCategory, action: 'Auto-submitted VMS frequency update to vessel transponders', stage: 'auto' as AutonomyStage, time: '2h ago', result: 'executed' },
  { id: 2, category: 'closure' as AlertCategory, action: 'Redirect FV Southern Explorer from Area 48.1 to Area 48.2', stage: 'recommend' as AutonomyStage, time: '4h ago', result: 'approved' },
  { id: 3, category: 'quota' as AlertCategory, action: 'Recalculate vessel allocations for EPO-3 bigeye tuna', stage: 'inform' as AutonomyStage, time: '6h ago', result: 'pending' },
  { id: 4, category: 'reporting' as AlertCategory, action: 'Filed monthly catch report CCAMLR-F26-02', stage: 'auto' as AutonomyStage, time: '1d ago', result: 'executed' },
  { id: 5, category: 'closure' as AlertCategory, action: 'Update navigation charts for Zone NA-2 seasonal closure', stage: 'recommend' as AutonomyStage, time: '1d ago', result: 'rejected' },
];

export const CommPanel = () => {
  const [routing, setRouting] = useState(INITIAL_ROUTING);
  const [autonomy, setAutonomy] = useState(INITIAL_AUTONOMY);
  const [activeSection, setActiveSection] = useState<'channels' | 'autonomy'>('autonomy');

  const toggleChannel = (category: AlertCategory, channel: Channel) => {
    setRouting(prev => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category][channel] },
    }));
  };

  const setStage = (category: AlertCategory, stage: AutonomyStage) => {
    if (stage === 'auto' && !autonomy[category].autoEligible) return;
    setAutonomy(prev => ({
      ...prev,
      [category]: { ...prev[category], stage },
    }));
  };

  const stageColor = (stage: AutonomyStage) => {
    switch (stage) {
      case 'inform': return 'text-primary';
      case 'recommend': return 'text-warning';
      case 'auto': return 'text-success';
    }
  };

  const stageBg = (stage: AutonomyStage) => {
    switch (stage) {
      case 'inform': return 'bg-primary/10 border-primary/20';
      case 'recommend': return 'bg-warning/10 border-warning/20';
      case 'auto': return 'bg-success/10 border-success/20';
    }
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case 'approved':
      case 'executed': return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Bell className="h-3.5 w-3.5 text-warning animate-pulse" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Section Toggle */}
      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('autonomy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeSection === 'autonomy' ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Autonomy Controls
          </button>
          <button
            onClick={() => setActiveSection('channels')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeSection === 'channels' ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Channel Routing
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-[1200px] mx-auto p-4 space-y-4">

          {activeSection === 'autonomy' && (
            <>
              {/* Autonomy Stage Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AUTONOMY_STAGES.map(s => (
                  <div key={s.id} className={`rounded-lg border p-3 ${stageBg(s.id)}`}>
                    <div className={`flex items-center gap-2 mb-1 ${stageColor(s.id)}`}>
                      {s.icon}
                      <span className="text-sm font-mono font-bold">{s.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                  </div>
                ))}
              </div>

              {/* Per-Category Autonomy Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground px-1">
                  Autonomy by Category
                </h3>
                {(Object.keys(CATEGORY_META) as AlertCategory[]).map(cat => {
                  const meta = CATEGORY_META[cat];
                  const auto = autonomy[cat];
                  return (
                    <div key={cat} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                            <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${stageBg(auto.stage)} ${stageColor(auto.stage)}`}>
                          {auto.stage === 'auto' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {auto.stage.toUpperCase()}
                        </div>
                      </div>

                      {/* Stage Selector */}
                      <div className="flex items-center gap-1 mb-3">
                        {AUTONOMY_STAGES.map((s, i) => {
                          const isActive = auto.stage === s.id;
                          const isLocked = s.id === 'auto' && !auto.autoEligible;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setStage(cat, s.id)}
                              disabled={isLocked}
                              className={`relative flex-1 py-1.5 rounded text-[10px] font-mono font-medium transition-all ${
                                isActive
                                  ? `${stageBg(s.id)} ${stageColor(s.id)} border`
                                  : isLocked
                                    ? 'bg-secondary/20 text-muted-foreground/40 cursor-not-allowed border border-transparent'
                                    : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                              }`}
                            >
                              {s.label}
                              {isLocked && <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 text-muted-foreground/30" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Trust Metrics */}
                      <div className="flex items-center gap-4 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 flex-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Approval rate:</span>
                          <span className={`font-bold ${auto.approvalRate >= 85 ? 'text-success' : auto.approvalRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                            {auto.approvalRate}%
                          </span>
                          <Progress
                            value={auto.approvalRate}
                            className="h-1.5 flex-1 max-w-[100px] bg-secondary/30"
                          />
                        </div>
                        <span className="text-muted-foreground">
                          {auto.approved}✓ {auto.rejected}✗ of {auto.totalDecisions}
                        </span>
                        {!auto.autoEligible && (
                          <span className="text-muted-foreground/60 italic">needs 85%+ to unlock auto</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Action Log */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
                  Recent Decisions
                </h3>
                <div className="space-y-2">
                  {RECENT_ACTIONS.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      {resultIcon(a.result)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{a.action}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{CATEGORY_META[a.category].icon} {CATEGORY_META[a.category].label}</span>
                          <span className={`text-[10px] font-mono ${stageColor(a.stage)}`}>{a.stage}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] font-mono font-bold ${
                          a.result === 'executed' ? 'text-success' : a.result === 'approved' ? 'text-success' : a.result === 'rejected' ? 'text-destructive' : 'text-warning'
                        }`}>{a.result}</span>
                        <p className="text-[9px] text-muted-foreground">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'channels' && (
            <>
              {/* Channel Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CHANNELS.map(ch => (
                  <div key={ch.id} className="rounded-lg border border-border bg-card p-3 flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      {ch.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{ch.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{ch.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Routing Matrix */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-3 border-b border-border">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Alert Routing Matrix
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Choose which channels receive each alert type</p>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr_repeat(4,64px)] items-center px-4 py-2 border-b border-border bg-secondary/20">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Category</span>
                  {CHANNELS.map(ch => (
                    <div key={ch.id} className="flex flex-col items-center gap-0.5">
                      <span className="text-muted-foreground">{ch.icon}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{ch.label}</span>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {(Object.keys(CATEGORY_META) as AlertCategory[]).map(cat => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat} className="grid grid-cols-[1fr_repeat(4,64px)] items-center px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{meta.label}</p>
                          <p className="text-[9px] text-muted-foreground hidden sm:block">{meta.description}</p>
                        </div>
                      </div>
                      {CHANNELS.map(ch => (
                        <div key={ch.id} className="flex justify-center">
                          <Switch
                            checked={routing[cat][ch.id]}
                            onCheckedChange={() => toggleChannel(cat, ch.id)}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Quick Presets */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Quick Presets</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Critical Only SMS', desc: 'SMS for quota + closure + penalties only' },
                    { label: 'Email Everything', desc: 'All categories to email' },
                    { label: 'Silent Mode', desc: 'In-app push only, no external channels' },
                    { label: 'Maximum Alert', desc: 'All channels for all categories' },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-colors text-xs text-foreground group"
                    >
                      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
