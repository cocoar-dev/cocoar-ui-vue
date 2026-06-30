/**
 * Public data + config contract for `<CoarMap>`.
 *
 * The component is fed *resolved* data — it has no notion of ids, fetching, or
 * any embedding/markdown layer. A consumer resolves whatever source it has
 * (a store, an API, a `:::map{id}` directive — its choice) into a {@link MapData}.
 */

export type MapType = 'single' | 'multi' | 'route';

/** `stop` = a marker; `shape` = a vertex of the route/line geometry. */
export type MapPointKind = 'stop' | 'shape';

export interface MapPoint {
  lat: number;
  lng: number;
  kind: MapPointKind;
  label?: string;
  note?: string;
  /** `stop` only — category id (drives marker color + the legend). */
  category?: string;
  /** `stop` only — emoji override; falls back to the category's emoji. */
  icon?: string;
}

export interface MapViewport {
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface MapData {
  type: MapType;
  caption?: string;
  /** Basemap id; falls back to {@link MapConfig.defaultBasemap}. */
  basemap?: string;
  /** Fixed viewport; when omitted the map auto-fits all points. */
  viewport?: MapViewport;
  points: MapPoint[];
}

export interface MapCategory {
  id: string;
  label: string;
  emoji?: string;
  color: string;
}

export interface MapBasemap {
  id: string;
  /** Leaflet tile URL template, e.g. `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. */
  url: string;
  subdomains?: string;
  attribution?: string;
  maxZoom?: number;
  /**
   * Marks a Google basemap. **Not supported in this version** — a Google
   * basemap is skipped and the default (non-Google) basemap is used instead.
   * Kept on the contract so a registry can carry it for a future release.
   */
  google?: boolean;
  googleType?: string;
}

export interface MapConfig {
  /** Basemap id used when a map specifies none (or specifies a Google one). */
  defaultBasemap: string;
  basemaps: MapBasemap[];
  /** Category registry — drives stop marker colors and the legend. */
  categories?: MapCategory[];
}
