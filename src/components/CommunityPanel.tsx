import { useState } from 'react';
import {
  Search, Users, Calendar, DollarSign, Lightbulb, MapPin, ExternalLink,
  MessageCircle, Award, Briefcase, GraduationCap, Anchor, ChevronRight,
  Filter, TrendingUp, Globe, Handshake, Megaphone, BookOpen
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type CommunitySection = 'directory' | 'resources' | 'events' | 'board';

const DIRECTORY_ENTRIES = [
  { id: 'd1', name: 'Dr. Marina Santos', role: 'Marine Biologist', org: 'Scripps Institute', tags: ['Research', 'Species Assessment'], region: 'San Diego, CA', avatar: '🧑‍🔬', type: 'expert' as const },
  { id: 'd2', name: 'Pacific Fisheries Lab', role: 'Testing & Certification', org: 'NOAA Partner', tags: ['Lab', 'Water Quality', 'Testing'], region: 'SF Bay Area', avatar: '🏛️', type: 'facility' as const },
  { id: 'd3', name: 'Blue Ventures Fund', role: 'Impact Investor', org: 'Ocean Impact Capital', tags: ['Funding', 'Series A', 'Blue Economy'], region: 'Global', avatar: '💰', type: 'funder' as const },
  { id: 'd4', name: 'Capt. James Oku', role: 'Fleet Operations Manager', org: 'Pacific Harvesting Co.', tags: ['Fleet Mgmt', 'Compliance'], region: 'Hawaii', avatar: '⚓', type: 'operator' as const },
  { id: 'd5', name: 'OceanTech Accelerator', role: 'Startup Program', org: 'Maritime Innovation Hub', tags: ['Accelerator', 'Startups', 'Mentorship'], region: 'SF Bay Area', avatar: '🚀', type: 'program' as const },
  { id: 'd6', name: 'Harbor District Authority', role: 'Port Administration', org: 'SF Bay Ports', tags: ['Port Access', 'Permitting', 'Testing Venues'], region: 'SF Bay Area', avatar: '🏗️', type: 'facility' as const },
];

const RESOURCES = [
  { id: 'r1', title: 'NOAA Blue Economy Grant — Spring 2026', type: 'Funding', deadline: 'Apr 15, 2026', amount: '$250K–$1M', icon: <DollarSign className="h-4 w-4" />, hot: true },
  { id: 'r2', title: 'SF Bay Area Permitting Guide for Ocean Tech', type: 'Guide', deadline: null, amount: null, icon: <BookOpen className="h-4 w-4" />, hot: false },
  { id: 'r3', title: 'Maritime Innovation Fellowship 2026', type: 'Program', deadline: 'May 1, 2026', amount: '$75K stipend', icon: <GraduationCap className="h-4 w-4" />, hot: true },
  { id: 'r4', title: 'Open Call: Sustainable Aquaculture Pilots', type: 'Call for Bids', deadline: 'Mar 30, 2026', amount: '$500K pool', icon: <Megaphone className="h-4 w-4" />, hot: true },
  { id: 'r5', title: 'EPA Clean Water Act Compliance Toolkit', type: 'Resource', deadline: null, amount: null, icon: <BookOpen className="h-4 w-4" />, hot: false },
  { id: 'r6', title: 'Pacific Fisheries Council — Observer Program', type: 'Program', deadline: 'Rolling', amount: 'Paid positions', icon: <Briefcase className="h-4 w-4" />, hot: false },
];

const EVENTS = [
  { id: 'e1', title: 'Blue Economy Summit — SF', date: 'Mar 15, 2026', location: 'Pier 39, San Francisco', attendees: 342, featured: true },
  { id: 'e2', title: 'Ocean Tech Demo Day', date: 'Mar 22, 2026', location: 'Maritime Innovation Hub', attendees: 128, featured: true },
  { id: 'e3', title: 'Fisheries Compliance Workshop', date: 'Apr 3, 2026', location: 'Virtual', attendees: 89, featured: false },
  { id: 'e4', title: 'Sustainable Ports Roundtable', date: 'Apr 10, 2026', location: 'Port of Oakland', attendees: 64, featured: false },
  { id: 'e5', title: 'Bay Area Marine Biotech Meetup', date: 'Apr 18, 2026', location: 'Mission Bay, SF', attendees: 210, featured: false },
];

const BOARD_POSTS = [
  { id: 'b1', author: 'Harbor District', badge: 'Official', title: 'New testing berth available at Pier 50 — applications open', time: '2h ago', replies: 14, category: 'notice' as const },
  { id: 'b2', author: 'OceanTech Accel.', badge: 'Partner', title: '🎉 Cohort 4 graduate AquaSense raises $3.2M Series A', time: '5h ago', replies: 28, category: 'win' as const },
  { id: 'b3', author: 'Capt. Oku', badge: 'Member', title: 'Looking for co-founder with ML expertise for bycatch reduction AI', time: '8h ago', replies: 9, category: 'connect' as const },
  { id: 'b4', author: 'Dr. Santos', badge: 'Expert', title: 'New paper: Bigeye tuna stock recovery in Eastern Pacific — key findings', time: '1d ago', replies: 31, category: 'news' as const },
  { id: 'b5', author: 'SF Port Authority', badge: 'Official', title: 'Public comment period open: Bay Area marine zoning proposal', time: '1d ago', replies: 47, category: 'notice' as const },
  { id: 'b6', author: 'Blue Ventures', badge: 'Partner', title: 'Q1 impact report: $12M deployed across 8 ocean startups', time: '2d ago', replies: 19, category: 'win' as const },
];

const typeColors: Record<string, string> = {
  expert: 'bg-primary/15 text-primary border-primary/30',
  facility: 'bg-warning/15 text-warning border-warning/30',
  funder: 'bg-success/15 text-success border-success/30',
  operator: 'bg-destructive/15 text-destructive border-destructive/30',
  program: 'bg-accent/15 text-accent border-accent/30',
};

const categoryColors: Record<string, { bg: string; text: string; label: string }> = {
  notice: { bg: 'bg-warning/15 border-warning/30', text: 'text-warning', label: '📢 Notice' },
  win: { bg: 'bg-success/15 border-success/30', text: 'text-success', label: '🏆 Win' },
  connect: { bg: 'bg-primary/15 border-primary/30', text: 'text-primary', label: '🤝 Connect' },
  news: { bg: 'bg-accent/15 border-accent/30', text: 'text-accent', label: '📰 News' },
};

export function CommunityPanel() {
  const [section, setSection] = useState<CommunitySection>('board');
  const [searchQuery, setSearchQuery] = useState('');

  const sections: { id: CommunitySection; label: string; icon: React.ReactNode }[] = [
    { id: 'board', label: 'Feed', icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'resources', label: 'Resources', icon: <Lightbulb className="h-3.5 w-3.5" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Section Nav + Search */}
      <div className="border-b border-border px-4 py-3 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  section === s.id ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search community..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 w-48 rounded-md border border-border bg-secondary/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 1,247 members</span>
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> 38 organizations</span>
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> $4.2M in active grants</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> 5 upcoming events</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-[1200px] mx-auto p-4 space-y-4">

          {/* ── Community Board / Feed ── */}
          {section === 'board' && (
            <div className="space-y-3">
              {/* Post composer hint */}
              <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                  <Anchor className="h-4 w-4" />
                </div>
                <div className="flex-1 rounded-lg border border-border bg-secondary/20 px-4 py-2 text-xs text-muted-foreground cursor-pointer hover:border-primary/20 transition-colors">
                  Share an update, opportunity, or win with the community...
                </div>
              </div>

              {BOARD_POSTS.map(post => {
                const cat = categoryColors[post.category];
                return (
                  <div key={post.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{post.author}</span>
                          <Badge variant="outline" className={`text-[9px] font-mono ${cat.bg} ${cat.text} border`}>
                            {post.badge}
                          </Badge>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cat.bg} ${cat.text}`}>
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{post.time}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">{post.title}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.replies} replies</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Directory ── */}
          {section === 'directory' && (
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {['All', 'Experts', 'Facilities', 'Funders', 'Operators', 'Programs'].map(f => (
                  <button key={f} className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-colors ${
                    f === 'All' ? 'bg-primary/15 text-primary border-primary/20' : 'bg-secondary/20 text-muted-foreground border-border hover:text-foreground hover:border-primary/20'
                  }`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DIRECTORY_ENTRIES.map(entry => (
                  <div key={entry.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{entry.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{entry.name}</h4>
                          <Badge variant="outline" className={`text-[9px] font-mono border ${typeColors[entry.type]}`}>
                            {entry.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.role} · {entry.org}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] font-mono text-muted-foreground">{entry.region}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground border border-border">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-primary border border-primary/20 bg-primary/5 hover:bg-primary/15 transition-colors flex-shrink-0">
                        <Handshake className="h-3 w-3" />
                        Connect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Resources ── */}
          {section === 'resources' && (
            <div className="space-y-3">
              {/* Active opportunities banner */}
              <div className="rounded-xl border border-success/20 bg-success/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">3 funding opportunities closing soon</p>
                    <p className="text-[11px] text-muted-foreground">Total available: $1.75M across grants and programs</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-success/15 text-success border-success/30">
                  🔥 Hot
                </Badge>
              </div>

              {RESOURCES.map(r => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</h4>
                        {r.hot && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">
                            🔥 Hot
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-[9px] border-border">{r.type}</Badge>
                        {r.deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.deadline}</span>
                        )}
                        {r.amount && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {r.amount}</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Events ── */}
          {section === 'events' && (
            <div className="space-y-3">
              {/* Featured events */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EVENTS.filter(e => e.featured).map(event => (
                  <div key={event.id} className="rounded-xl border border-primary/20 bg-primary/5 p-5 hover:border-primary/30 transition-all cursor-pointer group">
                    <Badge variant="outline" className="text-[9px] font-mono bg-primary/15 text-primary border-primary/30 mb-3">
                      ⭐ Featured
                    </Badge>
                    <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-2">{event.title}</h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {event.date}</p>
                      <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {event.location}</p>
                      <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {event.attendees} attending</p>
                    </div>
                    <button className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors">
                      <Award className="h-3.5 w-3.5" />
                      RSVP
                    </button>
                  </div>
                ))}
              </div>

              {/* All events */}
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground pt-2">Upcoming</h3>
              {EVENTS.filter(e => !e.featured).map(event => (
                <div key={event.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="text-center flex-shrink-0 w-12">
                      <p className="text-lg font-mono font-bold text-primary">{event.date.split(',')[0].split(' ')[1]}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">{event.date.split(' ')[0]}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{event.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.attendees}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
