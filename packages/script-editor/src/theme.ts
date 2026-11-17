import type * as monaco from 'monaco-editor';

export const COAR_THEME_LIGHT = 'coar-light';
export const COAR_THEME_DARK = 'coar-dark';

/**
 * Monaco themes of the opt-in `.coar-compact` presentation profile (Preview):
 * slate neutrals, line numbers legible at 4.5:1. Registered next to the legacy
 * themes, whose names and colors stay as they are.
 *
 * Monaco themes are global to the page (`monaco.editor.setTheme` restyles every
 * editor), so a compact theme is chosen only for a compact *document*:
 * `.coar-compact` on `<html>` or `<body>`. A local `.coar-compact` area in a
 * default page keeps the legacy theme inside Monaco; its frame (border, radius)
 * still follows the local profile. The registered colors are fallbacks;
 * refreshCompactTheme resolves the active shared roles to Monaco's hex format.
 */
export const COAR_THEME_COMPACT_LIGHT = 'coar-compact-light';
export const COAR_THEME_COMPACT_DARK = 'coar-compact-dark';

let themesDefined = false;

/**
 * Registers the Cocoar light/dark Monaco themes. Idempotent — safe to call on every mount.
 */
export function ensureCoarThemes(monacoNs: typeof monaco): void {
  if (themesDefined) return;

  monacoNs.editor.defineTheme(COAR_THEME_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1a1a1a',
      'editorLineNumber.foreground': '#9ca3af',
      'editorLineNumber.activeForeground': '#1a1a1a',
      'editor.selectionBackground': '#dbeafe',
      'editor.inactiveSelectionBackground': '#e5e7eb',
      'editorCursor.foreground': '#1a1a1a',
      'editor.lineHighlightBackground': '#f3f4f6',
      'editorIndentGuide.background': '#e5e7eb',
      'editorGutter.background': '#ffffff',
    },
  });

  monacoNs.editor.defineTheme(COAR_THEME_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': '#f3f4f6',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#f3f4f6',
      'editor.selectionBackground': '#1e40af',
      'editor.inactiveSelectionBackground': '#374151',
      'editorCursor.foreground': '#f3f4f6',
      'editor.lineHighlightBackground': '#262626',
      'editorIndentGuide.background': '#374151',
      'editorGutter.background': '#1a1a1a',
    },
  });

  monacoNs.editor.defineTheme(COAR_THEME_COMPACT_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#292f3b',
      'editorLineNumber.foreground': '#64748b',
      'editorLineNumber.activeForeground': '#292f3b',
      'editor.selectionBackground': '#cfdcf0',
      'editor.inactiveSelectionBackground': '#e2e8f0',
      'editorCursor.foreground': '#292f3b',
      'editor.lineHighlightBackground': '#f6f8fb',
      'editorIndentGuide.background': '#e2e8f0',
      'editorGutter.background': '#ffffff',
    },
  });

  monacoNs.editor.defineTheme(COAR_THEME_COMPACT_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#161b24',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#8691a3',
      'editorLineNumber.activeForeground': '#e2e8f0',
      'editor.selectionBackground': '#2c4a7a',
      'editor.inactiveSelectionBackground': '#273142',
      'editorCursor.foreground': '#e2e8f0',
      'editor.lineHighlightBackground': '#1d2430',
      'editorIndentGuide.background': '#273142',
      'editorGutter.background': '#161b24',
    },
  });

  themesDefined = true;
}

export type CoarScriptEditorTheme = 'auto' | 'light' | 'dark';

/**
 * Resolve the currently-active theme name based on three signals, in priority order:
 *  1. An explicit `.dark-mode` / `.light-mode` class on `<html>` or `<body>` (Cocoar
 *     convention — consumers toggle this via their app-level theme switcher).
 *  2. A `data-theme="dark"|"light"` attribute on `<html>` (common third-party convention).
 *  3. OS-level `prefers-color-scheme`.
 *
 * SSR-safe: returns the light theme when `document`/`window` are unavailable.
 */
export function detectAutoTheme(): string {
  if (typeof document === 'undefined') return COAR_THEME_LIGHT;

  const html = document.documentElement;
  const body = document.body;

  if (
    html?.classList.contains('dark-mode') ||
    body?.classList.contains('dark-mode') ||
    html?.classList.contains('dark') ||
    body?.classList.contains('dark')
  ) {
    return COAR_THEME_DARK;
  }
  if (
    html?.classList.contains('light-mode') ||
    body?.classList.contains('light-mode')
  ) {
    return COAR_THEME_LIGHT;
  }
  const dataTheme = html?.getAttribute('data-theme') ?? body?.getAttribute('data-theme');
  if (dataTheme === 'dark') return COAR_THEME_DARK;
  if (dataTheme === 'light') return COAR_THEME_LIGHT;

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return COAR_THEME_DARK;
  }
  return COAR_THEME_LIGHT;
}

