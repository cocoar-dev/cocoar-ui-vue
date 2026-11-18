import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/**
 * What a role theme of `@cocoar/vue-ui` (styles/tokens/derived.css) leaves readable on
 * its scope: `on`. Read by name, because the viewer does not depend on that package.
 */
const ROLE_DERIVATION_MARKER = '--coar-d-role-derivation';

/**
 * Whether a role theme (Preview) is in effect at the element: decided by the values,
 * not by a class, and kept current while the theme of an ancestor changes.
 *
 * Leaflet's stylesheet is unlayered and loads after ours, so restyling its chrome
 * needs rules that outrank it. Such rules must not exist for a map without a theme
 * (they would also outrank an application's own Leaflet styles), which no selector
 * can express on a value: the map marks its root instead.
 */
export function useRoleTheme(element: Ref<HTMLElement | null>): Ref<boolean> {
  const themed = ref(false);
  let observer: MutationObserver | undefined;
  const stop = watch(
    element,
    (el) => {
      observer?.disconnect();
      const update = () => {
        themed.value =
          !!el && getComputedStyle(el).getPropertyValue(ROLE_DERIVATION_MARKER).trim() === 'on';
      };
      update();
      if (!el || typeof MutationObserver === 'undefined') return;
      observer = new MutationObserver(update);
      // The element's own class is ours to write: observe its ancestors only.
      for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor, {
          attributes: true,
          attributeFilter: ['class', 'style', 'data-theme', 'data-coar-theme-mode'],
        });
      }
    },
    { immediate: true, flush: 'post' },
  );
  onBeforeUnmount(() => {
    stop();
    observer?.disconnect();
  });
  return themed;
}
