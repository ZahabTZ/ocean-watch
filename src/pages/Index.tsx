import { useState } from 'react';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { StatusCard } from '@/components/StatusCard';
import { AlertCard } from '@/components/AlertCard';
import { AlertDetail } from '@/components/AlertDetail';
import { FleetPanel } from '@/components/FleetPanel';
import { SourcesGrid } from '@/components/SourcesGrid';
import { MapView } from '@/components/MapView';
import { ChatPanel } from '@/components/ChatPanel';
import { CommPanel } from '@/components/CommPanel';
import { Anchor, Bell, ChevronLeft, Map, LayoutDashboard, MessageSquare, Radio } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const Index = () => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(MOCK_ALERTS[0].id);
  const [view, setView] = useState<'map' | 'dashboard' | 'chat' | 'comm'>('map');
  const selectedAlert = MOCK_ALERTS.find((a) => a.id === selectedAlertId);

  const criticalCount = MOCK_ALERTS.filter((a) => a.severity === 'critical').length;
  const actionCount = MOCK_ALERTS.filter((a) => a.status === 'action_required').length;
  const atRiskCount = MOCK_VESSELS.filter((v) => v.status === 'at_risk').length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm z-50 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 border border-primary/20">
              <Anchor className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">
                MARE<span className="text-primary">WATCH</span>
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground tracking-wider">FISHERIES COMPLIANCE INTELLIGENCE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-md border border-border bg-secondary/30 p-0.5">
              <button
                onClick={() => setView('map')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  view === 'map' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Map className="h-3 w-3" />
                Map
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  view === 'dashboard' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="h-3 w-3" />
                Dashboard
              </button>
              <button
                onClick={() => setView('chat')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  view === 'chat' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </button>
              <button
                onClick={() => setView('comm')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  view === 'comm' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Radio className="h-3 w-3" />
                Comm
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-1">
              <Bell className="h-3 w-3 text-destructive animate-pulse-glow" />
              <span className="text-xs font-mono font-bold text-destructive">{actionCount}</span>
              <span className="text-[10px] text-destructive/80">pending</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground hidden sm:block">
              {new Date().toUTCString().slice(0, -4)} UTC
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      {view === 'map' ? (
        <div className="flex-1 relative overflow-hidden">
          <MapView />
        </div>
      ) : view === 'chat' ? (
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      ) : view === 'comm' ? (
        <div className="flex-1 overflow-hidden">
          <CommPanel />
        </div>
      ) : (
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1600px] mx-auto p-4 space-y-4">
            {/* Status Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatusCard label="Critical Alerts" value={criticalCount} subtext="Require immediate action" type="destructive" />
              <StatusCard label="Actions Pending" value={actionCount} subtext="Across all alerts" type="warning" />
              <StatusCard label="Vessels at Risk" value={atRiskCount} subtext="Non-compliant exposure" type="primary" />
              <StatusCard label="Sources Online" value="8/8" subtext="All RFMOs monitored" type="success" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

              <div className="lg:col-span-3 space-y-4">
                <FleetPanel />
              </div>
            </div>

            <SourcesGrid />
          </div>
        </main>
      )}
    </div>
  );
};

export default Index;
