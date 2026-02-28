import { useState, useMemo } from 'react';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { getSeverityConfig } from '@/lib/alertUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, AlertCircle, MapPin, Clock, ChevronRight, ChevronDown, ChevronUp,
  Ship, Fish, Calendar, Eye, Play, ArrowRight, TrendingUp, Gauge
} from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { buildUserProfile, filterAlerts, filterVessels } from '@/lib/userProfile';

interface DashboardViewProps {
  onSwitchToMap: () => void;
}

// Hardcoded quota percentages per species (no real tracking)
const SPECIES_QUOTA_USED: Record<string, number> = {
  'Bigeye Tuna': 78,
  'Yellowfin Tuna': 41,
  'Swordfish': 92,
  'Antarctic Krill': 23,
  'Skipjack': 56,
  'Albacore': 34,
  'Blue Marlin': 65,
};

// Full action queue — filtered at runtime
const ALL_ACTIONS = [
  { id: 'aq1', severity: 'critical' as const, title: 'Redirect FV Southern Explorer from Area 48.1', deadline: '6 days', actionLabel: 'Act Now', vessels: ['FV Southern Explorer'] },
  { id: 'aq2', severity: 'critical' as const, title: 'Recalculate EPO-3 bigeye vessel allocations', deadline: '10 days', actionLabel: 'Act Now', vessels: ['MV Pacific Harvester', 'FV Blue Meridian'] },
  { id: 'aq3', severity: 'warning' as const, title: 'Submit IO-4 quarterly catch report', deadline: '12 days', actionLabel: 'Start', vessels: ['FV Ocean Spirit', 'MV Coral Runner', 'FV Deep Blue'] },
  { id: 'aq4', severity: 'warning' as const, title: 'Update VMS firmware on MV Pacific Harvester', deadline: '25 days', actionLabel: 'Schedule', vessels: ['MV Pacific Harvester'] },
  { id: 'aq5', severity: 'info' as const, title: 'Review new ICCAT blue shark gear restrictions', deadline: 'No deadline', actionLabel: 'Read', vessels: ['FV Atlantic Prize', 'MV Northern Star'] },
];

function timeAgoLabel(publishedDate: string): { label: string; time: string } {
  const now = new Date();
  const pub = new Date(publishedDate);
  const diffMs = now.getTime() - pub.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return { label: 'Today', time: `${diffH}h ago` };
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return { label: 'Yesterday', time: '1d ago' };
  return { label: `${diffD} days ago`, time: `${diffD}d ago` };
}

