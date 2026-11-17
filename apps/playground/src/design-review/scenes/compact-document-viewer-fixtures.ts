/**
 * Fixed data of the `compact-document-viewer*` stories: gallery pages as inline SVG
 * (no fetch, no worker) and one annotation of each type with fixed timestamps.
 */
import type { CoarPdfAnnotation } from '@cocoar/vue-document-viewer';

function page(index: number, bg: string, fg: string, width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <rect x="${width * 0.1}" y="${height * 0.12}" width="${width * 0.8}" height="${height * 0.06}" fill="${fg}" opacity="0.7"/>
  <rect x="${width * 0.1}" y="${height * 0.26}" width="${width * 0.6}" height="${height * 0.025}" fill="${fg}" opacity="0.35"/>
  <rect x="${width * 0.1}" y="${height * 0.31}" width="${width * 0.7}" height="${height * 0.025}" fill="${fg}" opacity="0.35"/>
  <rect x="${width * 0.1}" y="${height * 0.45}" width="${width * 0.8}" height="${height * 0.3}" fill="${fg}" opacity="0.15"/>
  <circle cx="${width * 0.85}" cy="${height * 0.9}" r="${height * 0.04}" fill="${fg}" opacity="${0.2 + index * 0.2}"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const galleryUrls = [
  page(1, '#ffffff', '#1e3a8a', 800, 1100),
  page(2, '#ffffff', '#78350f', 800, 1100),
  page(3, '#ffffff', '#14532d', 1100, 800),
];

export const annotations: CoarPdfAnnotation[] = [
  {
    id: 'a-comment',
    type: 'comment',
    pageIndex: 0,
    color: '#f59e0b',
    createdAt: '2026-11-10T09:00:00Z',
    createdBy: 'Alice Johnson',
    anchor: { x: 0.72, y: 0.2 },
    comment: 'Bitte die Überschrift kürzen — sie bricht auf dem Telefon um.',
  },
  {
    id: 'a-marker',
    type: 'marker',
    pageIndex: 0,
    color: '#facc15',
    createdAt: '2026-11-10T09:05:00Z',
    createdBy: 'Bob Smith',
    width: 14,
    strokes: [[{ x: 0.1, y: 0.275 }, { x: 0.68, y: 0.275 }]],
    comment: 'Key figure',
  },
  {
    id: 'a-ink',
    type: 'ink',
    pageIndex: 0,
    color: '#dc2626',
    createdAt: '2026-11-11T14:30:00Z',
    width: 3,
    strokes: [[{ x: 0.15, y: 0.5 }, { x: 0.3, y: 0.62 }, { x: 0.45, y: 0.52 }, { x: 0.6, y: 0.66 }]],
  },
  {
    id: 'a-freetext',
    type: 'freetext',
    pageIndex: 1,
    color: '#2563eb',
    createdAt: '2026-11-12T08:15:00Z',
    rect: { x: 0.12, y: 0.82, w: 0.5, h: 0.06 },
    text: 'Approved',
    fontSize: 18,
  },
];
