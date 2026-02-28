import { useState } from 'react';
import { DEMO_RESEARCH_REQUESTS, ResearchRequest } from '@/data/researchData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Inbox, Send, User, Microscope, MapPin, Calendar, Wrench, DollarSign, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export function RequestsPanel() {
  const [requests] = useState(DEMO_RESEARCH_REQUESTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, typeof DEMO_RESEARCH_REQUESTS[0]['chatMessages']>>({});

  const selected = requests.find(r => r.id === selectedId);
  const messages = selected ? [...selected.chatMessages, ...(localMessages[selected.id] || [])] : [];

  const sendChat = () => {
    if (!chatInput.trim() || !selectedId) return;
    setLocalMessages(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), {
        id: `local-${Date.now()}`,
        sender: 'operator' as const,
        text: chatInput.trim(),
        timestamp: new Date().toISOString(),
      }],
    }));
    setChatInput('');
  };

  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-warning/20 text-warning border-warning/30' },
    accepted: { label: 'Accepted', className: 'bg-success/20 text-success border-success/30' },
    declined: { label: 'Declined', className: 'bg-destructive/20 text-destructive border-destructive/30' },
    negotiating: { label: 'Negotiating', className: 'bg-primary/20 text-primary border-primary/30' },
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left: Request List */}
      <div className="w-[340px] border-r border-border flex flex-col flex-shrink-0">
        <div className="flex-shrink-0 border-b border-border bg-card/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold text-foreground">Research Requests</h2>
            <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary ml-auto">{requests.length}</Badge>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {requests.map(r => {
              const sc = statusConfig[r.status];
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left rounded-md p-3 transition-colors ${
                    selectedId === r.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground truncate">{r.researcherName}</span>
                    <Badge className={`text-[8px] font-mono ${sc.className}`}>{sc.label}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{r.institution}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground">
                    <span>→ {r.vesselName}</span>
                    <span>·</span>
                    <span>{r.missionType}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground">
                    <MessageSquare className="h-2.5 w-2.5" />
                    <span>{r.chatMessages.length} messages</span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Detail & Chat */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Request Details */}
          <div className="flex-shrink-0 border-b border-border bg-card/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Microscope className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">{selected.researcherName}</h2>
                <span className="text-[10px] text-muted-foreground">— {selected.institution}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 bg-success/20 border border-success/30 text-success rounded-md px-3 py-1.5 text-[10px] font-mono hover:bg-success/30 transition-colors">
                  <CheckCircle className="h-3 w-3" /> Accept
                </button>
                <button className="flex items-center gap-1.5 bg-destructive/20 border border-destructive/30 text-destructive rounded-md px-3 py-1.5 text-[10px] font-mono hover:bg-destructive/30 transition-colors">
                  <XCircle className="h-3 w-3" /> Decline
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: MapPin, label: 'Region', value: selected.region },
                { icon: Calendar, label: 'Dates', value: selected.dateRange },
                { icon: DollarSign, label: 'Budget', value: selected.budget },
                { icon: Wrench, label: 'Equipment', value: selected.equipmentNeeded.join(', ') },
              ].map(item => (
                <div key={item.label} className="bg-secondary/20 border border-border rounded-md p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <item.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] font-mono uppercase text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-[11px] text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-secondary/10 border border-border rounded-md p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.message}</p>
            </div>
          </div>

          {/* Chat */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'operator' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'researcher' && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Microscope className="h-3 w-3 text-accent" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-lg px-3 py-2.5 ${
                    msg.sender === 'operator' ? 'bg-primary/20 border border-primary/30' : 'bg-card border border-border'
                  }`}>
                    <p className="text-[11px] text-foreground leading-relaxed">{msg.text}</p>
                    <span className="text-[9px] font-mono text-muted-foreground mt-1 block">
                      {new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {msg.sender === 'operator' && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-md bg-secondary border border-border flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="flex-shrink-0 border-t border-border bg-card/50 p-3">
            <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Reply to researcher..."
                className="flex-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-30 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">Select a Request</h2>
            <p className="text-xs text-muted-foreground">Choose a research request to view details and chat</p>
          </div>
        </div>
      )}
    </div>
  );
}
