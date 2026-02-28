import { Shield, Activity, Bell, Radio } from 'lucide-react';

interface StatusCardProps {
  label: string;
  value: string | number;
  subtext: string;
  type: 'primary' | 'warning' | 'destructive' | 'success';
}

const iconMap = {
  primary: Activity,
  warning: Bell,
  destructive: Shield,
  success: Radio,
};

const colorMap = {
  primary: 'text-primary glow-primary border-primary/20',
  warning: 'text-warning glow-warning border-warning/20',
  destructive: 'text-destructive glow-destructive border-destructive/20',
  success: 'text-success glow-success border-success/20',
};

const bgMap = {
  primary: 'bg-primary/5',
  warning: 'bg-warning/5',
  destructive: 'bg-destructive/5',
  success: 'bg-success/5',
};

export function StatusCard({ label, value, subtext, type }: StatusCardProps) {
  const Icon = iconMap[type];

  return (
    <div className={`rounded-lg border ${colorMap[type]} ${bgMap[type]} p-4 animate-slide-in`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${colorMap[type].split(' ')[0]}`} />
      </div>
      <div className={`text-2xl font-mono font-bold ${colorMap[type].split(' ')[0]}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
    </div>
  );
}
