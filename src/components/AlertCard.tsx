import { ComplianceAlert } from '@/data/mockData';
import { getSeverityConfig, getStatusConfig } from '@/lib/alertUtils';
import { Badge } from '@/components/ui/badge';
import { Ship, Calendar, MapPin, Fish, ChevronRight } from 'lucide-react';

interface AlertCardProps {
  alert: ComplianceAlert;
  isSelected: boolean;
  onClick: () => void;
}

export function AlertCard({ alert, isSelected, onClick }: AlertCardProps) {
  const severity = getSeverityConfig(alert.severity);
  const status = getStatusConfig(alert.status);
  const SeverityIcon = severity.icon;
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-4 transition-all duration-200 animate-slide-in ${
        isSelected
          ? `${severity.bgClassName} ${severity.glowClassName}`
          : 'border-border bg-card hover:bg-secondary/50 hover:border-muted-foreground/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${severity.className}`}>
          <SeverityIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-mono ${severity.badgeClassName}`}>
              {severity.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
              {alert.rfmo}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold leading-tight mb-1.5 text-foreground">{alert.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{alert.summary}</p>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Fish className="h-3 w-3" /> {alert.species}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {alert.zone}
            </span>
            <span className="flex items-center gap-1">
              <Ship className="h-3 w-3" /> {alert.affectedVessels.length} vessels
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {alert.actionDeadline}
            </span>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 mt-1 flex-shrink-0 transition-colors ${isSelected ? severity.className : 'text-muted-foreground'}`} />
      </div>
    </button>
  );
}
