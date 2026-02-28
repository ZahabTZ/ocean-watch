import { AlertSeverity, AlertStatus } from '@/data/liveData';
import { AlertTriangle, AlertCircle, Info, Clock, CheckCircle2, XCircle } from 'lucide-react';

export function getSeverityConfig(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        className: 'text-destructive',
        bgClassName: 'bg-destructive/10 border-destructive/30',
        badgeClassName: 'bg-destructive/20 text-destructive border-destructive/30',
        glowClassName: 'glow-destructive',
        label: 'CRITICAL',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        className: 'text-warning',
        bgClassName: 'bg-warning/10 border-warning/30',
        badgeClassName: 'bg-warning/20 text-warning border-warning/30',
        glowClassName: 'glow-warning',
        label: 'WARNING',
      };
    case 'info':
      return {
        icon: Info,
        className: 'text-primary',
        bgClassName: 'bg-primary/10 border-primary/30',
        badgeClassName: 'bg-primary/20 text-primary border-primary/30',
        glowClassName: 'glow-primary',
        label: 'INFO',
      };
  }
}

export function getStatusConfig(status: AlertStatus) {
  switch (status) {
    case 'action_required':
      return { icon: Clock, label: 'Action Required', className: 'text-warning' };
    case 'acknowledged':
      return { icon: CheckCircle2, label: 'Acknowledged', className: 'text-primary' };
    case 'resolved':
      return { icon: CheckCircle2, label: 'Resolved', className: 'text-success' };
  }
}

export function getVesselStatusConfig(status: 'compliant' | 'action_needed' | 'at_risk') {
  switch (status) {
    case 'compliant':
      return { label: 'Compliant', className: 'text-success', dotClassName: 'bg-success' };
    case 'action_needed':
      return { label: 'Action Needed', className: 'text-warning', dotClassName: 'bg-warning' };
    case 'at_risk':
      return { label: 'At Risk', className: 'text-destructive', dotClassName: 'bg-destructive animate-pulse-glow' };
  }
}
