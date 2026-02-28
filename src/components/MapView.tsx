import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildMapZones, buildMapVessels, MapZone } from '@/data/mapData';
import { MOCK_ALERTS, MOCK_VESSELS } from '@/data/mockData';
import { getVesselStatusConfig, getSeverityConfig } from '@/lib/alertUtils';
import { Ship, ChevronRight, Fish, MapPin, Calendar, X } from 'lucide-react';
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

function ZoneDetailPanel({ zone, onClose }: { zone: MapZone; onClose: () => void }) {
  const alerts = MOCK_ALERTS.filter(a => zone.alertIds.includes(a.id));
  const vessels = MOCK_VESSELS.filter(v => zone.vesselIds.includes(v.id));
  const statusLabel = zone.status === 'red' ? 'CRITICAL' : zone.status === 'yellow' ? 'WATCH' : 'CLEAR';
  const statusText = zone.status === 'red'
    ? 'text-destructive'
    : zone.status === 'yellow'
    ? 'text-warning'
    : 'text-success';

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] z-[1000] bg-card/95 backdrop-blur-md border-l border-border shadow-2xl animate-slide-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-mono text-foreground">{zone.name}</h2>
          <Badge variant="outline" className={`text-[10px] font-mono ${statusText} border-current`}>
            {statusLabel}
          </Badge>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50 transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="h-[calc(100%-56px)]">
        <div className="p-4 space-y-4">
          {alerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                What Changed ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.map(alert => {
                  const sev = getSeverityConfig(alert.severity);
                  const Icon = sev.icon;
                  return (
                    <div key={alert.id} className={`rounded-md border p-3 ${sev.bgClassName}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`h-3.5 w-3.5 ${sev.className}`} />
                        <Badge variant="outline" className={`text-[9px] font-mono ${sev.badgeClassName}`}>
                          {alert.rfmo}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Fish className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[10px] font-mono text-muted-foreground">{alert.species}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[10px] font-mono text-muted-foreground">by {alert.actionDeadline}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Your Vessels Here ({vessels.length})
            </h3>
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
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Recommended Actions
              </h3>
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

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const zones = useMemo(() => buildMapZones(), []);
  const vessels = useMemo(() => buildMapVessels(), []);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());

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

    // Add zone polygons
    zones.forEach(zone => {
      const colors = STATUS_COLORS[zone.status];
      const polygon = L.polygon(zone.coordinates as L.LatLngExpression[], {
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity: zone.status === 'green' ? 0.08 : 0.25,
        weight: 1.5,
        dashArray: zone.status === 'green' ? '4 4' : undefined,
      }).addTo(map);

      polygon.bindTooltip(
        `<span style="font-family:monospace;font-size:11px">${zone.name} — ${
          zone.status === 'red' ? '⚠ Active Alert' : zone.status === 'yellow' ? '⚡ Watch' : '✓ Clear'
        }</span>`,
        { sticky: true, className: 'dark-tooltip' }
      );

      polygon.on('click', () => {
        setSelectedZone(prev => prev?.id === zone.id ? null : zone);
      });

      polygonLayersRef.current.set(zone.id, polygon);
    });

    // Add vessel markers
    vessels.forEach(vessel => {
      const color = VESSEL_COLORS[vessel.status];
      L.circleMarker(vessel.position as L.LatLngExpression, {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: vessel.status === 'at_risk' ? 2 : 1,
      })
        .bindTooltip(
          `<span style="font-family:monospace;font-size:11px">${vessel.flag} ${vessel.name}</span>`,
          { className: 'dark-tooltip' }
        )
        .addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [zones, vessels]);

  // Fly to selected zone and highlight
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    polygonLayersRef.current.forEach((polygon, id) => {
      const zone = zones.find(z => z.id === id);
      if (!zone) return;
      const colors = STATUS_COLORS[zone.status];
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-1.5">
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

      {selectedZone && (
        <ZoneDetailPanel zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}
    </div>
  );
}
