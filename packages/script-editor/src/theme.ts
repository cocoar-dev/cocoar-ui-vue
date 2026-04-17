import type * as monaco from 'monaco-editor';

export const COAR_THEME_LIGHT = 'coar-light';
export const COAR_THEME_DARK = 'coar-dark';

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
 * Resolves the Monaco theme name for a given prop value. For `'auto'`, uses
 * `detectAutoTheme()` (class / attribute / OS). For explicit `'light'`/`'dark'`, returns the
 * corresponding theme unconditionally.
 */
export function resolveTheme(theme: CoarScriptEditorTheme): string {
  if (theme === 'light') return COAR_THEME_LIGHT;
  if (theme === 'dark') return COAR_THEME_DARK;
  return detectAutoTheme();
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
    observer.observe(t, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }

  return () => {
    mq?.removeEventListener?.('change', mqListener);
    observer.disconnect();
  };
}
