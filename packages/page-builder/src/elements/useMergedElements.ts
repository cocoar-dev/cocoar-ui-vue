/**
 * The one registry resolution, shared by every surface (runtime renderer,
 * builder canvas, props panel, palette, validation): built-ins first,
 * consumer registrations merged additively over them. `config.elements` wins
 * over the app-wide `PAGE_ELEMENTS_KEY` provide. Reads reactively through the
 * config ref, so a swapped config object is honoured.
 */
import { computed, inject } from 'vue';
import type { ComputedRef } from 'vue';
import type { PageConfig } from '../schema';
import { BUILTIN_ELEMENTS } from './builtins';
import {
  mergeElementRegistries,
  PAGE_ELEMENTS_KEY,
  type PageElementRegistry,
} from './registry';

export function useMergedElements(
  config?: ComputedRef<PageConfig | undefined> | { value: PageConfig | undefined },
): ComputedRef<PageElementRegistry> {
  const appElements = inject(PAGE_ELEMENTS_KEY, undefined);
  return computed(() =>
    mergeElementRegistries(BUILTIN_ELEMENTS, config?.value?.elements ?? appElements),
  );
}
