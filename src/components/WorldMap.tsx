import { useState, type KeyboardEvent } from 'react';
import { Faction, WorldState, TradeRouteState, RegionState, SecondaryEncounter } from '@/game/types';

interface WorldMapProps {
  world: WorldState;
  factions: Faction[];
  highlightEncounter?: SecondaryEncounter | null;
}

const factionFill = (faction: Faction['color']) => {
  switch (faction) {
    case 'iron':
      return 'hsl(var(--faction-iron))';
    case 'verdant':
      return 'hsl(var(--faction-verdant))';
    case 'ember':
      return 'hsl(var(--faction-ember))';
  }
};

const hashToUnit = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 1000) / 1000;
};

const pickControlledRegion = (
  regions: RegionState[],
  factionId: string,
) => regions.find(r => r.control === factionId) ?? null;

const inferRouteEndpoints = (
  route: TradeRouteState,
  regions: RegionState[],
): [string, string] | null => {
  const regionIds = new Set(regions.map(r => r.id));

  if (route.fromRegionId && route.toRegionId && regionIds.has(route.fromRegionId) && regionIds.has(route.toRegionId)) {
    return [route.fromRegionId, route.toRegionId];
  }

  // Legacy save fallback: some older route objects used `from`/`to`.
  const legacy = route as TradeRouteState & { from?: string; to?: string };
  if (legacy.from && legacy.to && regionIds.has(legacy.from) && regionIds.has(legacy.to)) {
    return [legacy.from, legacy.to];
  }

  if (route.affectedFactions.length >= 2) {
    const a = pickControlledRegion(regions, route.affectedFactions[0]);
    const b = pickControlledRegion(regions, route.affectedFactions[1]);
    if (a && b) return [a.id, b.id];
  }

  const regionList = regions.map(r => r.id);
  if (regionList.length < 2) return null;

  const seed = hashToUnit(route.id);
  const first = Math.floor(seed * regionList.length);
  const second = (first + 1 + Math.floor(hashToUnit(route.name) * (regionList.length - 1))) % regionList.length;

  return [regionList[first], regionList[second]];
};

