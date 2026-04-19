# Virtual List

`useVirtualList` is a framework-agnostic composable that returns the slice of rows currently inside the viewport (plus an overscan buffer). Use it to render very large lists without putting thousands of DOM nodes in the tree. It's the primitive behind [`CoarListbox`'s virtual mode](/components/listbox#virtual-scrolling), but is independently exported and usable in any Vue component that scrolls.

```ts
import { useVirtualList } from '@cocoar/vue-ui';
```

## Standalone example

The demo below is a plain `<div>` scroller — **no listbox involved**. 50,000 synthetic log lines are described by data, but only ~20 rows are ever in the DOM:

<preview path="./virtual-list/demos/StandaloneVirtualLog.vue" />

## When to reach for it

- Pre-loaded catalogs of a few thousand+ items that would otherwise jank the browser
- Chat history, timelines, command logs
- Large custom tables you build yourself (not for `CoarDataGrid`, which handles this internally)
- Any component with a scroll container where DOM-node count is the bottleneck

If your data is backend-paginated and can be filtered server-side, virtual scrolling is rarely necessary — the DOM stays small on its own.

## Usage

```ts
import { useTemplateRef } from 'vue';
import { useVirtualList } from '@cocoar/vue-ui';

const scrollRef = useTemplateRef<HTMLElement>('scrollRef');

const { virtualRows, totalSize, scrollToIndex } = useVirtualList({
  count: () => items.value.length,
  itemSize: 32,
  overscan: 5,
  scrollElement: scrollRef,
});
```

Template skeleton — a spacer establishes the full scroll height and each visible row is absolutely positioned at its offset:

```vue
<div ref="scrollRef" style="overflow: auto; height: 400px;">
  <div :style="{ height: totalSize + 'px', position: 'relative' }">
    <div
      v-for="row in virtualRows"
      :key="row.index"
      :style="{
        position: 'absolute', left: 0, right: 0,
        transform: `translateY(${row.start}px)`,
        height: row.size + 'px',
      }"
    >
      {{ items[row.index] }}
    </div>
  </div>
</div>
```

## Variable item heights

`itemSize` accepts either a fixed number or a per-index callback. Groups, headings, or mixed content get different heights while the cumulative-offset math stays O(log n) per scroll event:

```ts
useVirtualList({
  count: () => entries.value.length,
  itemSize: (index) => entries.value[index].isHeading ? 28 : 44,
  scrollElement: scrollRef,
});
```

## API

### `UseVirtualListOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `count` | `MaybeRefOrGetter<number>` | — | Total item count. Reactive — changes trigger a recomputation of the offset table. |
| `itemSize` | `MaybeRefOrGetter<number \| (index) => number>` | — | Fixed pixel height, or a per-index function for variable heights. |
| `overscan` | `MaybeRefOrGetter<number>` | `5` | Extra rows rendered above/below the viewport as a scroll buffer. |
| `scrollElement` | `Ref<HTMLElement \| null>` | — | The scrolling container. Attach via `useTemplateRef`. |

### Return value

| Field | Type | Description |
|---|---|---|
| `virtualRows` | `ComputedRef<VirtualRow[]>` | The rows currently in the viewport + overscan window. |
| `totalSize` | `ComputedRef<number>` | Sum of all item heights — bind this to your spacer's `height`. |
| `scrollToIndex` | `(index, align?) => void` | Programmatically scroll an index into view. `align`: `'auto'` (default), `'start'`, `'center'`, `'end'`. |
| `offsetFor` | `(index) => number` | Debug/test helper — returns the cumulative pixel offset for an index. |

### `VirtualRow`

| Field | Type | Description |
|---|---|---|
| `index` | `number` | Position in the underlying list (0-based). |
| `start` | `number` | Pixel offset from the top of the spacer. Use `translateY(start)`. |
| `size` | `number` | Row height in pixels. |

## Behavior notes

- **Fixed viewport:** the composable tracks the container's `clientHeight` on every scroll event and — when available — via a `ResizeObserver`. In environments without `ResizeObserver`, it falls back to the `window.resize` event.
- **SSR-safe:** the `ResizeObserver` and DOM access are all guarded; the composable returns empty rows until the scroll element is mounted.
- **Binary-search offset table:** `count` and `itemSize` are reactive. Changing them rebuilds the cumulative offset array (`O(n)` once); scroll events then binary-search (`O(log n)`) for the visible window.
- **Dynamic measurement** (rendering items and measuring their actual heights) is *not* supported — pick an `itemSize` or function that matches your row heights. For the common "some rows are 32px, some are 48px" case, per-index function is enough.