export function DashboardView({ onSwitchToMap }: DashboardViewProps) {
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);
  const { data: onboardingData } = useOnboarding();

  const profile = useMemo(() => onboardingData ? buildUserProfile(onboardingData) : null, [onboardingData]);
  const userAlerts = useMemo(() => profile ? filterAlerts(MOCK_ALERTS, profile) : MOCK_ALERTS, [profile]);
  const userVessels = useMemo(() => profile ? filterVessels(userVessels, profile) : userVessels, [profile]);

  // Derive timeline from filtered alerts
  const timelineItems = useMemo(() =>
    userAlerts.map(a => {
      const ta = timeAgoLabel(a.publishedDate);
      return { id: `t-${a.id}`, severity: a.severity, label: ta.label, text: a.title.replace(/ — .+$/, ''), alertId: a.id, time: ta.time };
    }),
  [userAlerts]);

  // Derive quotas from filtered vessels
  const quotaData = useMemo(() => {
    const seen = new Set<string>();
    const entries: { species: string; used: number; zone: string; warning: boolean }[] = [];
    userVessels.forEach(v => {
      v.species.forEach(sp => {
        const key = `${sp}|${v.zone}`;
        if (seen.has(key)) return;
        seen.add(key);
        const used = SPECIES_QUOTA_USED[sp] ?? 50;
        entries.push({ species: sp, used, zone: v.zone, warning: used >= 90 });
      });
    });
    return entries;
  }, [userVessels]);

  // Filter action queue by user vessels
  const actionQueue = useMemo(() => {
    if (!profile || profile.vesselNames.length === 0) return ALL_ACTIONS;
    const vesselSet = new Set(userVessels.map(v => v.name));
    const filtered = ALL_ACTIONS.filter(a => a.vessels.some(v => vesselSet.has(v)));
    return filtered.length > 0 ? filtered : ALL_ACTIONS;
  }, [profile, userVessels]);

  const criticalCount = userAlerts.filter(a => a.severity === 'critical').length;
  const actionCount = userAlerts.filter(a => a.status === 'action_required').length;
  const zonesAffected = new Set(userAlerts.filter(a => a.status === 'action_required').map(a => a.zone)).size;

  // Compliance score from vessels
  const complianceScore = userVessels.length > 0
    ? Math.round((userVessels.filter(v => v.status === 'compliant').length / userVessels.length) * 100)
    : 100;
  const avgQuotaUsed = quotaData.length > 0 ? Math.round(quotaData.reduce((s, q) => s + q.used, 0) / quotaData.length) : 0;
  const nextDeadlineDays = useMemo(() => {
    const now = new Date();
    const deadlines = userAlerts
      .filter(a => a.status === 'action_required' && a.actionDeadline)
      .map(a => Math.max(0, Math.ceil((new Date(a.actionDeadline).getTime() - now.getTime()) / 86_400_000)));
    return deadlines.length > 0 ? Math.min(...deadlines) : 0;
  }, [userAlerts]);

  const scoreColor = complianceScore >= 90 ? 'text-success' : complianceScore >= 70 ? 'text-warning' : 'text-destructive';
  const scoreBg = complianceScore >= 90 ? 'bg-success/10 border-success/20' : complianceScore >= 70 ? 'bg-warning/10 border-warning/20' : 'bg-destructive/10 border-destructive/20';
  const scoreDot = complianceScore >= 90 ? 'bg-success' : complianceScore >= 70 ? 'bg-warning' : 'bg-destructive';

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">

        {/* ── Health Score Bar ── */}
        <div className={`rounded-xl border ${scoreBg} p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Gauge className={`h-6 w-6 ${scoreColor}`} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-mono font-bold ${scoreColor}`}>{complianceScore}</span>
                  <span className="text-sm text-muted-foreground font-mono">/100</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">Compliance Score</p>
              </div>
            </div>
            <div className={`h-2 w-2 rounded-full ${scoreDot} animate-pulse-glow`} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/60 border border-border">
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-mono text-muted-foreground">
              <span className="text-warning font-bold">{actionCount} actions</span> needed this week
            </span>
          </div>
        </div>

        {/* ── Row 1: The Numbers ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Active Alerts"
            value={`${criticalCount}`}
            badge="Critical"
            type="destructive"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Quota Used"
            value={`${avgQuotaUsed}%`}
            badge="Avg"
            type="warning"
          />
          <StatCard
            icon={<MapPin className="h-4 w-4" />}
            label="Zones Affected"
            value={`${zonesAffected}`}
            badge="zones"
            type="primary"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Next Deadline"
            value={`${nextDeadlineDays}`}
            badge="days"
            type="destructive"
          />
        </div>

        {/* ── Row 2: Timeline + Mini Map ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Timeline Feed */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </h2>
            <div className="space-y-1">
              {timelineItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No alerts for your configuration</p>
              )}
              {timelineItems.map((item, i) => {
                const sev = getSeverityConfig(item.severity);
                const Icon = sev.icon;
                const isExpanded = expandedTimeline === item.id;
                const alert = userAlerts.find(a => a.id === item.alertId);

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setExpandedTimeline(isExpanded ? null : item.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isExpanded ? `${sev.bgClassName}` : 'hover:bg-secondary/30'
                      }`}
                    >
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          item.severity === 'critical' ? 'bg-destructive' :
                          item.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                        }`} />
                        {i < timelineItems.length - 1 && (
                          <div className="w-px h-3 bg-border" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{item.label}</span>
                          <span className="text-xs text-foreground truncate">{item.text}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{item.time}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && alert && (
                      <div className={`ml-8 mr-2 mb-2 p-3 rounded-lg border ${sev.bgClassName} animate-in slide-in-from-top-1 duration-150`}>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{alert.summary}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Fish className="h-3 w-3" /> {alert.species}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {alert.zone}</span>
                          <span className="flex items-center gap-1"><Ship className="h-3 w-3" /> {alert.affectedVessels.length} vessels</span>
                        </div>
                        {alert.changeDetail && (
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{alert.changeDetail}</p>
                        )}
                        <button className="mt-2 flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors">
                          View Full Detail <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini Map */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="p-4 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Fleet Now
              </h2>
              <button
                onClick={onSwitchToMap}
                className="flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
              >
                Full Map <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {/* Mini fleet visualization */}
            <div className="flex-1 min-h-[220px] relative bg-background/50 m-3 mt-0 rounded-lg border border-border overflow-hidden">
              {/* Stylized mini map background */}
              <div className="absolute inset-0 opacity-20">
                <svg viewBox="0 0 400 250" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                  {/* Ocean grid lines */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 35} x2="400" y2={i * 35} stroke="hsl(185 70% 50%)" strokeWidth="0.5" opacity="0.3" />
                  ))}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 35} y1="0" x2={i * 35} y2="250" stroke="hsl(185 70% 50%)" strokeWidth="0.5" opacity="0.3" />
                  ))}
                  {/* Simplified landmasses */}
                  <path d="M50,40 Q80,35 110,50 L130,80 Q120,100 90,95 L60,70 Z" fill="hsl(220 18% 16%)" opacity="0.6" />
                  <path d="M200,30 Q240,25 280,45 L290,90 Q270,110 230,100 L200,60 Z" fill="hsl(220 18% 16%)" opacity="0.6" />
                  <path d="M300,120 Q340,115 370,140 L360,180 Q340,190 310,175 Z" fill="hsl(220 18% 16%)" opacity="0.6" />
                </svg>
              </div>

              {/* Vessel dots */}
              {userVessels.map((v, i) => {
                const positions = [
                  { x: 65, y: 45 }, { x: 72, y: 52 }, { x: 55, y: 60 },
                  { x: 52, y: 68 }, { x: 48, y: 55 }, { x: 30, y: 80 },
                  { x: 80, y: 35 }, { x: 85, y: 30 },
                ];
                const pos = positions[i] || { x: 50, y: 50 };
                const color = v.status === 'at_risk' ? 'bg-destructive' : v.status === 'action_needed' ? 'bg-warning' : 'bg-success';
                return (
                  <div
                    key={v.id}
                    className={`absolute h-2.5 w-2.5 rounded-full ${color} ${v.status === 'at_risk' ? 'animate-pulse-glow' : ''}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    title={`${v.flag} ${v.name}`}
                  />
                );
              })}

              {/* Zone highlights */}
              <div className="absolute top-[35%] left-[40%] w-20 h-16 rounded border border-destructive/40 bg-destructive/10" title="EPO-3" />
              <div className="absolute top-[50%] left-[60%] w-16 h-14 rounded border border-warning/40 bg-warning/10" title="IO-4" />
            </div>

            {/* Fleet legend */}
            <div className="px-4 pb-3 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> At Risk</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Action</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> OK</span>
              <span className="ml-auto">{userVessels.length} vessels tracked</span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Quota Tracker ── */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Quota Tracker
          </h2>
          <div className="space-y-3">
            {quotaData.map(q => (
              <div key={q.species} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Fish className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{q.species}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{q.zone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${
                      q.used >= 90 ? 'text-destructive' : q.used >= 70 ? 'text-warning' : 'text-primary'
                    }`}>
                      {q.used}%
                    </span>
                    {q.warning && <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse-glow" />}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      q.used >= 90 ? 'bg-destructive' : q.used >= 70 ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${q.used}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: Action Queue ── */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Action Queue — Prioritized
          </h2>
          <div className="space-y-2">
            {actionQueue.map(action => {
              const sevConfig = getSeverityConfig(action.severity);
              const Icon = sevConfig.icon;
              return (
                <div
                  key={action.id}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:border-primary/20 ${sevConfig.bgClassName}`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${sevConfig.className}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{action.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-[10px] font-mono ${
                        action.severity === 'critical' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {action.deadline}
                      </span>
                    </div>
                  </div>
                  <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all border flex-shrink-0 ${
                    action.severity === 'critical'
                      ? 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25'
                      : action.severity === 'warning'
                        ? 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25'
                        : 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                  }`}>
                    {action.severity === 'critical' ? <Play className="h-3 w-3" /> :
                     action.severity === 'warning' ? <ArrowRight className="h-3 w-3" /> :
                     <Eye className="h-3 w-3" />}
                    {action.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Stat Card sub-component ──
function StatCard({ icon, label, value, badge, type }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge: string;
  type: 'primary' | 'warning' | 'destructive' | 'success';
}) {
  const colors = {
    primary: { text: 'text-primary', bg: 'bg-primary/5 border-primary/20', glow: 'glow-primary' },
    warning: { text: 'text-warning', bg: 'bg-warning/5 border-warning/20', glow: 'glow-warning' },
    destructive: { text: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20', glow: 'glow-destructive' },
    success: { text: 'text-success', bg: 'bg-success/5 border-success/20', glow: 'glow-success' },
  };
  const c = colors[type];

  return (
    <div className={`rounded-xl border ${c.bg} ${c.glow} p-4 animate-slide-in`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={c.text}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-mono font-bold ${c.text}`}>{value}</span>
        <span className="text-xs font-mono text-muted-foreground">{badge}</span>
      </div>
    </div>
  );
}
