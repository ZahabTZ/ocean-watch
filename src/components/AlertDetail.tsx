import { ComplianceAlert, RAW_SOURCE_EXAMPLE } from '@/data/liveData';
import { getSeverityConfig } from '@/lib/alertUtils';
import { Badge } from '@/components/ui/badge';
import { Ship, Calendar, MapPin, Fish, FileText, ArrowRight, AlertCircle } from 'lucide-react';

interface AlertDetailProps {
  alert: ComplianceAlert;
}

export function AlertDetail({ alert }: AlertDetailProps) {
  const severity = getSeverityConfig(alert.severity);
  const SeverityIcon = severity.icon;

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className={`rounded-lg border p-4 ${severity.bgClassName}`}>
        <div className="flex items-center gap-2 mb-2">
          <SeverityIcon className={`h-5 w-5 ${severity.className}`} />
          <Badge variant="outline" className={`text-[10px] font-mono ${severity.badgeClassName}`}>
            {severity.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
            {alert.rfmo}
          </Badge>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{alert.title}</h2>
        <p className="text-sm text-muted-foreground">{alert.summary}</p>
      </div>

      {/* Key Details */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Fish, label: 'Species', value: alert.species },
          { icon: MapPin, label: 'Zone', value: alert.zone },
          { icon: Calendar, label: 'Effective', value: alert.effectiveDate },
          { icon: AlertCircle, label: 'Deadline', value: alert.actionDeadline },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono uppercase text-muted-foreground">{label}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* What Changed */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">What Changed</h3>
        <p className="text-sm text-foreground leading-relaxed">{alert.changeDetail}</p>
      </div>

      {/* Affected Vessels */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Affected Vessels ({alert.affectedVessels.length})
        </h3>
        <div className="space-y-2">
          {alert.affectedVessels.map((vessel) => (
            <div key={vessel} className="flex items-center gap-2 text-sm">
              <Ship className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">{vessel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Raw vs Processed */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-primary">Raw Source → Processed</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground block mb-1">RAW: Scraped RFMO source document</span>
            <div className="rounded-md bg-background/80 border border-border p-3 max-h-32 overflow-y-auto">
              <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {RAW_SOURCE_EXAMPLE.slice(0, 400)}...
              </pre>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-primary block mb-1">YOUR TOOL DELIVERS:</span>
            <div className={`rounded-md border p-3 ${severity.bgClassName}`}>
              <p className="text-sm text-foreground font-medium">{alert.summary}</p>
              <p className="text-xs text-muted-foreground mt-2">{alert.changeDetail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
