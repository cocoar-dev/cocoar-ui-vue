import {
  nextTick,
  onBeforeUnmount,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type WatchSource,
} from 'vue';

/** Name of the shared CSS highlight — style it with `::highlight(coar-data-list-search)`. */
export const DATA_LIST_HIGHLIGHT_NAME = 'coar-data-list-search';

// Several lists on one page share the single named highlight, so each instance
// contributes its ranges to a registry and the union is re-registered.
const rangesByInstance = new Map<number, Range[]>();
let nextInstanceId = 0;

type HighlightRegistry = Map<string, Highlight>;

function highlightRegistry(): HighlightRegistry | null {
  if (typeof CSS === 'undefined' || !('highlights' in CSS) || typeof Highlight === 'undefined') return null;
  return CSS.highlights as unknown as HighlightRegistry;
}

function publish(): void {
  const registry = highlightRegistry();
  if (!registry) return;
  const all: Range[] = [];
  for (const ranges of rangesByInstance.values()) all.push(...ranges);
  if (all.length === 0) registry.delete(DATA_LIST_HIGHLIGHT_NAME);
  else registry.set(DATA_LIST_HIGHLIGHT_NAME, new Highlight(...all));
}

function collectRanges(root: HTMLElement, terms: readonly string[]): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent?.toLowerCase() ?? '';
    if (!text) continue;
    for (const term of terms) {
      let from = 0;
      while (from < text.length) {
        const at = text.indexOf(term, from);
        if (at === -1) break;
        const range = new Range();
        range.setStart(node, at);
        range.setEnd(node, at + term.length);
        ranges.push(range);
        from = at + term.length;
      }
    }
  }
  return ranges;
}

export interface UseSearchHighlightOptions {
  /** Element whose rendered text is scanned. */
  root: Ref<HTMLElement | null>;
  /** Raw query; split into lower-cased whitespace-separated terms. */
  query: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
  /** Extra sources that mean "the DOM under root changed" (e.g. the virtual window). */
  triggers?: WatchSource[];
}

/**
 * Marks search matches inside `root` with the CSS Custom Highlight API. Browsers
 * without the API simply show no highlight. Matching is case-insensitive on the
 * rendered text; diacritics are not folded here.
 */
export function useSearchHighlight(options: UseSearchHighlightOptions): void {
  const instanceId = nextInstanceId++;
  let pending = false;
  let unmounted = false;

  function apply(): void {
    pending = false;
    if (unmounted) return;
    const root = options.root.value;
    const terms = toValue(options.enabled)
      ? toValue(options.query).toLowerCase().split(/\s+/).filter((term) => term.length > 0)
      : [];
    if (!root || terms.length === 0 || !highlightRegistry()) {
      if (rangesByInstance.delete(instanceId)) publish();
      return;
    }
    rangesByInstance.set(instanceId, collectRanges(root, terms));
    publish();
  }

  // Coalesce bursts (query change + virtual window change in the same tick) into one
  // scan. `nextTick` rather than requestAnimationFrame: rAF is paused in background
  // tabs and absent in some test environments.
  function schedule(): void {
    if (pending) return;
    pending = true;
    void nextTick(apply);
  }

  watch(
    [options.root, () => toValue(options.query), () => toValue(options.enabled), ...(options.triggers ?? [])],
    schedule,
    { flush: 'post', immediate: true },
  );

  onBeforeUnmount(() => {
    unmounted = true;
    if (rangesByInstance.delete(instanceId)) publish();
  });
}
