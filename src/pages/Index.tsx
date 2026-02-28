import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { MOCK_RESEARCH_REQUESTS } from '@/data/researchData';
import { DashboardView } from '@/components/DashboardView';
import { MapView } from '@/components/MapView';
import { ChatPanel } from '@/components/ChatPanel';
import { CommPanel } from '@/components/CommPanel';
import { CommunityPanel } from '@/components/CommunityPanel';
import { RequestsPanel } from '@/components/RequestsPanel';
import { Anchor, Bell, Map, LayoutDashboard, MessageSquare, Radio, Users, User, Settings, LogOut, Microscope, Inbox } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Index = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'map' | 'dashboard' | 'chat' | 'comm' | 'community' | 'requests'>('map');
  const pendingRequests = MOCK_RESEARCH_REQUESTS.filter(r => r.status === 'pending').length;

  const actionCount = MOCK_ALERTS.filter((a) => a.status === 'action_required').length;

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
            <button
              onClick={() => navigate('/research')}
              className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
            >
              <Microscope className="h-3 w-3" />
              <span className="text-[10px] font-mono font-bold">Research Portal</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-md border border-border bg-secondary/30 p-0.5">
              {(['map', 'dashboard', 'chat', 'comm', 'community', 'requests'] as const).map(v => {
                const icons = { map: Map, dashboard: LayoutDashboard, chat: MessageSquare, comm: Radio, community: Users, requests: Inbox };
                const labels = { map: 'Map', dashboard: 'Dashboard', chat: 'Chat', comm: 'Comm', community: 'Community', requests: 'Requests' };
                const hasBadge = v === 'requests' && pendingRequests > 0;
                const Icon = icons[v];
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      view === v ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {labels[v]}
                    {hasBadge && (
                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">{pendingRequests}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-1">
              <Bell className="h-3 w-3 text-destructive animate-pulse-glow" />
              <span className="text-xs font-mono font-bold text-destructive">{actionCount}</span>
              <span className="text-[10px] text-destructive/80">pending</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground hidden sm:block">
              {new Date().toUTCString().slice(0, -4)} UTC
            </div>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                <DropdownMenuItem onClick={() => navigate('/onboarding')} className="cursor-pointer text-xs gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  Setup & Configuration
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-xs gap-2 text-muted-foreground">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      ) : view === 'community' ? (
        <div className="flex-1 overflow-hidden">
          <CommunityPanel />
        </div>
      ) : view === 'requests' ? (
        <div className="flex-1 overflow-hidden">
          <RequestsPanel />
        </div>
      ) : (
        <DashboardView onSwitchToMap={() => setView('map')} />
      )}
    </div>
  );
};

export default Index;
