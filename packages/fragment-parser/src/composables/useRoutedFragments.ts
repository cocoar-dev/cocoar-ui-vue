import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { parseFragment } from '../lib/fragment-parser';
import type { ParsedRoute } from '../lib/fragment-parser';
import type { RoutedFragmentBase } from '../lib/routed-fragment';

/**
 * Composable that reactively parses URL fragments against registered routes.
 * Re-evaluates whenever the URL hash changes.
 *
 * @param routes - Optional explicit routes. If not provided, reads from `route.meta.routedFragments`.
 *
 * @example
 * ```ts
 * const { fragments } = useRoutedFragments();
 * // fragments is a computed<ParsedRoute[]> that updates on hash change
 *
 * watchEffect(() => {
 *   for (const f of fragments.value) {
 *     console.log(f.route.type, f.params);
 *   }
 * });
 * ```
 */
export function useRoutedFragments<T extends RoutedFragmentBase = RoutedFragmentBase>(
  routes?: T[],
) {
  const route = useRoute();

  const fragments = computed<ParsedRoute<T>[]>(() => {
    const hash = route.hash.replace(/^#/, '');
    if (!hash) return [];

    const registeredRoutes = routes ?? (route.meta?.routedFragments as T[] | undefined) ?? [];
    if (registeredRoutes.length === 0) return [];

    return parseFragment(hash, registeredRoutes);
  });

  return { fragments };
}
