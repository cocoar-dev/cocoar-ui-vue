import { onBeforeUnmount, shallowRef, watch } from 'vue';
import { ROLE_DERIVATION_MARKER, ROLE_DERIVATION_TOKEN } from '../../theme/role-theme';
import { COMPACT_CONTEXT_TOKENS } from './compact-context';

export interface CompactPresentationContext {
  classes: string[];
  style: Record<string, string>;
}

/**
 * Whether the element sits in a theme scope with active role derivation: the
 * `.coar-compact` entry, or any theme that sets `--coar-role-derivation`.
 */
export function hasRoleDerivation(element: Element | null | undefined): boolean {
  if (!element) return false;
  if (element.closest('.coar-compact')) return true;
  return getComputedStyle(element).getPropertyValue(ROLE_DERIVATION_MARKER).trim() === 'on';
}

/**
 * Gives a surface teleported out of a class-free theme the text of its scope (family,
 * size, weight, line height, colour; styles/tokens/derived.css). A class and not inline
 * values: the surface's own styles keep precedence, as they do over the `.coar-compact`
 * rule that states the same for that entry.
 */
export const THEME_SURFACE_CLASS = 'coar-theme-surface';

/**
 * Preview: explicit presentation transport for library surfaces teleported out
 * of their owning area. Only registered roles and consumer-authored inline
 * overrides are copied, never an arbitrary computed-property snapshot.
 *
 * The context is empty outside a scope with active role derivation. `classes`
 * names `coar-compact` only when the origin uses that entry; a theme applied
 * without it is carried by `style` alone.
 */
export function readCompactPresentationContext(
  source: Element | null | undefined,
): CompactPresentationContext {
  const result: CompactPresentationContext = { classes: [], style: {} };
  if (!source || !hasRoleDerivation(source)) return result;

  if (source.closest('.coar-compact')) result.classes.push('coar-compact');
  else result.classes.push(THEME_SURFACE_CLASS);
  if (source.closest('.coar-mobile')) result.classes.push('coar-mobile');
  const computed = getComputedStyle(source);
  const mode = source.closest('.light-mode, .dark-mode, [data-theme="light"], [data-theme="dark"]');
  const scheme = computed.colorScheme.trim();
  const dark = scheme === 'dark' || (scheme !== 'light' && Boolean(mode
    && (mode.classList.contains('dark-mode') || mode.getAttribute('data-theme') === 'dark')));
  result.classes.push(dark ? 'dark-mode' : 'light-mode');

  // The target is a scope of its own: nested boundaries in it derive again, and
  // its plain text and `light-dark()` values follow the origin.
  result.style[ROLE_DERIVATION_TOKEN] = ' ';
  // The marker is derived at theme boundaries only, and the target is none: without
  // it a nested overlay or a renderer in the target would not see the theme.
  result.style[ROLE_DERIVATION_MARKER] = 'on';
  result.style['color-scheme'] = dark ? 'dark' : 'light';

  for (const token of COMPACT_CONTEXT_TOKENS) {
    const value = computed.getPropertyValue(token).trim();
    // Absence is meaningful too: a body-level theme must not fill an input or
    // role that was intentionally unset at the origin (e.g. native radii).
    result.style[token] = value || 'initial';
  }
  // Include explicit overrides at any boundary, not just the outer opt-in:
  // a ThemeScope or an inner package can specialize one role independently.
  let ancestor: Element | null = source;
  while (ancestor) {
    if (ancestor instanceof HTMLElement) {
      for (let i = 0; i < ancestor.style.length; i += 1) {
        const token = ancestor.style.item(i);
        if (!token.startsWith('--coar-') || token === ROLE_DERIVATION_TOKEN) continue;
        const value = computed.getPropertyValue(token).trim();
        if (value) result.style[token] = value;
      }
    }
    ancestor = ancestor.parentElement;
  }
  return result;
}

/**
 * Preview: live theme context for custom teleports (editor tools, annotation
 * popovers). Returns an empty context outside a role theme, preserving legacy UI.
 * Observes only attributes of the source and its ancestors, never descendants.
 */
export function useCompactPresentationContext(source: () => Element | null | undefined) {
  const context = shallowRef<CompactPresentationContext>({ classes: [], style: {} });
  let observer: MutationObserver | undefined;
  const stop = watch(source, (element) => {
    observer?.disconnect();
    const update = () => { context.value = readCompactPresentationContext(element); };
    update();
    if (!element || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver(update);
    let ancestor: Element | null = element;
    while (ancestor) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-coar-theme-mode'],
      });
      ancestor = ancestor.parentElement;
    }
  }, { immediate: true, flush: 'post' });
  onBeforeUnmount(() => {
    stop();
    observer?.disconnect();
  });
  return context;
}
