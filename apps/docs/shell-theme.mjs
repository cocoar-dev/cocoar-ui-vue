/**
 * Whether the VitePress frame of the docs (navigation, sidebar, prose) takes the library's
 * theme, or keeps the VitePress look. The components follow the Theme Editor either way.
 * Off by default; the choice is kept in this browser.
 */
export const SHELL_THEME_KEY = 'coar-docs-shell-theme';
export const SHELL_THEME_CLASS = 'coar-docs-themed';
export const SHELL_THEME_EVENT = 'coar-docs:shell-theme-changed';

/** Apply the saved choice before VitePress paints; no browser access during SSR. */
export const SHELL_THEME_INIT_SCRIPT = `(() => {
  try {
    document.documentElement.classList.toggle(${JSON.stringify(SHELL_THEME_CLASS)},
      window.localStorage.getItem(${JSON.stringify(SHELL_THEME_KEY)}) === 'on');
  } catch { /* Blocked storage keeps the VitePress look. */ }
})();`;

/** @returns {boolean} */
export function shellThemed() {
  return document.documentElement.classList.contains(SHELL_THEME_CLASS);
}

/** @param {boolean} on */
export function setShellThemed(on) {
  document.documentElement.classList.toggle(SHELL_THEME_CLASS, on);
  try {
    window.localStorage.setItem(SHELL_THEME_KEY, on ? 'on' : 'off');
  } catch {
    // The choice still holds for this visit.
  }
  window.dispatchEvent(new CustomEvent(SHELL_THEME_EVENT));
}
