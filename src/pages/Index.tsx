import { useState } from 'react';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { StatusCard } from '@/components/StatusCard';
import { AlertCard } from '@/components/AlertCard';
import { AlertDetail } from '@/components/AlertDetail';
import { FleetPanel } from '@/components/FleetPanel';
import { SourcesGrid } from '@/components/SourcesGrid';
import { Anchor, Bell, ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const Index = () => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(MOCK_ALERTS[0].id);
  const selectedAlert = MOCK_ALERTS.find((a) => a.id === selectedAlertId);

  const criticalCount = MOCK_ALERTS.filter((a) => a.severity === 'critical').length;
  const actionCount = MOCK_ALERTS.filter((a) => a.status === 'action_required').length;
  const atRiskCount = MOCK_VESSELS.filter((v) => v.status === 'at_risk').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 border border-primary/20">
              <Anchor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">
                MARE<span className="text-primary">WATCH</span>
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">FISHERIES COMPLIANCE INTELLIGENCE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-1">
              <Bell className="h-3 w-3 text-destructive animate-pulse-glow" />
              <span className="text-xs font-mono font-bold text-destructive">{actionCount}</span>
              <span className="text-[10px] text-destructive/80">pending</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {new Date().toUTCString().slice(0, -4)} UTC
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 space-y-4">
        {/* Status Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusCard label="Critical Alerts" value={criticalCount} subtext="Require immediate action" type="destructive" />
          <StatusCard label="Actions Pending" value={actionCount} subtext="Across all alerts" type="warning" />
          <StatusCard label="Vessels at Risk" value={atRiskCount} subtext="Non-compliant exposure" type="primary" />
          <StatusCard label="Sources Online" value="8/8" subtext="All RFMOs monitored" type="success" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Alert List */}
          <div className="lg:col-span-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 px-1">
                Active Alerts ({MOCK_ALERTS.length})
              </h2>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pr-2">
                  {MOCK_ALERTS.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      isSelected={selectedAlertId === alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Alert Detail */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-border bg-card p-4">
              {selectedAlert ? (
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <AlertDetail alert={selectedAlert} />
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Select an alert to view details
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <FleetPanel />
          </div>
        </div>

        {/* Sources */}
        <SourcesGrid />
      </main>
    </div>
  );
};

export default Index;
