import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildMapZones, buildMapVessels, MapZone } from '@/data/mapData';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { getVesselStatusConfig, getSeverityConfig } from '@/lib/alertUtils';
import {
  Ship, ChevronRight, Fish, MapPin, Calendar, X, Layers,
  Shield, AlertTriangle, Leaf, Brain, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  red: { fill: 'rgba(220, 60, 60, 0.25)', stroke: 'rgba(220, 60, 60, 0.8)' },
  yellow: { fill: 'rgba(234, 179, 8, 0.2)', stroke: 'rgba(234, 179, 8, 0.7)' },
  green: { fill: 'rgba(34, 197, 94, 0.08)', stroke: 'rgba(34, 197, 94, 0.4)' },
};

const VESSEL_COLORS: Record<string, string> = {
  compliant: '#22c55e',
  action_needed: '#eab308',
  at_risk: '#ef4444',
};

// ── Layer Definitions ──
type LayerCategory = 'compliance' | 'alerts' | 'environment' | 'intelligence';

interface LayerDef {
  id: string;
  category: LayerCategory;
  label: string;
  description: string;
  defaultOn: boolean;
}

const LAYER_CATEGORIES: { id: LayerCategory; label: string; icon: React.ReactNode; color: string; question: string }[] = [
  { id: 'compliance', label: 'Compliance', icon: <Shield className="h-3.5 w-3.5" />, color: 'text-primary', question: 'Where can I fish?' },
  { id: 'alerts', label: 'Alerts', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-destructive', question: "What's changing?" },
  { id: 'environment', label: 'Environment', icon: <Leaf className="h-3.5 w-3.5" />, color: 'text-success', question: "What's the ecosystem doing?" },
  { id: 'intelligence', label: 'Intelligence', icon: <Brain className="h-3.5 w-3.5" />, color: 'text-warning', question: 'Where should I fish?' },
];

const LAYERS: LayerDef[] = [
  // Compliance
  { id: 'fleet_positions', category: 'compliance', label: 'Fleet Positions', description: 'Your vessels vs. restricted zones', defaultOn: true },
  { id: 'quota_utilization', category: 'compliance', label: 'Quota Utilization', description: 'Usage overlay by vessel', defaultOn: false },
  { id: 'restricted_zones', category: 'compliance', label: 'Restricted Zones', description: 'Active closures & no-go areas', defaultOn: true },
  // Alerts
  { id: 'new_closures', category: 'alerts', label: 'New Closures', description: 'Recently announced closures', defaultOn: true },
  { id: 'quota_changes', category: 'alerts', label: 'Quota Changes', description: 'Recent quota modifications', defaultOn: true },
  { id: 'deadlines', category: 'alerts', label: 'Deadline Countdown', description: 'Upcoming compliance deadlines', defaultOn: false },
  // Environment
  { id: 'stock_health', category: 'environment', label: 'Stock Health', description: 'Fish population by zone', defaultOn: false },
  { id: 'migration', category: 'environment', label: 'Migration Patterns', description: 'Seasonal species movement', defaultOn: false },
  { id: 'protected_species', category: 'environment', label: 'Protected Hotspots', description: 'Endangered species areas', defaultOn: false },
  // Intelligence
  { id: 'competitor_activity', category: 'intelligence', label: 'Competitor Activity', description: 'AIS vessel density heatmap', defaultOn: false },
  { id: 'best_zones', category: 'intelligence', label: 'Best Available Zones', description: 'Optimal fishing given rules', defaultOn: false },
  { id: 'historical_catch', category: 'intelligence', label: 'Historical Catch', description: 'Past performance by zone', defaultOn: false },
];

// ── Mock overlay data for extra layers ──
const ENVIRONMENT_ZONES: { center: [number, number]; radius: number; label: string; health: 'good' | 'moderate' | 'poor'; species: string }[] = [
  { center: [-15, -110], radius: 400000, label: 'EPO Bigeye Stock', health: 'moderate', species: 'Bigeye Tuna' },
  { center: [-12, 65], radius: 350000, label: 'IO Yellowfin Stock', health: 'poor', species: 'Yellowfin Tuna' },
  { center: [33, -40], radius: 300000, label: 'NA Swordfish Stock', health: 'good', species: 'Swordfish' },
  { center: [-62, -55], radius: 250000, label: 'Antarctic Krill', health: 'good', species: 'Krill' },
];

const MIGRATION_PATHS: { points: [number, number][]; species: string }[] = [
  { points: [[-5, -130], [-10, -120], [-18, -110], [-25, -100]], species: 'Bigeye Tuna' },
  { points: [[0, 55], [-8, 62], [-15, 70], [-22, 78]], species: 'Yellowfin Tuna' },
  { points: [[40, -50], [35, -42], [28, -35]], species: 'Swordfish' },
];

const PROTECTED_HOTSPOTS: { center: [number, number]; radius: number; label: string }[] = [
  { center: [-63, -50], radius: 200000, label: 'Antarctic Protected Zone' },
  { center: [-8, 72], radius: 180000, label: 'Indian Ocean Whale Corridor' },
  { center: [30, -45], radius: 150000, label: 'Leatherback Turtle Nesting' },
];

const COMPETITOR_CLUSTERS: { center: [number, number]; radius: number; density: 'high' | 'medium' | 'low' }[] = [
  { center: [-10, -115], radius: 350000, density: 'high' },
  { center: [-14, 68], radius: 300000, density: 'medium' },
  { center: [36, -36], radius: 250000, density: 'low' },
  { center: [0, 155], radius: 400000, density: 'medium' },
];

const BEST_ZONES: { center: [number, number]; radius: number; score: number; label: string }[] = [
  { center: [-20, -95], radius: 350000, score: 92, label: 'EPO-3 South' },
  { center: [0, 160], radius: 300000, score: 88, label: 'WCPO Open' },
  { center: [38, -33], radius: 250000, score: 75, label: 'NA-2 North' },
];

const DEADLINE_MARKERS: { position: [number, number]; label: string; days: number; zone: string }[] = [
  { position: [-15, -120], label: 'Quota reallocation', days: 10, zone: 'EPO-3' },
  { position: [-15, 68], label: 'Catch report due', days: 0, zone: 'IO-4' },
  { position: [-62, -52], label: 'Vessel exit deadline', days: 20, zone: 'Area 48.1' },
  { position: [33, -42], label: 'Bycatch review', days: 5, zone: 'NA-2' },
];

const HEALTH_COLORS = { good: '#22c55e', moderate: '#eab308', poor: '#ef4444' };
const DENSITY_COLORS = { high: 'rgba(234, 179, 8, 0.35)', medium: 'rgba(234, 179, 8, 0.2)', low: 'rgba(234, 179, 8, 0.1)' };

// ── Zone Detail Panel (unchanged) ──
function ZoneDetailPanel({ zone, onClose }: { zone: MapZone; onClose: () => void }) {
  const alerts = MOCK_ALERTS.filter(a => zone.alertIds.includes(a.id));
  const vessels = MOCK_VESSELS.filter(v => zone.vesselIds.includes(v.id));
  const statusLabel = zone.status === 'red' ? 'CRITICAL' : zone.status === 'yellow' ? 'WATCH' : 'CLEAR';
  const statusText = zone.status === 'red' ? 'text-destructive' : zone.status === 'yellow' ? 'text-warning' : 'text-success';

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] z-[1000] bg-card/95 backdrop-blur-md border-l border-border shadow-2xl animate-slide-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-mono text-foreground">{zone.name}</h2>
          <Badge variant="outline" className={`text-[10px] font-mono ${statusText} border-current`}>{statusLabel}</Badge>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50 transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="h-[calc(100%-56px)]">
        <div className="p-4 space-y-4">
          {alerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">What Changed ({alerts.length})</h3>
              <div className="space-y-2">
                {alerts.map(alert => {
                  const sev = getSeverityConfig(alert.severity);
                  const Icon = sev.icon;
                  return (
                    <div key={alert.id} className={`rounded-md border p-3 ${sev.bgClassName}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`h-3.5 w-3.5 ${sev.className}`} />
                        <Badge variant="outline" className={`text-[9px] font-mono ${sev.badgeClassName}`}>{alert.rfmo}</Badge>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground"><Fish className="h-2.5 w-2.5" /> {alert.species}</span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground"><Calendar className="h-2.5 w-2.5" /> by {alert.actionDeadline}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Your Vessels Here ({vessels.length})</h3>
            <div className="space-y-1.5">
              {vessels.map(v => {
                const cfg = getVesselStatusConfig(v.status);
                return (
                  <div key={v.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-3 py-2">
                    <Ship className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs">{v.flag}</span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">{v.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className={`h-1.5 w-1.5 rounded-full ${cfg.dotClassName}`} />
                      <span className={`text-[10px] font-mono ${cfg.className}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {alerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</h3>
              <div className="space-y-1.5">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                    <ChevronRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-foreground leading-relaxed">{alert.changeDetail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Layer Control Panel ──
function LayerPanel({ activeLayers, onToggle }: { activeLayers: Set<string>; onToggle: (id: string) => void }) {
  const [expandedCategory, setExpandedCategory] = useState<LayerCategory | null>('compliance');
  const [panelOpen, setPanelOpen] = useState(true);

  const activeCount = activeLayers.size;

  if (!panelOpen) {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2.5 flex items-center gap-2 hover:border-primary/30 transition-colors"
      >
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-mono text-muted-foreground">{activeCount} layers</span>
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-xl w-[260px] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-xs font-mono font-bold text-foreground">Map Layers</span>
          <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/20">
            {activeCount}
          </Badge>
        </div>
        <button onClick={() => setPanelOpen(false)} className="p-1 rounded hover:bg-secondary/50 transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Categories */}
      <ScrollArea className="max-h-[calc(100vh-160px)]">
        <div className="p-2 space-y-1">
          {LAYER_CATEGORIES.map(cat => {
            const isExpanded = expandedCategory === cat.id;
            const catLayers = LAYERS.filter(l => l.category === cat.id);
            const catActiveCount = catLayers.filter(l => activeLayers.has(l.id)).length;

            return (
              <div key={cat.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                    isExpanded ? 'bg-secondary/40' : 'hover:bg-secondary/20'
                  }`}
                >
                  <span className={cat.color}>{cat.icon}</span>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                    <p className="text-[9px] text-muted-foreground italic">{cat.question}</p>
                  </div>
                  {catActiveCount > 0 && (
                    <span className={`text-[9px] font-mono font-bold ${cat.color}`}>{catActiveCount}</span>
                  )}
                  {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-1 pb-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                    {catLayers.map(layer => {
                      const isOn = activeLayers.has(layer.id);
                      return (
                        <button
                          key={layer.id}
                          onClick={() => onToggle(layer.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all text-left ${
                            isOn ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/20 border border-transparent'
                          }`}
                        >
                          {isOn ? (
                            <Eye className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-medium ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}>{layer.label}</p>
                            <p className="text-[9px] text-muted-foreground/60 truncate">{layer.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Map Component ──
export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const zones = useMemo(() => buildMapZones(), []);
  const vessels = useMemo(() => buildMapVessels(), []);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());

  // Layer groups
  const layerGroupsRef = useRef<Record<string, L.LayerGroup>>({});

  // Active layers state
  const [activeLayers, setActiveLayers] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    LAYERS.filter(l => l.defaultOn).forEach(l => defaults.add(l.id));
    return defaults;
  });

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [0, 20],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      opacity: 0.6,
    }).addTo(map);

    // ── Create all layer groups ──

    // Compliance: Fleet Positions
    const fleetGroup = L.layerGroup();
    vessels.forEach(vessel => {
      const color = VESSEL_COLORS[vessel.status];
      L.circleMarker(vessel.position as L.LatLngExpression, {
        radius: 6, color, fillColor: color, fillOpacity: 0.9,
        weight: vessel.status === 'at_risk' ? 2 : 1,
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px">${vessel.flag} ${vessel.name}</span>`,
        { className: 'dark-tooltip' }
      ).addTo(fleetGroup);
    });
    layerGroupsRef.current['fleet_positions'] = fleetGroup;

    // Compliance: Restricted Zones (the base zone polygons)
    const restrictedGroup = L.layerGroup();
    zones.forEach(zone => {
      const colors = STATUS_COLORS[zone.status];
      const polygon = L.polygon(zone.coordinates as L.LatLngExpression[], {
        color: colors.stroke, fillColor: colors.fill,
        fillOpacity: zone.status === 'green' ? 0.08 : 0.25,
        weight: 1.5, dashArray: zone.status === 'green' ? '4 4' : undefined,
      }).addTo(restrictedGroup);
      polygon.bindTooltip(
        `<span style="font-family:monospace;font-size:11px">${zone.name} — ${
          zone.status === 'red' ? '⚠ Active Alert' : zone.status === 'yellow' ? '⚡ Watch' : '✓ Clear'
        }</span>`, { sticky: true, className: 'dark-tooltip' }
      );
      polygon.on('click', () => setSelectedZone(prev => prev?.id === zone.id ? null : zone));
      polygonLayersRef.current.set(zone.id, polygon);
    });
    layerGroupsRef.current['restricted_zones'] = restrictedGroup;

    // Compliance: Quota Utilization labels on vessels
    const quotaGroup = L.layerGroup();
    const quotaValues: Record<string, number> = { v1: 78, v2: 82, v3: 41, v4: 38, v5: 45, v6: 23, v7: 92, v8: 88 };
    vessels.forEach(vessel => {
      const q = quotaValues[vessel.id] || 50;
      const color = q >= 85 ? '#ef4444' : q >= 70 ? '#eab308' : '#22c55e';
      L.circleMarker(vessel.position as L.LatLngExpression, {
        radius: 14, color, fillColor: color, fillOpacity: 0.15, weight: 2,
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;font-weight:bold;color:${color}">${q}% quota</span><br><span style="font-family:monospace;font-size:10px">${vessel.name}</span>`,
        { permanent: false, className: 'dark-tooltip' }
      ).addTo(quotaGroup);
    });
    layerGroupsRef.current['quota_utilization'] = quotaGroup;

    // Alerts: New Closures — pulsing red circles on closed zones
    const closuresGroup = L.layerGroup();
    zones.filter(z => z.status === 'red').forEach(zone => {
      const coords = zone.coordinates as [number, number][];
      const cLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const cLng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      L.circleMarker([cLat, cLng], {
        radius: 18, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15, weight: 2, dashArray: '4 4',
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;color:#ef4444">⚠ CLOSURE</span>`,
        { className: 'dark-tooltip' }
      ).addTo(closuresGroup);
    });
    layerGroupsRef.current['new_closures'] = closuresGroup;

    // Alerts: Quota Changes — zone highlight with percentage
    const quotaChangesGroup = L.layerGroup();
    const changedZones = [
      { zone: 'EPO-3', change: '-8%', coords: [-15, -120] as [number, number] },
      { zone: 'IO-4', change: '-12%', coords: [-15, 68] as [number, number] },
    ];
    changedZones.forEach(cz => {
      L.circleMarker(cz.coords, {
        radius: 12, color: '#eab308', fillColor: '#eab308', fillOpacity: 0.2, weight: 2,
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;color:#eab308">${cz.zone}: ${cz.change} quota</span>`,
        { permanent: true, className: 'dark-tooltip', direction: 'right' }
      ).addTo(quotaChangesGroup);
    });
    layerGroupsRef.current['quota_changes'] = quotaChangesGroup;

    // Alerts: Deadline countdown markers
    const deadlineGroup = L.layerGroup();
    DEADLINE_MARKERS.forEach(dm => {
      const color = dm.days <= 3 ? '#ef4444' : dm.days <= 10 ? '#eab308' : '#22c55e';
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:rgba(15,18,25,0.85);border:1px solid ${color};border-radius:6px;padding:3px 6px;font-family:monospace;font-size:10px;color:${color};white-space:nowrap;backdrop-filter:blur(4px)">
          ${dm.days}d — ${dm.label}
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [-8, 12],
      });
      L.marker(dm.position, { icon }).addTo(deadlineGroup);
    });
    layerGroupsRef.current['deadlines'] = deadlineGroup;

    // Environment: Stock Health
    const stockGroup = L.layerGroup();
    ENVIRONMENT_ZONES.forEach(ez => {
      const color = HEALTH_COLORS[ez.health];
      L.circle(ez.center, {
        radius: ez.radius, color, fillColor: color,
        fillOpacity: ez.health === 'poor' ? 0.2 : ez.health === 'moderate' ? 0.12 : 0.06,
        weight: 1.5, dashArray: '6 4',
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px">${ez.label}<br><span style="color:${color};font-weight:bold">${ez.health.toUpperCase()}</span> — ${ez.species}</span>`,
        { className: 'dark-tooltip' }
      ).addTo(stockGroup);
    });
    layerGroupsRef.current['stock_health'] = stockGroup;

    // Environment: Migration patterns
    const migrationGroup = L.layerGroup();
    MIGRATION_PATHS.forEach(mp => {
      L.polyline(mp.points, {
        color: '#22c55e', weight: 2, opacity: 0.5, dashArray: '8 6',
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px">🐟 ${mp.species} migration</span>`,
        { sticky: true, className: 'dark-tooltip' }
      ).addTo(migrationGroup);
      // Arrow markers at endpoints
      const last = mp.points[mp.points.length - 1];
      const arrowIcon = L.divIcon({
        className: '',
        html: `<div style="color:#22c55e;font-size:14px">➤</div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker(last, { icon: arrowIcon }).addTo(migrationGroup);
    });
    layerGroupsRef.current['migration'] = migrationGroup;

    // Environment: Protected species hotspots
    const protectedGroup = L.layerGroup();
    PROTECTED_HOTSPOTS.forEach(ph => {
      L.circle(ph.center, {
        radius: ph.radius, color: '#a855f7', fillColor: '#a855f7',
        fillOpacity: 0.12, weight: 2, dashArray: '3 3',
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;color:#a855f7">🛡 ${ph.label}</span>`,
        { className: 'dark-tooltip' }
      ).addTo(protectedGroup);
    });
    layerGroupsRef.current['protected_species'] = protectedGroup;

    // Intelligence: Competitor activity
    const competitorGroup = L.layerGroup();
    COMPETITOR_CLUSTERS.forEach(cc => {
      L.circle(cc.center, {
        radius: cc.radius, color: '#eab308', fillColor: DENSITY_COLORS[cc.density],
        fillOpacity: 1, weight: 1, dashArray: '4 4',
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;color:#eab308">📡 AIS: ${cc.density} density</span>`,
        { className: 'dark-tooltip' }
      ).addTo(competitorGroup);
    });
    layerGroupsRef.current['competitor_activity'] = competitorGroup;

    // Intelligence: Best available zones
    const bestGroup = L.layerGroup();
    BEST_ZONES.forEach(bz => {
      L.circle(bz.center, {
        radius: bz.radius, color: '#22c55e', fillColor: '#22c55e',
        fillOpacity: 0.08, weight: 2,
      }).addTo(bestGroup);
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:rgba(15,18,25,0.85);border:1px solid #22c55e;border-radius:6px;padding:3px 8px;font-family:monospace;font-size:10px;color:#22c55e;white-space:nowrap;backdrop-filter:blur(4px)">
          ✦ ${bz.label} — ${bz.score}/100
        </div>`,
        iconSize: [0, 0], iconAnchor: [-8, 12],
      });
      L.marker(bz.center, { icon }).addTo(bestGroup);
    });
    layerGroupsRef.current['best_zones'] = bestGroup;

    // Intelligence: Historical catch heatmap
    const histGroup = L.layerGroup();
    const histZones: { center: [number, number]; radius: number; catches: number; label: string }[] = [
      { center: [-12, -115], radius: 300000, catches: 2840, label: 'EPO-3 Central' },
      { center: [-10, 65], radius: 280000, catches: 1950, label: 'IO-4 West' },
      { center: [35, -40], radius: 250000, catches: 1200, label: 'NA-2 Core' },
    ];
    histZones.forEach(hz => {
      const opacity = Math.min(hz.catches / 3000, 0.3);
      L.circle(hz.center, {
        radius: hz.radius, color: '#38bdf8', fillColor: '#38bdf8',
        fillOpacity: opacity, weight: 1,
      }).bindTooltip(
        `<span style="font-family:monospace;font-size:11px;color:#38bdf8">📊 ${hz.label}<br>${hz.catches}t caught (12mo)</span>`,
        { className: 'dark-tooltip' }
      ).addTo(histGroup);
    });
    layerGroupsRef.current['historical_catch'] = histGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupsRef.current = {};
    };
  }, [zones, vessels]);

  // Sync active layers with map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(layerGroupsRef.current).forEach(([id, group]) => {
      if (activeLayers.has(id)) {
        if (!map.hasLayer(group)) map.addLayer(group);
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    });
  }, [activeLayers]);

  // Fly to selected zone
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    polygonLayersRef.current.forEach((polygon, id) => {
      const zone = zones.find(z => z.id === id);
      if (!zone) return;
      const isSelected = selectedZone?.id === id;
      polygon.setStyle({
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 0.4 : zone.status === 'green' ? 0.08 : 0.25,
      });
    });

    if (selectedZone) {
      const lats = (selectedZone.coordinates as [number, number][]).map(c => c[0]);
      const lngs = (selectedZone.coordinates as [number, number][]).map(c => c[1]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      map.flyTo([centerLat, centerLng], 4, { duration: 1 });
    }
  }, [selectedZone, zones]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Layer Control */}
      <LayerPanel activeLayers={activeLayers} onToggle={toggleLayer} />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-1.5">
        <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Zones</span>
        {[
          { color: 'bg-destructive', label: 'Active Alert' },
          { color: 'bg-warning', label: 'Watch' },
          { color: 'bg-success', label: 'Clear' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {selectedZone && <ZoneDetailPanel zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </div>
  );
}
