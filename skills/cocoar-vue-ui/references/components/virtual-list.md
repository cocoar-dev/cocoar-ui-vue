<!-- Generated from apps/docs/components/virtual-list.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Virtual List

`useVirtualList` is a framework-agnostic composable that returns the slice of rows currently inside the viewport (plus an overscan buffer). Use it to render very large lists without putting thousands of DOM nodes in the tree. It's the primitive behind [`CoarListbox`'s virtual mode](./listbox.md#virtual-scrolling), but is independently exported and usable in any Vue component that scrolls.

```ts
import { useVirtualList } from '@cocoar/vue-ui';
```

## Standalone example

The demo below is a plain `<div>` scroller — **no listbox involved**. 50,000 synthetic log lines are described by data, but only ~20 rows are ever in the DOM:

**Demo — `virtual-list/demos/StandaloneVirtualLog.vue`**

```vue
<template>
  <div>
    <div class="toolbar">
      <button type="button" @click="scrollToMiddle">Scroll to 25,000</button>
      <button type="button" @click="scrollToEnd">Scroll to end</button>
      <span class="muted">Rendered: {{ virtualRows.length }} / {{ logs.length.toLocaleString() }} rows</span>
    </div>
    <div ref="scrollRef" class="log">
      <!-- Spacer provides the full virtual height so the browser's native scrollbar is accurate. -->
      <div class="spacer" :style="{ height: totalSize + 'px' }">
        <div
          v-for="row in virtualRows"
          :key="row.index"
          class="line"
          :class="`line--${logs[row.index].level}`"
          :style="{ transform: `translateY(${row.start}px)`, height: row.size + 'px' }"
        >
          <span class="idx">{{ String(row.index + 1).padStart(5, '0') }}</span>
          <span class="lvl">{{ logs[row.index].level.toUpperCase() }}</span>
          <span class="msg">{{ logs[row.index].message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useVirtualList } from '@cocoar/vue-ui';

interface LogLine { level: 'info' | 'warn' | 'error'; message: string }

const LEVELS: LogLine['level'][] = ['info', 'info', 'info', 'info', 'warn', 'error'];
const MSG_POOL = [
  'Served GET /api/principals in 14ms',
  'Cache miss on token-introspect; re-fetching',
  'Scheduled cleanup tick — no candidates',
  'POST /teams/42/members (batch 12)',
  'Upstream 502 — retry 2/3 queued',
  'Rate limit 4/sec threshold reached',
  'Invalidated cache segment users:42',
  'WS heartbeat latency 83ms',
  'Released connection back to pool (id=17)',
  'User alice.mueller logged in from 10.0.3.22',
];

const logs: LogLine[] = Array.from({ length: 50_000 }, (_, i) => ({
  level: LEVELS[i % LEVELS.length],
  message: `${MSG_POOL[i % MSG_POOL.length]} — seq ${i}`,
}));

const scrollRef = useTemplateRef<HTMLElement>('scrollRef');

const { virtualRows, totalSize, scrollToIndex } = useVirtualList({
  count: logs.length,
  itemSize: 22,
  overscan: 8,
  scrollElement: scrollRef,
});

function scrollToMiddle() { scrollToIndex(25000, 'start'); }
function scrollToEnd() { scrollToIndex(logs.length - 1, 'end'); }
</script>

<style scoped>
.toolbar {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; font-size: 12px;
}
.toolbar button {
  border: 1px solid #d1d5db; background: white;
  padding: 4px 10px; border-radius: 3px; cursor: pointer;
  font-size: 12px;
}
.toolbar button:hover { background: #f3f4f6; }
.muted { color: #64748b; margin-left: auto; }
.log {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #0f172a;
  color: #cbd5e1;
  font-family: 'Cascadia Code', Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 22px;
}
.spacer { position: relative; }
.line {
  position: absolute;
  left: 0; right: 0;
  display: flex; gap: 10px; padding: 0 10px;
  white-space: nowrap;
  overflow: hidden;
}
.idx { color: #475569; flex-shrink: 0; }
.lvl { flex-shrink: 0; font-weight: 600; width: 48px; }
.line--info .lvl { color: #60a5fa; }
.line--warn .lvl { color: #fbbf24; }
.line--error .lvl { color: #f87171; }
.msg { overflow: hidden; text-overflow: ellipsis; }
</style>
```

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
