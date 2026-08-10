import type { PageVisualFont, PageVisualMarkupConfig } from '../../schema';

const HARD_MAX_HTML_LENGTH = 100_000;
const HARD_MAX_CSS_LENGTH = 50_000;

const HTML_TAGS = new Set([
  'div', 'span', 'p', 'small', 'strong', 'em', 'b', 'i', 's', 'br',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
]);
const SVG_TAGS = new Set([
  'svg', 'g', 'defs', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask',
]);
const GLOBAL_ATTRIBUTES = new Set(['class', 'id', 'style', 'aria-hidden', 'role', 'dir', 'lang']);
const SVG_ATTRIBUTES = new Set([
  'xmlns', 'viewbox', 'preserveaspectratio', 'width', 'height',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'transform',
  'gradientunits', 'gradienttransform', 'offset', 'stop-color', 'stop-opacity',
  'clip-path', 'mask', 'text-anchor', 'dominant-baseline', 'font-size', 'font-weight',
]);

export interface VisualDocumentResult {
  ok: boolean
  srcdoc: string
  errors: string[]
}

function boundedLimit(configured: number | undefined, fallback: number, hardMax: number): number {
  if (!Number.isFinite(configured)) return fallback;
  return Math.min(hardMax, Math.max(1, Math.floor(configured!)));
}

function hasUnsafeCssToken(value: string): boolean {
  return /<\s*\/\s*style|@import|@namespace|@font-face|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(value);
}

function safeInlineStyle(value: string): boolean {
  return value.length <= 2_000 && !hasUnsafeCssToken(value) && !/[<>]/.test(value);
}

function sanitizeMarkup(html: string): { html: string; errors: string[] } {
  if (typeof DOMParser === 'undefined') {
    return { html: '', errors: ['Visual markup requires a browser DOM parser.'] };
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const errors: string[] = [];

  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase();
    const isSvg = element.namespaceURI === 'http://www.w3.org/2000/svg' || SVG_TAGS.has(tag);
    if (!(isSvg ? SVG_TAGS : HTML_TAGS).has(tag)) {
      errors.push(`Element <${tag}> is not allowed in decorative visuals.`);
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'href' || name === 'xlink:href' || name === 'src') {
        errors.push(`Attribute "${attribute.name}" is not allowed on <${tag}>.`);
        continue;
      }
      const allowed = GLOBAL_ATTRIBUTES.has(name) || (isSvg && SVG_ATTRIBUTES.has(name));
      if (!allowed) {
        errors.push(`Attribute "${attribute.name}" is not allowed on <${tag}>.`);
        continue;
      }
      if (name === 'style' && !safeInlineStyle(attribute.value)) {
        errors.push(`Inline style on <${tag}> contains a forbidden construct.`);
      }
    }
  }

  return errors.length ? { html: '', errors: [...new Set(errors)] } : { html: doc.body.innerHTML, errors: [] };
}

function safeThemeVariables(values: PageVisualMarkupConfig['themeVariables']): string {
  const declarations: string[] = [];
  for (const [name, raw] of Object.entries(values ?? {})) {
    const value = String(raw);
    if (!/^--[A-Za-z0-9_-]{1,80}$/.test(name)) continue;
    if (!value || value.length > 240 || /[;{}<>]/.test(value) || hasUnsafeCssToken(value)) continue;
    declarations.push(`${name}:${value}`);
  }
  return declarations.length ? `:root{${declarations.join(';')}}` : '';
}

function safeFontSource(src: string): boolean {
  return /^data:font\/(?:woff2?|ttf|otf|sfnt);base64,[A-Za-z0-9+/=]+$/i.test(src)
    || /^blob:https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/i.test(src);
}

function fontFace(font: PageVisualFont): string {
  if (!font.id || !/^[A-Za-z0-9._-]{1,100}$/.test(font.id)) return '';
  if (!font.family || font.family.length > 120 || !/^[\p{L}\p{N} _.-]+$/u.test(font.family)) return '';
  if (!safeFontSource(font.src)) return '';
  const weight = font.weight && /^(?:normal|bold|[1-9]00|[1-9]00\s+[1-9]00)$/.test(font.weight)
    ? font.weight
    : 'normal';
  const style = font.style ?? 'normal';
  const display = font.display ?? 'swap';
  const format = font.format ? ` format("${font.format}")` : '';
  return `@font-face{font-family:${JSON.stringify(font.family)};src:url("${font.src}")${format};font-weight:${weight};font-style:${style};font-display:${display}}`;
}

/**
 * Builds the complete opaque-origin visual document. CSP + the empty iframe
 * sandbox are the authority boundary; strict markup/CSS allowlists are defense
 * in depth and provide actionable builder diagnostics.
 */
export function buildVisualDocument(
  html: string,
  css = '',
  config: PageVisualMarkupConfig = {},
): VisualDocumentResult {
  const htmlLimit = boundedLimit(config.maxHtmlLength, HARD_MAX_HTML_LENGTH, HARD_MAX_HTML_LENGTH);
  const cssLimit = boundedLimit(config.maxCssLength, HARD_MAX_CSS_LENGTH, HARD_MAX_CSS_LENGTH);
  const errors: string[] = [];
  if (html.length > htmlLimit) errors.push(`HTML exceeds the ${htmlLimit} character limit.`);
  if (css.length > cssLimit) errors.push(`CSS exceeds the ${cssLimit} character limit.`);
  if (hasUnsafeCssToken(css) || /<\s*\/\s*style/i.test(css)) {
    errors.push('CSS contains external-resource, dynamic, or document-breaking syntax.');
  }
  const sanitized = errors.length ? { html: '', errors: [] } : sanitizeMarkup(html);
  errors.push(...sanitized.errors);
  if (errors.length) return { ok: false, srcdoc: '', errors: [...new Set(errors)] };

  const hostFonts = (config.fonts ?? []).map(fontFace).filter(Boolean).join('');
  const theme = safeThemeVariables(config.themeVariables);
  const csp = [
    "default-src 'none'",
    "script-src 'none'",
    "connect-src 'none'",
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'font-src data: blob:',
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
  const reset = '*,*::before,*::after{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}body{overflow:hidden}img,svg{display:block;max-width:100%}';
  return {
    ok: true,
    errors: [],
    srcdoc: `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><style>${reset}${hostFonts}${theme}${css}</style></head><body>${sanitized.html}</body></html>`,
  };
}
