<script setup lang="ts">
/**
 * Phase 0 / Spike D — drag stress demo (docs).
 *
 * 200 items, click-and-drag to reorder. Auto-scroll near edges via
 * `useCoarDrag` + `computeAutoScrollVelocity`. LoAF instrumentation.
 *
 * Mirrors the playground harness at `/calendar-drag`. Same logic,
 * docs-tokenized styles.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
  VirtualizedSurface1DY,
  hitTestVerticalSurface,
  useCoarDrag,
  type DragContext,
} from '@cocoar/vue-calendar';

interface Item {
  id: string;
  title: string;
  hue: number;
}

const ITEM_HEIGHT = 64;
const itemCount = ref(200);

const items = computed<Item[]>(() => {
  const out: Item[] = new Array(itemCount.value);
  for (let i = 0; i < itemCount.value; i++) {
    out[i] = {
      id: `item-${i}`,
      title: `Item #${i}`,
      hue: ((i * 137) >>> 0) % 360,
    };
  }
  return out;
});

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');
const surfaceContainerRef = ref<HTMLElement | null>(null);

const ghost = ref<{ x: number; y: number; visible: boolean; title: string; hue: number }>(
  { x: 0, y: 0, visible: false, title: '', hue: 0 },
);
const dropTargetIndex = ref<number>(-1);
const dropPosition = ref<'before' | 'after' | null>(null);
const lastDrop = ref<{ from: string; to: number; position: 'before' | 'after'; when: string } | null>(
  null,
);

const { isDragging, draggedData, startDrag } = useCoarDrag<Item>({
  surfaceRef: surfaceContainerRef,
  autoScroll: { hotZone: 40, maxVelocity: 24, curve: 'quadratic' },
  onDragStart: ({ event, data }) => {
    ghost.value = {
      x: event.clientX, y: event.clientY,
      visible: true, title: data.title, hue: data.hue,
    };
  },
  onDragMove: (ctx) => {
    ghost.value = {
      x: ctx.pointer.x, y: ctx.pointer.y,
      visible: true, title: ctx.data.title, hue: ctx.data.hue,
    };
    hitTest(ctx);
  },
  onDragEnd: (ctx) => {
    ghost.value = { ...ghost.value, visible: false };
    if (dropTargetIndex.value >= 0) {
      lastDrop.value = {
        from: ctx.data.id,
        to: dropTargetIndex.value,
        position: dropPosition.value ?? 'before',
        when: new Date().toLocaleTimeString(),
      };
    }
    dropTargetIndex.value = -1;
    dropPosition.value = null;
  },
  onDragCancel: () => {
    ghost.value = { ...ghost.value, visible: false };
    dropTargetIndex.value = -1;
    dropPosition.value = null;
  },
});

function hitTest(ctx: DragContext<Item>): void {
  const surface = surfaceContainerRef.value;
  if (!surface) return;
  const rect = surface.getBoundingClientRect();
  const cache = surfaceRef.value?.getCache();
  if (!cache) return;
  const hit = hitTestVerticalSurface(
    ctx.pointer.y, rect.top, surface.scrollTop, cache, rect.height,
  );
  if (hit.itemIndex >= 0) {
    dropTargetIndex.value = hit.itemIndex;
    dropPosition.value = hit.ratio < 0.5 ? 'before' : 'after';
  } else {
    dropTargetIndex.value = -1;
    dropPosition.value = null;
  }
}

onMounted(() => {
  surfaceContainerRef.value = surfaceRef.value?.getContainerElement() ?? null;
});

// LoAF
const loafSupported = ref(false);
const loafCount = ref(0);
const loafWorst = ref(0);
interface LoAFEntry { t: number; duration: number }
const loafRecent: LoAFEntry[] = [];
let loafObserver: PerformanceObserver | null = null;
function recomputeLoaf() {
  const cutoff = performance.now() - 5000;
  while (loafRecent.length > 0 && loafRecent[0].t < cutoff) loafRecent.shift();
  loafCount.value = loafRecent.length;
  let worst = 0;
  for (const e of loafRecent) if (e.duration > worst) worst = e.duration;
  loafWorst.value = Math.round(worst);
}
let loafSweepHandle = 0;
function loafSweep() { recomputeLoaf(); loafSweepHandle = window.setTimeout(loafSweep, 500); }
onMounted(() => {
  type PEWithType = typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] };
  const supports =
    typeof PerformanceObserver !== 'undefined' &&
    (PerformanceObserver as PEWithType).supportedEntryTypes?.includes('long-animation-frame');
  if (supports) {
    loafSupported.value = true;
    loafObserver = new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) loafRecent.push({ t: now, duration: entry.duration });
      recomputeLoaf();
    });
    try { loafObserver.observe({ type: 'long-animation-frame', buffered: true }); }
    catch { loafSupported.value = false; }
    loafSweep();
  }
});
onBeforeUnmount(() => {
  if (loafSweepHandle) clearTimeout(loafSweepHandle);
  loafObserver?.disconnect();
});
</script>

<template>
  <div class="stress-demo">
    <div class="stress-demo__metrics" aria-live="polite">
      <div class="stress-demo__metric stress-demo__metric--authoritative">
        <span class="stress-demo__label">⚖ Long frames (5s)</span>
        <span class="stress-demo__value" :class="{
          'stress-demo__value--good': loafSupported && loafCount === 0,
          'stress-demo__value--ok': loafSupported && loafCount > 0 && loafCount <= 3,
          'stress-demo__value--bad': loafSupported && loafCount > 3,
        }">{{ loafSupported ? loafCount : 'n/a' }}</span>
      </div>
      <div class="stress-demo__metric stress-demo__metric--authoritative">
        <span class="stress-demo__label">⚖ Worst frame (5s)</span>
        <span class="stress-demo__value" :class="{
          'stress-demo__value--good': loafSupported && loafWorst < 50,
          'stress-demo__value--ok': loafSupported && loafWorst >= 50 && loafWorst < 100,
          'stress-demo__value--bad': loafSupported && loafWorst >= 100,
        }">{{ loafSupported ? `${loafWorst} ms` : 'n/a' }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Dragging</span>
        <span class="stress-demo__value">{{ isDragging ? 'YES' : 'no' }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Drop target</span>
        <span class="stress-demo__value">
          {{ dropTargetIndex >= 0 ? `#${dropTargetIndex} (${dropPosition})` : '—' }}
        </span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Last drop</span>
        <span class="stress-demo__value">
          {{ lastDrop ? `${lastDrop.from} → ${lastDrop.to} ${lastDrop.position}` : '—' }}
        </span>
      </div>
    </div>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="items.length"
      :estimated-item-size="ITEM_HEIGHT"
      :fixed-item-size="ITEM_HEIGHT"
      :overscan="3"
      class="stress-demo__surface"
    >
      <template #item="{ y }">
        <div
          class="stress-demo__row"
          :class="{
            'stress-demo__row--drop-before':
              dropTargetIndex === y && dropPosition === 'before',
            'stress-demo__row--drop-after':
              dropTargetIndex === y && dropPosition === 'after',
            'stress-demo__row--dragging': draggedData?.id === items[y].id,
          }"
          :style="{ background: `hsl(${items[y].hue} 70% 95%)` }"
          @pointerdown="startDrag(items[y])($event)"
        >
          <span class="stress-demo__handle">⋮⋮</span>
          <span class="stress-demo__row-title">{{ items[y].title }}</span>
        </div>
      </template>
    </VirtualizedSurface1DY>

    <Teleport to="body">
      <div
        v-show="ghost.visible"
        class="stress-demo__ghost"
        :style="{
          transform: `translate(${ghost.x + 12}px, ${ghost.y + 4}px)`,
          background: `hsl(${ghost.hue} 70% 88%)`,
        }"
      >{{ ghost.title }}</div>
    </Teleport>
  </div>
</template>

<style scoped>
.stress-demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-space-3, 12px);
}

.stress-demo__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--coar-space-2, 8px);
  padding: var(--coar-space-3, 12px);
  background: var(--coar-surface-subtle, #f6f7f9);
  border: 1px solid var(--coar-border-subtle, #e3e5e9);
  border-radius: var(--coar-radius-md, 8px);
  font-variant-numeric: tabular-nums;
}
.stress-demo__metric { display: flex; flex-direction: column; gap: 2px; }
.stress-demo__metric--authoritative {
  background: rgba(37, 99, 235, 0.06);
  border-radius: 4px;
  padding: 2px 6px;
  margin: -4px -2px;
}
.stress-demo__label {
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stress-demo__value {
  font-size: var(--coar-font-size-base, 16px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.stress-demo__value--good { color: var(--coar-color-success, #16a34a); }
.stress-demo__value--ok { color: var(--coar-color-warning, #d97706); }
.stress-demo__value--bad { color: var(--coar-color-danger, #dc2626); }

.stress-demo__surface {
  height: 600px;
  border: 1px solid var(--coar-border-base, #d1d5db);
  border-radius: var(--coar-radius-md, 8px);
  background: var(--coar-surface-base, #fff);
}

.stress-demo__row {
  display: flex;
  align-items: center;
  gap: var(--coar-space-3, 12px);
  height: 64px;
  padding: 0 var(--coar-space-4, 16px);
  border-bottom: 1px solid var(--coar-border-subtle, #e3e5e9);
  font-variant-numeric: tabular-nums;
  cursor: grab;
  user-select: none;
  position: relative;
  transition: opacity 100ms ease;
}
.stress-demo__row:active { cursor: grabbing; }
.stress-demo__row--dragging { opacity: 0.4; }
.stress-demo__row--drop-before::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--coar-color-accent, #2563eb);
  border-radius: 2px;
}
.stress-demo__row--drop-after::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--coar-color-accent, #2563eb);
  border-radius: 2px;
}
.stress-demo__handle {
  color: var(--coar-text-subtle, #9ca3af);
  font-size: 14px;
  letter-spacing: -2px;
}
.stress-demo__row-title { font-size: 14px; color: var(--coar-text-base, #1a1c1f); }

.stress-demo__ghost {
  position: fixed;
  top: 0; left: 0;
  z-index: 10000;
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
  will-change: transform;
}
</style>
