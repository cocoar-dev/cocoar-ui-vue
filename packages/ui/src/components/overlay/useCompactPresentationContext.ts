import { onBeforeUnmount, shallowRef, watch } from 'vue';
import { COMPACT_APPEARANCE_INPUT_TOKENS, COMPACT_CONTEXT_TOKENS } from './compact-context';

export interface CompactPresentationContext {
  classes: string[];
  style: Record<string, string>;
}

/**
 * Preview: explicit presentation transport for library surfaces teleported out
 * of their owning area. Only registered roles and consumer-authored inline
 * overrides are copied, never an arbitrary computed-property snapshot.
 */
export function readCompactPresentationContext(
  source: Element | null | undefined,
): CompactPresentationContext {
  const result: CompactPresentationContext = { classes: [], style: {} };
  if (!source?.closest('.coar-compact')) return result;

  result.classes.push('coar-compact');
  if (source.closest('.coar-mobile')) result.classes.push('coar-mobile');
  const computed = getComputedStyle(source);
  const mode = source.closest('.light-mode, .dark-mode, [data-theme="light"], [data-theme="dark"]');
  const scheme = computed.colorScheme.trim();
  const dark = scheme === 'dark' || (scheme !== 'light' && Boolean(mode
    && (mode.classList.contains('dark-mode') || mode.getAttribute('data-theme') === 'dark')));
  result.classes.push(dark ? 'dark-mode' : 'light-mode');

  for (const token of COMPACT_CONTEXT_TOKENS) {
    const value = computed.getPropertyValue(token).trim();
    if (value) result.style[token] = value;
    else if (COMPACT_APPEARANCE_INPUT_TOKENS.includes(token)) {
      // Empty inputs are meaningful at .coar-theme-none: do not accidentally
      // inherit the document's brand again after moving the tool to body.
      result.style[token] = 'initial';
    }
  }
  // Include explicit overrides at any boundary, not just the outer opt-in:
  // a ThemeScope or an inner package can specialize one role independently.
  let ancestor: Element | null = source;
  while (ancestor) {
    if (ancestor instanceof HTMLElement) {
      for (let i = 0; i < ancestor.style.length; i += 1) {
        const token = ancestor.style.item(i);
        if (!token.startsWith('--coar-')) continue;
        const value = computed.getPropertyValue(token).trim();
        if (value) result.style[token] = value;
      }
    }
    ancestor = ancestor.parentElement;
  }
  return result;
}

/**
 * Preview: live compact context for custom teleports (editor tools, annotation
 * popovers). Returns an empty context outside the opt-in, preserving legacy UI.
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
