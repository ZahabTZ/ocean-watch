import { getRfmoSources } from '@/data/liveData';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function SourcesGrid() {
  const sources = getRfmoSources();

  if (!sources.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">RFMO Sources</h2>
        <p className="text-xs text-muted-foreground">No live sources available until a fleet profile is configured.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
        RFMO Sources — {sources.length} Monitored
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2">
            <div className="flex-shrink-0">
              {source.status === 'online' && <Wifi className="h-3.5 w-3.5 text-success" />}
              {source.status === 'checking' && <Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />}
              {source.status === 'error' && <WifiOff className="h-3.5 w-3.5 text-destructive" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-primary">{source.acronym}</span>
                <span className="text-[10px] text-muted-foreground">{source.region}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {source.documentsIngested} docs
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  checked {source.lastChecked}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