/**
 * Whether the page as a whole uses the compact presentation profile:
 * `.coar-compact` on `<html>` or `<body>`. SSR-safe (false without a document).
 */
export function isCompactDocument(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.documentElement?.classList.contains('coar-compact') ||
      document.body?.classList.contains('coar-compact'),
  );
}

/**
 * Resolves the Monaco theme name for a given prop value. For `'auto'`, uses
 * `detectAutoTheme()` (class / attribute / OS). For explicit `'light'`/`'dark'`, returns the
 * corresponding theme unconditionally. In a compact document (see
 * {@link isCompactDocument}) the compact variant of that theme is returned instead.
 */
export function resolveTheme(theme: CoarScriptEditorTheme): string {
  const legacy =
    theme === 'light' ? COAR_THEME_LIGHT : theme === 'dark' ? COAR_THEME_DARK : detectAutoTheme();
  if (!isCompactDocument()) return legacy;
  return legacy === COAR_THEME_DARK ? COAR_THEME_COMPACT_DARK : COAR_THEME_COMPACT_LIGHT;
}

const COMPACT_COLOR_ROLES: Readonly<Record<string, string>> = {
  'editor.background': '--coar-background-neutral-primary',
  'editor.foreground': '--coar-text-neutral-primary',
  'editorLineNumber.foreground': '--coar-text-neutral-tertiary',
  'editorLineNumber.activeForeground': '--coar-text-neutral-primary',
  'editor.selectionBackground': '--coar-background-accent-secondary',
  'editor.inactiveSelectionBackground': '--coar-background-neutral-tertiary',
  'editorCursor.foreground': '--coar-text-neutral-primary',
  'editor.lineHighlightBackground': '--coar-background-neutral-secondary',
  'editorIndentGuide.background': '--coar-border-neutral-tertiary',
  'editorGutter.background': '--coar-background-neutral-primary',
  'editorWidget.background': '--coar-background-neutral-primary',
  'editorWidget.foreground': '--coar-text-neutral-primary',
  'editorWidget.border': '--coar-border-neutral-tertiary',
  'editorSuggestWidget.background': '--coar-background-neutral-primary',
  'editorSuggestWidget.foreground': '--coar-text-neutral-primary',
  'editorSuggestWidget.border': '--coar-border-neutral-tertiary',
  'editorSuggestWidget.selectedBackground': '--coar-background-accent-secondary',
  'editorSuggestWidget.selectedForeground': '--coar-text-accent-primary',
  'editorHoverWidget.background': '--coar-background-neutral-primary',
  'editorHoverWidget.foreground': '--coar-text-neutral-primary',
  'editorHoverWidget.border': '--coar-border-neutral-tertiary',
  'editorError.foreground': '--coar-text-semantic-error-bold',
  'editorWarning.foreground': '--coar-text-semantic-warning-bold',
  'editorInfo.foreground': '--coar-text-semantic-info-bold',
  focusBorder: '--coar-focus-color',
};

/**
 * Resolve shared compact roles at the document boundary. Monaco is page-global,
 * so local legacy/compact comparisons belong in separate documents.
 */
export function refreshCompactTheme(monacoNs: typeof monaco, name: string): void {
  if (name !== COAR_THEME_COMPACT_LIGHT && name !== COAR_THEME_COMPACT_DARK) return;
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const dark = name === COAR_THEME_COMPACT_DARK;
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.colorScheme = dark ? 'dark' : 'light';
  document.body.appendChild(probe);
  const colors: Record<string, string> = {};
  for (const [key, role] of Object.entries(COMPACT_COLOR_ROLES)) {
    if (!getComputedStyle(probe).getPropertyValue(role).trim()) continue;
    probe.style.color = `var(${role})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    const rgba = ctx.getImageData(0, 0, 1, 1).data;
    colors[key] = '#' + Array.from(rgba.slice(0, rgba[3] === 255 ? 3 : 4),
      (value) => value.toString(16).padStart(2, '0')).join('');
  }
  probe.remove();
  if (!Object.keys(colors).length) return;
  monacoNs.editor.defineTheme(name, {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors,
  });
}

/**
 * Sets up observers that fire `onChange` whenever the effective auto-theme could have
 * changed: media-query updates (OS dark-mode toggle), `<html>` / `<body>` class changes
 * (app-level theme switchers), or `data-theme` attribute changes. Returns a cleanup
 * function that removes all listeners.
 *
 * Consumers who pass `theme="light"` or `theme="dark"` explicitly don't need this — their
 * theme is static. Only wire it up while `auto` is active.
 */
export function watchAutoTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const mqListener = () => onChange();
  mq?.addEventListener?.('change', mqListener);

  const observer = new MutationObserver(() => onChange());
  const targets = [document.documentElement, document.body].filter(Boolean) as Element[];
  for (const t of targets) {
    observer.observe(t, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
  }

  return () => {
    mq?.removeEventListener?.('change', mqListener);
    observer.disconnect();
  };
}
