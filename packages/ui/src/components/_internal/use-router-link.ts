import { resolveDynamicComponent } from 'vue';

/**
 * Shared soft-Vue-Router-integration helper used by `CoarSidebarItem`,
 * `CoarMenuItem`, `CoarButton`, and `CoarLink`. Detects whether `RouterLink`
 * is globally registered (via `app.use(router)`) without taking a hard
 * dependency on `vue-router` — `resolveDynamicComponent` returns the
 * resolved component when present or the literal string `'RouterLink'`
 * otherwise; the string-vs-component check is the canonical Vue 3 detection
 * pattern.
 *
 * Also exposes a one-shot warning for the silent-footgun case: consumer
 * passes a non-string `to` (an object route literal like `{ name: 'docs' }`)
 * to a component that has no router available — we fall back to
 * `<a href={String(to)}>` which renders `href="[object Object]"` and never
 * navigates. The warning fires at most once per call site and only in DEV
 * builds; production output is silent.
 */
export interface RouterLinkBinding {
  /** Resolved `<RouterLink>` component, or the string `'RouterLink'` if unregistered. */
  RouterLink: ReturnType<typeof resolveDynamicComponent>;
  /** True when `vue-router` is installed AND its plugin registered globally. */
  hasRouterLink: boolean;
  /**
   * Call from the consuming component (typically inside the same setup block
   * where `to` is read for the first time) to emit a DEV-only warning when
   * `to` is an object but no router is installed. Idempotent — fires only
   * once per `useRouterLink()` call.
   */
  warnIfMisconfigured(toValue: unknown, componentName: string): void;
}

export function useRouterLink(): RouterLinkBinding {
  const RouterLink = resolveDynamicComponent('RouterLink');
  const hasRouterLink = typeof RouterLink !== 'string';

  let warned = false;

  function warnIfMisconfigured(toValue: unknown, componentName: string): void {
    if (warned || hasRouterLink) return;
    if (toValue === null || toValue === undefined || typeof toValue === 'string') return;
    // Skip in production. `import.meta.env.DEV` is statically replaced by
    // Vite at build time (true in dev, false in prod) so the whole branch
    // is tree-shaken out of release bundles.
    if (typeof import.meta !== 'undefined' && import.meta.env && !import.meta.env.DEV) return;
    warned = true;
    console.warn(
      `[${componentName}] \`to\` was passed as a non-string value (${typeof toValue}) but ` +
        `\`vue-router\` is not installed. Falling back to <a href="${String(toValue)}"> which ` +
        `will not navigate. Pass a string path, or install + register vue-router.`,
    );
  }

  return { RouterLink, hasRouterLink, warnIfMisconfigured };
}
