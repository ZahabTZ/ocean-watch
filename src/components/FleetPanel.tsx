import { getFleetVessels } from '@/data/liveData';
import { getVesselStatusConfig } from '@/lib/alertUtils';
import { Ship } from 'lucide-react';

export function FleetPanel() {
  const vessels = getFleetVessels();

  if (!vessels.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Fleet Status</h2>
        <p className="text-xs text-muted-foreground">No fleet profile found. Complete onboarding to load live fleet data.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Fleet Status</h2>
      <div className="space-y-2">
        {vessels.map((vessel) => {
          const statusCfg = getVesselStatusConfig(vessel.status);
          return (
            <div key={vessel.id} className="flex items-center gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2 hover:bg-secondary/40 transition-colors">
              <Ship className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{vessel.flag}</span>
                  <span className="text-xs font-medium text-foreground truncate">{vessel.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{vessel.zone}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{vessel.species[0]}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClassName}`} />
                <span className={`text-[10px] font-mono ${statusCfg.className}`}>{statusCfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
