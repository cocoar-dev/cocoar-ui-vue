/**
 * Fixed data of the `compact-map*` stories. No basemap: no tile layer is added, so the
 * pictures never depend on the network; the map shows Leaflet's container, markers,
 * the route, controls and attribution. Pin icons are plain letters (no emoji font).
 */
import type { MapConfig, MapData } from '@cocoar/vue-map';

export const config: MapConfig = {
  defaultBasemap: '',
  basemaps: [],
  categories: [
    { id: 'sight', label: 'Sights', emoji: 'S', color: '#a855f7' },
    { id: 'food', label: 'Food', emoji: 'F', color: '#f97316' },
    { id: 'nature', label: 'Nature', emoji: 'N', color: '#16a34a' },
  ],
};

export const data: MapData = {
  type: 'route',
  caption: 'Walking route through central London, about 6 km.',
  viewport: { centerLat: 51.5085, centerLng: -0.1395, zoom: 13 },
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', note: 'Start at the bridge', category: 'sight' },
    { lat: 51.5076, lng: -0.118, kind: 'shape', label: 'Thames bend' },
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', category: 'food' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
    { lat: 51.5074, lng: -0.1657, kind: 'stop', label: 'Hyde Park', category: 'nature' },
  ],
};
