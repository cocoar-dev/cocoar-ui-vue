/**
 * Options resolution for the choice elements (select / multi-select /
 * radio-group — and consumer elements alike): a node-level `optionsSourceId`
 * resolved through `config.optionsSource` wins over the static `options`
 * array; static stays the default and the fallback when no resolver is
 * configured. While a load is in flight the list is empty; a failed or
 * malformed load stays empty and warns once per component.
 */
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { OptionItem } from '../schema';
import { usePageElement } from './usePageElement';

interface OptionProps {
  options?: OptionItem[];
  optionsSourceId?: string;
}

function isOptionItem(o: unknown): o is OptionItem {
  return (
    !!o && typeof o === 'object' &&
    typeof (o as OptionItem).value === 'string' &&
    typeof (o as OptionItem).label === 'string'
  );
}

/** Must be called during component setup (uses the page-element context). */
export function useResolvedOptions(getProps: () => OptionProps): Readonly<Ref<OptionItem[]>> {
  const ctx = usePageElement();
  const options = ref<OptionItem[]>([]);
  let warned = false;
  // Stale-response guard: only the latest request may write the list.
  let requestSeq = 0;

  watchEffect(() => {
    const props = getProps();
    const sourceId = props.optionsSourceId;
    const resolver = ctx.config?.optionsSource;
    if (sourceId && resolver) {
      const seq = ++requestSeq;
      options.value = [];
      // Promise.resolve wrapper: a synchronously-throwing resolver must land
      // in the catch, not take the render down.
      Promise.resolve()
        .then(() => resolver(sourceId))
        .then((list) => {
          if (seq !== requestSeq) return;
          options.value = Array.isArray(list) ? list.filter(isOptionItem) : [];
        })
        .catch((e) => {
          if (seq !== requestSeq) return;
          options.value = [];
          if (!warned) {
            warned = true;
            console.warn(
              `[CoarPageRenderer] optionsSource(${JSON.stringify(sourceId)}) failed — options stay empty.`,
              e,
            );
          }
        });
    } else {
      requestSeq++;
      options.value = Array.isArray(props.options) ? props.options : [];
    }
  });

  return options;
}