const WorldMap = ({ world, factions, highlightEncounter }: WorldMapProps) => {
  const regions = Object.values(world.regions).sort((a, b) => a.name.localeCompare(b.name));
  const routes = Object.values(world.tradeRoutes).sort((a, b) => a.name.localeCompare(b.name));

  const highlightRouteId = highlightEncounter?.routeId;
  const highlightRegionId = highlightEncounter?.regionId;

  const factionById = new Map(factions.map(f => [f.id, f] as const));

  type MapSelection =
    | { kind: 'region'; id: string }
    | { kind: 'route'; id: string }
    | null;

  const [selection, setSelection] = useState<MapSelection>(null);

  const toggleSelection = (next: Exclude<MapSelection, null>) => {
    setSelection(prev => (prev?.kind === next.kind && prev.id === next.id ? null : next));
  };

  const handleSvgActivate = (event: KeyboardEvent, onActivate: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };

  const viewBox = { w: 320, h: 220 };
  const center = { x: viewBox.w / 2, y: viewBox.h / 2 };

  const seededPositions: Record<string, { x: number; y: number }> = {
    crownlands: { x: 168, y: 122 },
    greenmarch: { x: 152, y: 64 },
    ironhold: { x: 86, y: 124 },
    verdantwilds: { x: 222, y: 82 },
    embercoast: { x: 242, y: 170 },
  };

  const positions = new Map<string, { x: number; y: number }>();

  const fallbackRegionIds = regions
    .map(r => r.id)
    .filter(id => typeof seededPositions[id] === 'undefined');

  const radius = 78;
  fallbackRegionIds.forEach((id, i) => {
    const t = fallbackRegionIds.length <= 1 ? 0 : i / fallbackRegionIds.length;
    const angle = Math.PI * 2 * t - Math.PI / 2;
    positions.set(id, {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  });

  for (const [id, pos] of Object.entries(seededPositions)) {
    positions.set(id, pos);
  }

  const regionPolygon = (regionId: string) => {
    const pos = positions.get(regionId);
    if (!pos) return null;

    const base = 28;
    const noise = hashToUnit(regionId) * 0.18;
    const r = base * (0.9 + noise);

    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const k = 0.92 + hashToUnit(`${regionId}:${i}`) * 0.18;
      return {
        x: pos.x + r * k * Math.cos(angle),
        y: pos.y + r * k * Math.sin(angle),
      };
    });

    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  };

  const resolveRegionFill = (region: RegionState) => {
    if (region.control === 'neutral') {
      return 'hsl(var(--secondary))';
    }

    const faction = factionById.get(region.control);
    if (!faction) return 'hsl(var(--secondary))';

    return factionFill(faction.color);
  };

  const routeGeometry = (route: TradeRouteState) => {
    const endpoints = inferRouteEndpoints(route, regions);
    if (!endpoints) return null;

    const a = positions.get(endpoints[0]);
    const b = positions.get(endpoints[1]);
    if (!a || !b) return null;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const bendSign = hashToUnit(route.id) > 0.5 ? 1 : -1;
    const bend = route.status === 'raided' ? 26 : 18;
    const control = { x: mid.x + nx * bend * bendSign, y: mid.y + ny * bend * bendSign };

    const d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

    return { d, mid };
  };

  const selectedRegion = selection?.kind === 'region' ? world.regions[selection.id] ?? null : null;
  const selectedRoute = selection?.kind === 'route' ? world.tradeRoutes[selection.id] ?? null : null;

  const selectedRouteEndpoints = selectedRoute ? inferRouteEndpoints(selectedRoute, regions) : null;

  const formatFactionNames = (ids: string[]) => ids.map(id => factionById.get(id)?.name ?? id).join(', ');

  return (
    <div className="parchment-border rounded-sm bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">World Map</h3>
        <span className="font-display text-[10px] text-muted-foreground">Regions & Routes</span>
      </div>

      <svg
        className="mt-3 h-56 w-full rounded-sm bg-background/20"
        viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
        role="img"
        aria-label="World map"
      >
        <defs>
          <pattern id="contested-pattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.35" />
          </pattern>
          <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Trade routes */}
        <g>
          {routes.map(route => {
            const geom = routeGeometry(route);
            if (!geom) return null;

            const { d, mid } = geom;

            const stroke =
              route.status === 'embargoed'
                ? 'hsl(var(--blood))'
                : route.status === 'raided'
                ? 'hsl(var(--gold-glow))'
                : 'hsl(var(--parchment))';

            const dash =
              route.status === 'embargoed'
                ? '7 5'
                : route.status === 'raided'
                ? '2 7'
                : undefined;

            const width = route.status === 'raided' ? 2.6 : 2.1;

            const isHighlighted = route.id === highlightRouteId;
            const groupOpacity = isHighlighted ? 1 : route.status === 'open' ? 0.55 : 0.9;
            const displayWidth = isHighlighted ? width + 0.7 : width;

            const crossAt = { x: mid.x, y: mid.y };

            return (
              <g key={route.id} opacity={groupOpacity}>
                {isHighlighted && (
                  <path
                    d={d}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={displayWidth + 2.6}
                    opacity={0.18}
                    filter="url(#route-glow)"
                  />
                )}

                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={displayWidth}
                  strokeDasharray={dash}
                  filter={route.status === 'raided' || isHighlighted ? 'url(#route-glow)' : undefined}
                >
                  <title>{`${route.name} — ${route.status}`}</title>
                </path>

                {route.status === 'embargoed' && (
                  <g stroke={stroke} strokeWidth={2} strokeLinecap="round">
                    <line x1={crossAt.x - 5} y1={crossAt.y - 5} x2={crossAt.x + 5} y2={crossAt.y + 5} />
                    <line x1={crossAt.x - 5} y1={crossAt.y + 5} x2={crossAt.x + 5} y2={crossAt.y - 5} />
                  </g>
                )}

                {route.status === 'raided' && (
                  <circle cx={crossAt.x} cy={crossAt.y} r={3} fill={stroke} opacity={0.85} />
                )}
              </g>
            );
          })}
        </g>

        {/* Regions */}
        <g>
          {regions.map(region => {
            const points = regionPolygon(region.id);
            if (!points) return null;

            const fill = resolveRegionFill(region);
            const contested = Boolean(region.contested);
            const isHighlighted = region.id === highlightRegionId;

            const controlLabel =
              region.control === 'neutral'
                ? 'Neutral'
                : factionById.get(region.control)?.name ?? region.control;

            const pos = positions.get(region.id)!;

            const isSelected = selection?.kind === 'region' && selection.id === region.id;

            return (
              <g
                key={region.id}
                role="button"
                tabIndex={0}
                aria-label={`Select region ${region.name}`}
                aria-pressed={isSelected}
                onClick={() => toggleSelection({ kind: 'region', id: region.id })}
                onKeyDown={event => handleSvgActivate(event, () => toggleSelection({ kind: 'region', id: region.id }))}
                style={{ cursor: 'pointer' }}
              >
                <polygon
                  points={points}
                  fill={fill}
                  opacity={0.7}
                  stroke="hsl(var(--border))"
                  strokeWidth={1.2}
                >
                  <title>{`${region.name} — ${controlLabel}${contested ? ' (Contested)' : ''}`}</title>
                </polygon>

                {contested && (
                  <polygon
                    points={points}
                    fill="url(#contested-pattern)"
                    opacity={0.6}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {isHighlighted && (
                  <polygon
                    points={points}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.4}
                    opacity={0.65}
                    strokeLinejoin="round"
                  />
                )}

                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="select-none"
                  fontFamily="var(--font-display)"
                  fontSize="10"
                  fill="hsl(var(--foreground))"
                  opacity={0.9}
                >
                  {region.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Route interaction layer (keeps visual routes underneath regions) */}
        <g>
          {routes.map(route => {
            const geom = routeGeometry(route);
            if (!geom) return null;

            const isSelected = selection?.kind === 'route' && selection.id === route.id;

            return (
              <path
                key={`route-hit:${route.id}`}
                d={geom.d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                pointerEvents="stroke"
                role="button"
                tabIndex={0}
                aria-label={`Select route ${route.name}`}
                aria-pressed={isSelected}
                onClick={() => toggleSelection({ kind: 'route', id: route.id })}
                onKeyDown={event => handleSvgActivate(event, () => toggleSelection({ kind: 'route', id: route.id }))}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>
      </svg>

      {(selectedRegion || selectedRoute) && (
        <div className="mt-3 rounded-sm border border-border bg-background/20 p-2 text-[11px]" aria-live="polite">
          {selectedRegion && (() => {
            const controlLabel =
              selectedRegion.control === 'neutral'
                ? 'Neutral'
                : factionById.get(selectedRegion.control)?.name ?? selectedRegion.control;

            return (
              <div className="flex flex-col gap-1">
                <div className="font-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Selected Region</div>
                <div className="text-xs text-foreground">{selectedRegion.name}</div>
                <div className="text-[10px] text-muted-foreground">Control: {controlLabel}</div>
                <div className="text-[10px] text-muted-foreground">Status: {selectedRegion.contested ? 'Contested' : 'Stable'}</div>
              </div>
            );
          })()}

          {selectedRoute && (() => {
            const affected = formatFactionNames(selectedRoute.affectedFactions);
            const endpoints = selectedRouteEndpoints
              ? selectedRouteEndpoints
                  .map(id => world.regions[id]?.name ?? id)
                  .join(' ↔ ')
              : 'Unknown';

            return (
              <div className="flex flex-col gap-1">
                <div className="font-display text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Selected Route</div>
                <div className="text-xs text-foreground">{selectedRoute.name}</div>
                <div className="text-[10px] text-muted-foreground">Status: {selectedRoute.status}</div>
                <div className="text-[10px] text-muted-foreground">Affected: {affected || '—'}</div>
                <div className="text-[10px] text-muted-foreground">Endpoints: {endpoints}</div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
          <span>Contested</span>
          <span className="ml-3 inline-block h-px w-6" style={{ backgroundColor: 'hsl(var(--parchment))', opacity: 0.6 }} />
          <span>Open</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-block h-px w-6" style={{ backgroundColor: 'hsl(var(--blood))', opacity: 0.9 }} />
          <span>Embargoed</span>
          <span className="ml-3 inline-block h-px w-6" style={{ backgroundColor: 'hsl(var(--gold-glow))', opacity: 0.9 }} />
          <span>Raided</span>
        </div>

        <div className="flex flex-col gap-1">
          {routes.map(route => (
            <div key={route.id} className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate pr-2">{route.name}</span>
              <span
                className={
                  route.status === 'open'
                    ? 'text-muted-foreground'
                    : route.status === 'embargoed'
                    ? 'text-destructive'
                    : 'text-primary'
                }
              >
                {route.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
