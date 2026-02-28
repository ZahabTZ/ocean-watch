import { useState, useRef } from 'react';
import { MOCK_FEED_ITEMS, FEED_SOURCE_TYPES, FEED_CATEGORIES, FEED_REGIONS, FeedItem, FeedStatus } from '@/data/feedData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Search, Filter, ChevronDown, ChevronUp, FileText, Rss, Mail, Twitter,
  Globe, Upload, Eye, Brain, Zap, Check, X, Clock, AlertTriangle, CheckCircle,
  Plus, File, ExternalLink, Ship, Calendar, MapPin, Fish
} from 'lucide-react';

const SOURCE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText, rss: Rss, email: Mail, tweet: Twitter, api: Globe, upload: Upload,
};

const CATEGORY_COLORS: Record<string, string> = {
  quota: 'text-warning border-warning/30 bg-warning/10',
  closure: 'text-destructive border-destructive/30 bg-destructive/10',
  species: 'text-primary border-primary/30 bg-primary/10',
  reporting: 'text-foreground border-border bg-secondary/30',
  penalty: 'text-destructive border-destructive/30 bg-destructive/10',
};

const STATUS_CONFIG: Record<FeedStatus, { label: string; className: string }> = {
  processed: { label: 'Processed', className: 'text-success border-success/30 bg-success/10' },
  pending: { label: 'Pending', className: 'text-warning border-warning/30 bg-warning/10' },
  flagged: { label: 'Flagged', className: 'text-destructive border-destructive/30 bg-destructive/10' },
};

