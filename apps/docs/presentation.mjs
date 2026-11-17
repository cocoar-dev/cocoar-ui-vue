/** One opt-in shared by the VitePress site, mobile docs and embedded demos. */
export const PRESENTATION_KEY = 'coar-docs-presentation';
export const PRESENTATION_EVENT = 'coar-docs:presentation-changed';
export const PRESENTATION_MESSAGE = 'coar-docs:presentation';
export const PRESENTATION_PARAM = 'presentation';

/** @param {unknown} value @returns {value is 'legacy' | 'compact'} */
export function isPresentation(value) {
  return value === 'legacy' || value === 'compact';
}

/** Apply the saved choice before VitePress paints; no browser access during SSR. */
export const PRESENTATION_INIT_SCRIPT = `(() => {
  try {
    document.documentElement.classList.toggle('coar-compact',
      window.localStorage.getItem(${JSON.stringify(PRESENTATION_KEY)}) === 'compact');
  } catch { /* Blocked storage keeps the server-rendered legacy default. */ }
})();`;

/** @returns {'legacy' | 'compact'} */
export function documentPresentation() {
  return document.documentElement.classList.contains('coar-compact') ? 'compact' : 'legacy';
}

/** @param {unknown} [preferred] */
export function restorePresentation(preferred) {
  let value = 'legacy';
  try {
    if (window.localStorage.getItem(PRESENTATION_KEY) === 'compact') value = 'compact';
  } catch {
    // The toggle still works for this visit when storage is unavailable.
  }
  if (isPresentation(preferred)) value = preferred;
  document.documentElement.classList.toggle('coar-compact', value === 'compact');
}

/** @param {'legacy' | 'compact'} value */
export function setPresentation(value) {
  document.documentElement.classList.toggle('coar-compact', value === 'compact');
  try {
    window.localStorage.setItem(PRESENTATION_KEY, value);
  } catch {
    // Keep the current document usable without persistence.
  }
  window.dispatchEvent(new CustomEvent(PRESENTATION_EVENT));
}
