import { reactive } from 'vue';

/**
 * Trying a font in the Theme Editor without installing it first.
 *
 * A theme only names a font family; the application loads the font. To see a font
 * before deciding, the editor fetches a family this page does not have from Google
 * Fonts, for the preview only: nothing of it reaches the downloaded theme, which
 * says instead what the application has to load (`fontNotes`).
 *
 * The request leaves the page (and sends the visitor's IP address to Google), so it
 * happens only for a family somebody chose in the editor, never on mount, and
 * `CoarThemeEditor` can switch it off (`fontPreview: false`).
 */

export type FontRole = 'body' | 'title';

/** Where the font of a role comes from, as far as the editor can tell. */
export type FontSource =
  /** A generic family (`system-ui`): nothing to load. */
  | 'generic'
  /** The page has a font face of that family: the application loads it. */
  | 'page'
  /** A preview is being fetched. */
  | 'loading'
  /** Shown from Google Fonts, for the preview only. */
  | 'google'
  /** Google Fonts has no such family: visible only where the font is installed. */
  | 'unknown'
  /** Not on the page and previews are off: the fallback shows. */
  | 'off';

export const fontSources = reactive<Record<FontRole, FontSource>>({ body: 'page', title: 'page' });

const GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif',
  'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong',
]);

/** The font entries of `@cocoar/vue-ui`: what an application imports for these families. */
const SHIPPED: Record<string, string> = {
  Poppins: "import '@cocoar/vue-ui/fonts'",
  Inter: "import '@cocoar/vue-ui/fonts' (weights 400 and 700) or '@cocoar/vue-ui/fonts/compact' (400 to 700)",
  Onest: "import '@cocoar/vue-ui/fonts/onest'",
};

const LINK_ATTRIBUTE = 'data-coar-font-preview';
/** The weights the text roles use. A family without all of them is fetched in its regular style. */
const WEIGHTS = 'wght@400;500;600;700';

let enabled = true;

export function setFontPreviewEnabled(value: boolean) {
  enabled = value;
}

/** A font family name as typed: one name, nothing that could leave a CSS declaration. */
export function cleanFontFamily(raw: string): string {
  return raw
    .split(',')[0]
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/** The family as it is written into CSS: quoted unless it is a plain identifier sequence. */
export function cssFontFamily(name: string): string {
  return /^[A-Za-z][A-Za-z-]*( [A-Za-z][A-Za-z-]*)*$/.test(name) ? name : `"${name}"`;
}

const isGeneric = (family: string) => GENERIC.has(family.toLowerCase());

function onPage(family: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  const wanted = family.toLowerCase();
  for (const face of document.fonts) {
    if (face.family.replace(/["']/g, '').toLowerCase() === wanted) return true;
  }
  return false;
}

const googleUrl = (family: string, weights: boolean) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${weights ? `:${WEIGHTS}` : ''}&display=swap`;

function previewLink(family: string): HTMLLinkElement | null {
  return document.head.querySelector<HTMLLinkElement>(`[${LINK_ATTRIBUTE}="${family}"]`);
}

/** The family each role currently shows, so a finished request reaches both. */
const waiting: Record<FontRole, string> = { body: '', title: '' };

/** Shows a family in a role: says where it comes from and, when the page lacks it, fetches a preview. */
export function showFont(role: FontRole, family: string) {
  waiting[role] = family;
  previewFont(role, family);
}

function previewFont(role: FontRole, family: string) {
  if (!family || isGeneric(family)) {
    fontSources[role] = 'generic';
    return;
  }
  if (typeof document === 'undefined') return;
  const existing = previewLink(family);
  if (existing) {
    fontSources[role] = (existing.dataset.coarFontState as FontSource | undefined) ?? 'loading';
    return;
  }
  if (onPage(family)) {
    fontSources[role] = 'page';
    return;
  }
  if (!enabled) {
    fontSources[role] = 'off';
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute(LINK_ATTRIBUTE, family);
  // Whichever role asked: every role showing this family follows the request.
  const settle = (state: FontSource) => {
    link.dataset.coarFontState = state;
    for (const key of Object.keys(waiting) as FontRole[]) {
      if (waiting[key] === family) fontSources[key] = state;
    }
  };
  link.addEventListener('load', () => settle('google'));
  link.addEventListener('error', () => {
    // No such family, or not in the four weights: once more in its regular style.
    if (link.href === googleUrl(family, true)) link.href = googleUrl(family, false);
    else settle('unknown');
  });
  link.dataset.coarFontState = 'loading';
  link.href = googleUrl(family, true);
  document.head.appendChild(link);
  fontSources[role] = 'loading';
}

/** Takes the editor's previews off the page again. */
export function removeFontPreviews() {
  if (typeof document === 'undefined') return;
  for (const link of document.head.querySelectorAll(`[${LINK_ATTRIBUTE}]`)) link.remove();
  waiting.body = '';
  waiting.title = '';
  fontSources.body = 'page';
  fontSources.title = 'page';
}

/**
 * What an application has to load for the fonts a theme names, as the comment that
 * heads the downloaded file. Empty when the theme names no font to load.
 */
export function fontNotes(families: string[]): string {
  const lines = [...new Set(families)]
    .filter((family) => family && !isGeneric(family))
    .map((family) => SHIPPED[family]
      ? ` *   ${family}: ${SHIPPED[family]}`
      : ` *   ${family}: not part of @cocoar/vue-ui. Load it in your app, self-hosted (for example an @fontsource package) or from your font provider.`);
  if (lines.length === 0) return '';
  return [
    '/*',
    ' * Fonts this theme names. The file does not contain them, and the Theme Editor',
    ' * only previewed them: load each one in your app.',
    ...lines,
    ' */',
    '',
  ].join('\n');
}
