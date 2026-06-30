/**
 * Pure (Leaflet-free) model helpers for `<CoarMap>`. Kept separate so they can
 * be unit-tested without a DOM or the Leaflet runtime.
 */
import type { MapBasemap, MapCategory, MapConfig, MapData, MapPoint } from '../types';

/** Build a quick lookup of category id → category. */
export function categoryMap(config: MapConfig): Map<string, MapCategory> {
  const map = new Map<string, MapCategory>();
  for (const category of config.categories ?? []) map.set(category.id, category);
  return map;
}

/** Resolved color for a stop marker (its category color, else a neutral blue). */
export function stopColor(point: MapPoint, config: MapConfig): string {
  const category = point.category ? categoryMap(config).get(point.category) : undefined;
  return category?.color ?? '#3b82f6';
}

/** Resolved emoji for a stop marker: explicit `icon` wins, else the category's. */
export function stopEmoji(point: MapPoint, config: MapConfig): string {
  if (point.icon) return point.icon;
  const category = point.category ? categoryMap(config).get(point.category) : undefined;
  return category?.emoji ?? '';
}

/** One row of the JS-free fallback list. */
export interface FallbackEntry {
  emoji: string;
  label: string;
  lat: number;
  lng: number;
}

/**
 * Rows for the crawlable / no-JS fallback: every **stop**, plus **named** shape
 * points. Unnamed shape points (pure line geometry) are excluded. Stops use
 * their category/custom emoji; named shape points use a `•`.
 */
export function fallbackEntries(data: MapData, config: MapConfig): FallbackEntry[] {
  const out: FallbackEntry[] = [];
  for (const point of data.points) {
    if (point.kind === 'stop') {
      out.push({
        emoji: stopEmoji(point, config) || '📍',
        label: point.label ?? '',
        lat: point.lat,
        lng: point.lng,
      });
    } else if (point.label) {
      out.push({ emoji: '•', label: point.label, lat: point.lat, lng: point.lng });
    }
  }
  return out;
}

/**
 * Distinct categories present among stops, in first-seen order, resolved against
 * the registry. The component shows a legend only when this has ≥ 2 entries.
 */
export function legendCategories(data: MapData, config: MapConfig): MapCategory[] {
  const cats = categoryMap(config);
  const seen = new Set<string>();
  const out: MapCategory[] = [];
  for (const point of data.points) {
    if (point.kind !== 'stop' || !point.category || seen.has(point.category)) continue;
    seen.add(point.category);
    const category = cats.get(point.category);
    if (category) out.push(category);
  }
  return out;
}

/**
 * Pick the basemap to render: the map's own `basemap`, else the config default,
 * else the first non-Google basemap. Google basemaps are skipped (unsupported in
 * this version). Returns `null` when no usable basemap exists.
 */
export function resolveBasemap(data: MapData, config: MapConfig): MapBasemap | null {
  const byId = new Map(config.basemaps.map((b) => [b.id, b] as const));
  const usable = (id: string | undefined): MapBasemap | undefined => {
    if (!id) return undefined;
    const basemap = byId.get(id);
    return basemap && !basemap.google ? basemap : undefined;
  };
  return (
    usable(data.basemap) ??
    usable(config.defaultBasemap) ??
    config.basemaps.find((b) => !b.google) ??
    null
  );
}

/** Bounding box `[[minLat, minLng], [maxLat, maxLng]]` of all points, or `null`. */
export function boundsOf(
  points: readonly MapPoint[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