function formatTimeAgo(mins: number): string {
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const SourceIcon = SOURCE_ICONS[item.sourceType] || Globe;
  const statusCfg = STATUS_CONFIG[item.status];
  const catColor = CATEGORY_COLORS[item.category] || '';

  return (
    <div className={`border rounded-lg transition-all ${
      item.status === 'flagged' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card/50'
    }`}>
      {/* Card Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {item.status === 'flagged' && (
                <Badge className="text-[8px] font-mono bg-destructive/20 text-destructive border-destructive/30 animate-pulse">NEW</Badge>
              )}
              <Badge className={`text-[8px] font-mono ${catColor}`}>{item.category.toUpperCase()}</Badge>
              <Badge variant="outline" className="text-[8px] font-mono border-border text-muted-foreground">{item.sourceOrg}</Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{formatTimeAgo(item.minutesAgo)}</span>
            </div>
            <h3 className="text-xs font-bold text-foreground leading-snug mb-1">{item.title}</h3>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
              <SourceIcon className="h-3 w-3 flex-shrink-0" />
              <span>Source: {item.sourceName}</span>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                View Raw <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`text-[8px] font-mono ${statusCfg.className}`}>{statusCfg.label}</Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {/* Expanded View — 3 Columns */}
      {expanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* RAW */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Raw Source</h4>
              </div>
              <div className="space-y-2">
                <div className="bg-secondary/20 border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <SourceIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{item.rawFormat}</span>
                  </div>
                  {item.rawPages && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-1">
                      <File className="h-3 w-3" />
                      {item.rawPages} pages
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-2">
                    <Globe className="h-3 w-3" />
                    {item.rawLanguage}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.rawSummary}</p>
                </div>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full text-[10px] font-mono text-primary border border-primary/20 rounded-md py-1.5 hover:bg-primary/10 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Open Original Source
                </a>
              </div>
            </div>

            {/* AI READ */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">AI Read</h4>
                <Badge className="text-[8px] font-mono bg-primary/10 text-primary border-primary/30 ml-auto">{item.aiConfidence}% conf</Badge>
              </div>
              <div className="space-y-2">
                {[
                  { icon: Fish, label: 'Species', value: item.aiSpecies },
                  { icon: MapPin, label: 'Zone', value: item.aiZone },
                  { icon: AlertTriangle, label: 'Change', value: item.aiChange },
                  { icon: Calendar, label: 'Effective', value: item.aiEffectiveDate },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-md px-3 py-2">
                    <row.icon className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">{row.label}</span>
                      <p className="text-[11px] text-foreground font-medium">{row.value}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-primary/5 border border-primary/10 rounded-md px-3 py-2">
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">Category</span>
                  <p className="text-[11px] text-foreground font-medium">{item.aiCategory}</p>
                </div>
              </div>
            </div>

            {/* AI ACTION */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="h-3.5 w-3.5 text-warning" />
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-warning font-bold">AI Action</h4>
              </div>
              <div className="space-y-3">
                <div className={`rounded-md border p-3 ${
                  item.actionStatus === 'approved' ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
                }`}>
                  <p className="text-xs font-medium text-foreground mb-2">{item.actionRecommendation}</p>
                  {item.actionDeadline && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      Deadline: {item.actionDeadline}
                    </div>
                  )}
                  {item.actionVessels.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">Affected Vessels</span>
                      {item.actionVessels.map(v => (
                        <div key={v} className="flex items-center gap-1.5 text-[10px] text-foreground">
                          <Ship className="h-3 w-3 text-muted-foreground" />
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {item.actionStatus === 'approved' ? (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-success">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Action approved
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-success/20 border border-success/30 text-success rounded-md py-2 text-[10px] font-mono font-bold hover:bg-success/30 transition-colors">
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-secondary/30 border border-border text-muted-foreground rounded-md py-2 text-[10px] font-mono hover:bg-secondary/50 transition-colors">
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataFeedPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const items = MOCK_FEED_ITEMS.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.aiSpecies.toLowerCase().includes(q) && !item.aiZone.toLowerCase().includes(q) && !item.sourceOrg.toLowerCase().includes(q) && !item.rawSummary.toLowerCase().includes(q)) return false;
    }
    if (filterSource && item.sourceType !== filterSource) return false;
    if (filterRegion && item.region !== filterRegion) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  const todayUpdates = MOCK_FEED_ITEMS.filter(i => i.minutesAgo < 1440).length;
  const flaggedCount = MOCK_FEED_ITEMS.filter(i => i.status === 'flagged').length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const names = Array.from(files).map(f => f.name);
      setUploadedFiles(prev => [...prev, ...names]);
      setShowUpload(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Ingestion Status Bar */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-success">LIVE</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">847 sources monitored</span>
            <span className="text-[10px] font-mono text-muted-foreground">·</span>
            <span className="text-[10px] font-mono text-muted-foreground">Last update 4 mins ago</span>
            <span className="text-[10px] font-mono text-muted-foreground">·</span>
            <span className="text-[10px] font-mono text-foreground font-bold">{todayUpdates} updates today</span>
          </div>
          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <Badge className="text-[9px] font-mono bg-destructive/20 text-destructive border-destructive/30">
                {flaggedCount} flagged
              </Badge>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[10px] font-mono font-bold">Add Source</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 border-b border-border bg-card/30 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search: "bigeye tuna" "Zone 4" "WCPFC"...'
              className="w-full bg-secondary/30 border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {[
              { value: filterSource, set: setFilterSource, options: FEED_SOURCE_TYPES, placeholder: 'Source' },
              { value: filterRegion, set: setFilterRegion, options: FEED_REGIONS, placeholder: 'Region' },
              { value: filterCategory, set: setFilterCategory, options: FEED_CATEGORIES, placeholder: 'Category' },
              { value: filterStatus, set: setFilterStatus, options: ['processed', 'pending', 'flagged'], placeholder: 'Status' },
            ].map(f => (
              <select
                key={f.placeholder}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                className="bg-secondary/30 border border-border rounded-md px-2 py-1.5 text-[10px] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none min-w-[80px]"
              >
                <option value="">{f.placeholder}</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {(filterSource || filterRegion || filterCategory || filterStatus) && (
              <button onClick={() => { setFilterSource(''); setFilterRegion(''); setFilterCategory(''); setFilterStatus(''); }}
                className="text-[10px] font-mono text-primary hover:underline">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {uploadedFiles.map((name, i) => (
            <div key={`upload-${i}`} className="border border-primary/20 bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <Badge className="text-[8px] font-mono bg-primary/20 text-primary border-primary/30">UPLOAD</Badge>
                <span className="text-[10px] font-mono text-muted-foreground">Just now</span>
              </div>
              <h3 className="text-xs font-bold text-foreground mt-1.5">{name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">Processing...</span>
              </div>
            </div>
          ))}

          {items.map(item => (
            <FeedCard key={item.id} item={item} />
          ))}

          {items.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No feed items match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold font-mono text-foreground">Add New Source</h2>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-secondary/50">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                <p className="text-xs font-bold text-foreground">Drop PDFs here or click to browse</p>
                <p className="text-[10px] text-muted-foreground mt-1">Supported: PDF, DOC, DOCX, XLS, HTML</p>
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.html" multiple className="hidden" onChange={handleFileUpload} />

              <div className="text-center text-[10px] font-mono text-muted-foreground">— or —</div>

              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Paste URL</label>
                <div className="flex gap-2 mt-1">
                  <input placeholder="https://rfmo.org/document.pdf" className="flex-1 bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" />
                  <button className="px-3 py-2 bg-primary/20 border border-primary/30 text-primary rounded-md text-xs font-mono hover:bg-primary/30 transition-colors">
                    Ingest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
