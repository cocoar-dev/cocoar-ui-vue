// What the docs' PhoneFrame (.vitepress/theme/PhoneFrame.vue) and the mobile app agree on.

export type Scheme = 'light' | 'dark';

/** `?embed`: the app runs inside a PhoneFrame and hides its own header. */
export const EMBED_PARAM = 'embed';
/** `?scheme=light|dark`: the colour scheme to start with. */
export const SCHEME_PARAM = 'scheme';
/** `postMessage` payload from the frame when its scheme changes, same origin only. */
export const SCHEME_MESSAGE = 'coar-mobile-docs:scheme';

export function isScheme(value: unknown): value is Scheme {
  return value === 'light' || value === 'dark';
}

/**
 * Site path (without the docs' base) of the mobile docs, or of one demo:
 * `mobileDocsPath('form', { embed: true, scheme: 'dark' })` → `/mobile/?embed=1&scheme=dark#/form`.
 */
export function mobileDocsPath(demo = '', options: { embed?: boolean; scheme?: Scheme } = {}) {
  const query = new URLSearchParams();
  if (options.embed) query.set(EMBED_PARAM, '1');
  if (options.scheme) query.set(SCHEME_PARAM, options.scheme);
  const search = query.toString();
  return `/mobile/${search ? `?${search}` : ''}#/${demo}`;
}
