import { useState, useMemo } from 'react';
import { Shield, CheckCircle2, XCircle, Zap, TrendingUp, ChevronDown, ChevronUp, AlertTriangle, Clock, Anchor } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { CATEGORY_META, type AlertCategory } from '@/data/mockData';
import { useOnboarding } from '@/hooks/use-onboarding';
import { buildUserProfile } from '@/lib/userProfile';

interface RecommendedAction {
  id: string;
  category: AlertCategory;
  title: string;
  description: string;
  confidence: number; // 0-100
  criticality: 'critical' | 'high' | 'medium' | 'low';
  timeAgo: string;
  affectedVessels: string[];
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_ACTIONS: RecommendedAction[] = [
  {
    id: 'ra-1',
    category: 'quota',
    title: 'Recalculate vessel allocations for EPO-3 bigeye tuna',
    description: 'IATTC reduced quota by 8%. Redistributing across MV Pacific Harvester and FV Blue Meridian to stay compliant before March 10 deadline.',
    confidence: 94,
    criticality: 'critical',
    timeAgo: '12m ago',
    affectedVessels: ['MV Pacific Harvester', 'FV Blue Meridian'],
    status: 'pending',
  },
  {
    id: 'ra-2',
    category: 'closure',
    title: 'Redirect FV Southern Explorer from Area 48.1',
    description: 'CCAMLR closure begins March 20. Recommend rerouting to Area 48.2 where krill harvesting remains open. Alternate route calculated.',
    confidence: 89,
    criticality: 'critical',
    timeAgo: '34m ago',
    affectedVessels: ['FV Southern Explorer'],
    status: 'pending',
  },
  {
    id: 'ra-3',
    category: 'reporting',
    title: 'Auto-submit VMS frequency update to transponders',
    description: 'WCPFC requires 2-hour polling intervals starting April 1. Firmware push ready for MV Pacific Harvester transponder.',
    confidence: 97,
    criticality: 'medium',
    timeAgo: '1h ago',
    affectedVessels: ['MV Pacific Harvester'],
    status: 'pending',
  },
  {
    id: 'ra-4',
    category: 'quota',
    title: 'Reduce IO-4 yellowfin catch rate by 15%',
    description: 'IOTC quota cut of 12% means current catch rate will exceed limit by March 18. Recommending daily limit adjustment across 3 vessels.',
    confidence: 86,
    criticality: 'high',
    timeAgo: '2h ago',
    affectedVessels: ['FV Ocean Spirit', 'MV Coral Runner', 'FV Deep Blue'],
    status: 'pending',
  },
  {
    id: 'ra-5',
    category: 'penalties',
    title: 'File pre-compliance report for NA-2 swordfish bycatch',
    description: 'Bycatch at 87% utilization. Filing early compliance report reduces penalty risk if threshold is crossed unexpectedly.',
    confidence: 72,
    criticality: 'medium',
    timeAgo: '3h ago',
    affectedVessels: ['FV Atlantic Prize', 'MV Northern Star'],
    status: 'pending',
  },
  {
    id: 'ra-6',
    category: 'species_status',
    title: 'Update gear restriction protocols for blue shark',
    description: 'New ICCAT measure restricts wire leaders in NA-2. Recommend notifying vessel captains and updating onboard compliance docs.',
    confidence: 81,
    criticality: 'low',
    timeAgo: '5h ago',
    affectedVessels: ['FV Atlantic Prize'],
    status: 'pending',
  },
];

const criticalityConfig = {
  critical: { label: 'CRITICAL', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  high: { label: 'HIGH', className: 'bg-warning/15 text-warning border-warning/30' },
  medium: { label: 'MEDIUM', className: 'bg-primary/15 text-primary border-primary/30' },
  low: { label: 'LOW', className: 'bg-muted text-muted-foreground border-border' },
};

const confidenceColor = (score: number) => {
  if (score >= 90) return 'text-success';
  if (score >= 75) return 'text-primary';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
};

export const CommPanel = () => {
  const { data: onboardingData } = useOnboarding();
  const profile = useMemo(() => onboardingData ? buildUserProfile(onboardingData) : null, [onboardingData]);

  const filteredInitial = useMemo(() => {
    if (!profile || profile.vesselNames.length === 0) return INITIAL_ACTIONS;
    const filtered = INITIAL_ACTIONS.filter(a =>
      a.affectedVessels.some(v => profile.vesselNames.includes(v))
    );
    return filtered.length > 0 ? filtered : INITIAL_ACTIONS;
  }, [profile]);

  const [actions, setActions] = useState(filteredInitial);
  const [autonomy, setAutonomy] = useState([25]); // 0-100
  const [showAutonomySlider, setShowAutonomySlider] = useState(false);

  const totalDecided = actions.filter(a => a.status !== 'pending').length;
  const totalApproved = actions.filter(a => a.status === 'approved').length;
  const approvalRate = totalDecided > 0 ? Math.round((totalApproved / totalDecided) * 100) : 0;
  const pendingCount = actions.filter(a => a.status === 'pending').length;

  const autonomyLabel = (val: number) => {
    if (val <= 15) return 'Manual — all actions require approval';
    if (val <= 40) return 'Low — only routine actions auto-execute';
    if (val <= 65) return 'Moderate — high-confidence actions auto-execute';
    if (val <= 85) return 'High — most actions auto-execute';
    return 'Full Autonomy — AI acts independently';
  };

  const autonomyColor = (val: number) => {
    if (val <= 15) return 'text-muted-foreground';
    if (val <= 40) return 'text-primary';
    if (val <= 65) return 'text-warning';
    if (val <= 85) return 'text-warning';
    return 'text-destructive';
  };

  const handleAction = (id: string, decision: 'approved' | 'rejected') => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: decision } : a));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Metrics Bar */}
      <div className="border-b border-border px-4 py-3 flex-shrink-0 space-y-3">
        {/* Stats Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Approval Rate */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">Approval Rate</span>
              <span className={`text-sm font-mono font-bold ${totalDecided === 0 ? 'text-muted-foreground' : approvalRate >= 80 ? 'text-success' : approvalRate >= 60 ? 'text-warning' : 'text-destructive'}`}>
                {totalDecided === 0 ? '—' : `${approvalRate}%`}
              </span>
              {totalDecided > 0 && (
                <Progress value={approvalRate} className="h-1.5 w-20 bg-secondary/30" />
              )}
            </div>

            {/* Pending Count */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-mono text-muted-foreground">
                {pendingCount} pending
              </span>
            </div>

            {/* Decided Count */}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-mono text-muted-foreground">
                {totalApproved}✓ {totalDecided - totalApproved}✗
              </span>
            </div>
          </div>

          {/* Autonomy Toggle Button */}
          <button
            onClick={() => setShowAutonomySlider(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
              showAutonomySlider
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-secondary/30 text-muted-foreground border-border hover:text-foreground hover:border-primary/20'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            AI Autonomy
            {showAutonomySlider ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Autonomy Slider (collapsible) */}
        {showAutonomySlider && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${autonomyColor(autonomy[0])}`} />
                <span className="text-sm font-semibold text-foreground">Trust Level</span>
              </div>
              <span className={`text-sm font-mono font-bold ${autonomyColor(autonomy[0])}`}>
                {autonomy[0]}%
              </span>
            </div>

            <Slider
              value={autonomy}
              onValueChange={setAutonomy}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />

            {/* Scale Labels */}
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>No Autonomy</span>
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Full Auto</span>
            </div>

            <p className={`text-[11px] font-mono ${autonomyColor(autonomy[0])}`}>
              {autonomyLabel(autonomy[0])}
            </p>
          </div>
        )}
      </div>

      {/* Action List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
            <Anchor className="h-3.5 w-3.5" />
            Recommended Actions
          </h3>

          {actions.map(action => {
            const crit = criticalityConfig[action.criticality];
            const catMeta = CATEGORY_META[action.category];
            const isPending = action.status === 'pending';

            return (
              <div
                key={action.id}
                className={`rounded-lg border bg-card p-4 transition-all ${
                  !isPending ? 'opacity-60' : 'border-border hover:border-primary/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{catMeta.icon}</span>
                    <h4 className="text-sm font-semibold text-foreground truncate">{action.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Criticality Badge */}
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${crit.className}`}>
                      {crit.label}
                    </span>
                    {/* Status Badge */}
                    {!isPending && (
                      <span className={`flex items-center gap-1 text-[10px] font-mono font-bold ${
                        action.status === 'approved' ? 'text-success' : 'text-destructive'
                      }`}>
                        {action.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {action.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{action.description}</p>

                {/* Meta Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    {/* Confidence Score */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">AI Confidence:</span>
                      <span className={`font-bold ${confidenceColor(action.confidence)}`}>{action.confidence}%</span>
                      <div className="w-12 h-1.5 rounded-full bg-secondary/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            action.confidence >= 90 ? 'bg-success' : action.confidence >= 75 ? 'bg-primary' : action.confidence >= 60 ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${action.confidence}%` }}
                        />
                      </div>
                    </div>

                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{catMeta.label}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{action.timeAgo}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{action.affectedVessels.length} vessel{action.affectedVessels.length > 1 ? 's' : ''}</span>
                  </div>

                  {/* Action Buttons */}
                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAction(action.id, 'rejected')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary/20 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-xs font-mono text-muted-foreground transition-all"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(action.id, 'approved')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-mono font-medium transition-all"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
