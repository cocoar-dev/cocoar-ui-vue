/**
 * Pure (Leaflet-free) editing operations for `<CoarMapEditor>`.
 *
 * Every operation is **immutable** — it returns a fresh {@link MapData} (new
 * `points` array, new point objects only where changed) and never mutates its
 * input. This keeps `v-model:data` honest and the logic unit-testable without a
 * DOM or the Leaflet runtime. The component layer owns all Leaflet wiring; this
 * module owns the data model + the geometry maths.
 */
import type { MapData, MapPoint, MapPointKind, MapViewport } from '../types';

/** Partial initialiser for a new point — everything except its coordinates. */
export type NewPointInit = Partial<Omit<MapPoint, 'lat' | 'lng'>>;

/** Clamp latitude to its valid range and wrap longitude into `(-180, 180]`. */
export function normalizeLatLng(lat: number, lng: number): { lat: number; lng: number } {
  const clampedLat = Math.max(-90, Math.min(90, lat));
  let wrappedLng = ((lng + 180) % 360 + 360) % 360 - 180;
  if (wrappedLng === -180) wrappedLng = 180;
  return { lat: clampedLat, lng: wrappedLng };
}

function makePoint(lat: number, lng: number, init: NewPointInit, defaultKind: MapPointKind): MapPoint {
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng);
  return { kind: defaultKind, ...init, lat: nLat, lng: nLng };
}

function inBounds(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function withPoints(data: MapData, points: MapPoint[]): MapData {
  return { ...data, points };
}

/**
 * Add a point in a way that respects `data.type`:
 * - `single` → there is at most one point; move the existing one (preserving its
 *   props), else create a fresh stop.
 * - `multi`  → append a stop.
 * - `route`  → append a point to the end of the path (`stop` unless `init.kind`).
 */
export function addPointForType(data: MapData, lat: number, lng: number, init: NewPointInit = {}): MapData {
  if (data.type === 'single' && data.points.length >= 1) {
    return movePoint(data, 0, lat, lng);
  }
  const point = makePoint(lat, lng, init, 'stop');
  return withPoints(data, [...data.points, point]);
}

/** Move one point to new coordinates (no-op if `index` is out of range). */
export function movePoint(data: MapData, index: number, lat: number, lng: number): MapData {
  if (!inBounds(index, data.points.length)) return data;
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng);
  const points = data.points.map((p, i) => (i === index ? { ...p, lat: nLat, lng: nLng } : p));
  return withPoints(data, points);
}

/**
 * Shallow-merge a patch into one point (no-op if `index` is out of range).
 * Coordinates in the patch are normalized; `undefined` values in the patch are
 * dropped so they can't blow away existing fields.
 */
export function updatePoint(data: MapData, index: number, patch: Partial<MapPoint>): MapData {
  if (!inBounds(index, data.points.length)) return data;
  const clean: Partial<MapPoint> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (clean as Record<string, unknown>)[key] = value;
  }
  if ('lat' in clean || 'lng' in clean) {
    const base = data.points[index];
    const { lat, lng } = normalizeLatLng(clean.lat ?? base.lat, clean.lng ?? base.lng);
    clean.lat = lat;
    clean.lng = lng;
  }
  const points = data.points.map((p, i) => (i === index ? { ...p, ...clean } : p));
  return withPoints(data, points);
}

/** Remove one point (no-op if `index` is out of range). */
export function removePoint(data: MapData, index: number): MapData {
  if (!inBounds(index, data.points.length)) return data;
  return withPoints(data, data.points.filter((_, i) => i !== index));
}

/**
 * Move the point at `from` to position `to`, shifting the rest — used to reorder
 * route waypoints. No-op if either index is out of range or they are equal.
 */
export function reorderPoint(data: MapData, from: number, to: number): MapData {
  const len = data.points.length;
  if (!inBounds(from, len) || !inBounds(to, len) || from === to) return data;
  const points = [...data.points];
  const [moved] = points.splice(from, 1);
  points.splice(to, 0, moved);
  return withPoints(data, points);
}

/**
 * Insert a new point into the segment between `segmentIndex` and the next point
 * (i.e. it becomes the point at `segmentIndex + 1`). Used when the user clicks
 * directly on a route line to add a waypoint there. No-op if `segmentIndex` is
 * not a valid segment start (`0 .. length - 2`).
 */
export function insertOnSegment(
  data: MapData,
  segmentIndex: number,
  lat: number,
  lng: number,
  init: NewPointInit = {},
): MapData {
  if (!inBounds(segmentIndex, Math.max(0, data.points.length - 1))) return data;
  const point = makePoint(lat, lng, init, 'stop');
  const points = [...data.points];
  points.splice(segmentIndex + 1, 0, point);
  return withPoints(data, points);
}

/** Set (or clear, with `null`) the saved viewport. */
export function setViewport(data: MapData, viewport: MapViewport | null): MapData {
  if (viewport === null) {
    const rest = { ...data };
    delete rest.viewport;
    return rest;
  }
  return { ...data, viewport };
}

/** Squared distance from point `p` to the segment `a→b`, in planar lat/lng space. */
function distanceToSegmentSq(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): { distSq: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return { distSq: ex * ex + ey * ey, t };
}

/**
 * Find the polyline segment nearest to `(lat, lng)` and the point projected onto
 * it, so a click near the line can insert a waypoint that sits exactly on it.
 * `lat`/`lng` are treated as planar coordinates — accurate enough for picking a
 * segment at editing scale. Returns `null` for fewer than two points.
 */
export function nearestSegment(
  points: readonly MapPoint[],
  lat: number,
  lng: number,
): { segmentIndex: number; lat: number; lng: number } | null {
  if (points.length < 2) return null;
  let best = { segmentIndex: 0, distSq: Infinity, t: 0 };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const { distSq, t } = distanceToSegmentSq(lng, lat, a.lng, a.lat, b.lng, b.lat);
    if (distSq < best.distSq) best = { segmentIndex: i, distSq, t };
  }
  const a = points[best.segmentIndex];
  const b = points[best.segmentIndex + 1];
  return {
    segmentIndex: best.segmentIndex,
    lat: a.lat + best.t * (b.lat - a.lat),
    lng: a.lng + best.t * (b.lng - a.lng),
  };
}
