/**
 * Shared inline SVG fixtures used by the document-viewer demo SFCs. Inlined
 * as `data:` URLs so the demos work offline (no fetch, no CORS, no worker).
 */

export const SINGLE_IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <rect width="100%" height="100%" fill="#f0f9ff"/>
  <text x="600" y="120" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="#0c4a6e">imageSource() demo</text>
  <text x="600" y="170" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#0369a1">Single-page image — no pdfjs in the bundle path</text>
  <rect x="120" y="260" width="280" height="200" fill="#7c3aed" rx="16"/>
  <text x="260" y="370" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Rectangle</text>
  <circle cx="600" cy="360" r="100" fill="#f59e0b"/>
  <text x="600" y="370" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Circle</text>
  <polygon points="930,260 1080,460 780,460" fill="#10b981"/>
  <text x="930" y="430" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">Triangle</text>
  <text x="600" y="600" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#0c4a6e">Same viewer, same toolbar</text>
  <text x="600" y="640" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#475569">Tools the source doesn't support stay disabled (not hidden)</text>
  <text x="600" y="730" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#94a3b8">1200 × 800 px</text>
</svg>`,
)}`;

function galleryPage(opts: {
  idx: number;
  total: number;
  bg: string;
  fg: string;
  w: number;
  h: number;
  label: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.w} ${opts.h}" width="${opts.w}" height="${opts.h}">
  <rect width="100%" height="100%" fill="${opts.bg}"/>
  <text x="${opts.w / 2}" y="${opts.h * 0.18}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.06)}" font-weight="700" fill="${opts.fg}">Gallery page ${opts.idx} of ${opts.total}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.28}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.025)}" fill="${opts.fg}">${opts.label}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.5}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.15)}" font-weight="700" fill="${opts.fg}" opacity="0.4">${opts.idx}</text>
  <text x="${opts.w / 2}" y="${opts.h * 0.93}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(opts.h * 0.022)}" fill="${opts.fg}" opacity="0.6">${opts.w} × ${opts.h} px</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const GALLERY_URLS = [
  galleryPage({ idx: 1, total: 3, bg: '#eff6ff', fg: '#1e3a8a', w: 1200, h: 800, label: 'Landscape — cover page' }),
  galleryPage({ idx: 2, total: 3, bg: '#fef3c7', fg: '#78350f', w: 800, h: 1200, label: 'Portrait — different aspect ratio' }),
  galleryPage({ idx: 3, total: 3, bg: '#dcfce7', fg: '#14532d', w: 1400, h: 700, label: 'Wide — final page' }),
];
