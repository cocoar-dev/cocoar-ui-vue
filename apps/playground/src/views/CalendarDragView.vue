<script setup lang="ts">
/**
 * Phase 0 / Spike D — drag stress harness.
 *
 * 200 items in a fixed-size 1D virtual surface. Each item is
 * draggable: pointerdown → drag a "ghost" representation around →
 * pointerup → drop at the hit-tested target index.
 *
 * Auto-scroll: when the pointer enters the 30 px hot zone at the
 * top or bottom of the surface, the surface scrolls automatically
 * (velocity proportional to penetration depth, capped at
 * 24 px/frame).
 *
 * What we measure:
 *   - LoAF during the full drag session — should stay 0/0 on Tier A.
 *   - Drop hit-test correctness via the live indicator.
 *
 * Both `useCoarDrag` and `hitTestVerticalSurface` are pure-function
 * primitives from `@cocoar/vue-calendar/core`; we just wire them up.
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
      // Deterministic hue from index for visual variety.
      hue: ((i * 137) >>> 0) % 360,
    };
  }
  return out;
});

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');
const surfaceContainerRef = ref<HTMLElement | null>(null);

// ─── Drag state ───────────────────────────────────────────────────────

const ghost = ref<{ x: number; y: number; visible: boolean; title: string; hue: number }>(
  { x: 0, y: 0, visible: false, title: '', hue: 0 },
);
const hoveredIndex = ref<number>(-1);
const dropTargetIndex = ref<number>(-1);
const dropPosition = ref<'before' | 'after' | null>(null);

const { isDragging, draggedData, startDrag } = useCoarDrag<Item>({
  surfaceRef: surfaceContainerRef,
  autoScroll: { hotZone: 40, maxVelocity: 24, curve: 'quadratic' },
  onDragStart: ({ event, data }) => {
    ghost.value = {
      x: event.clientX,
      y: event.clientY,
      visible: true,
      title: data.title,
      hue: data.hue,
    };
  },
  onDragMove: (ctx) => {
    ghost.value = {
      x: ctx.pointer.x,
      y: ctx.pointer.y,
      visible: true,
      title: ctx.data.title,
      hue: ctx.data.hue,
    };
    hitTest(ctx);
  },
  onDragEnd: (ctx) => {
    ghost.value = { ...ghost.value, visible: false };
    if (dropTargetIndex.value >= 0) {
      // ctx.data is captured BEFORE the composable's teardown clears
      // draggedData.value, so we get the correct id even though the
      // composable has already reset its state.
      lastDrop.value = {
        from: ctx.data.id,
        to: dropTargetIndex.value,
        position: dropPosition.value ?? 'before',
        when: new Date().toLocaleTimeString(),
      };
    }
    hoveredIndex.value = -1;
    dropTargetIndex.value = -1;
    dropPosition.value = null;
  },
  onDragCancel: () => {
    ghost.value = { ...ghost.value, visible: false };
    hoveredIndex.value = -1;
    dropTargetIndex.value = -1;
    dropPosition.value = null;
  },
});

const lastDrop = ref<{ from: string; to: number; position: 'before' | 'after'; when: string } | null>(
  null,
);

function hitTest(ctx: DragContext<Item>): void {
  const surface = surfaceContainerRef.value;
  if (!surface) return;
  const rect = surface.getBoundingClientRect();
  const cache = surfaceRef.value?.getCache();
  if (!cache) return;
  const hit = hitTestVerticalSurface(
    ctx.pointer.y,
    rect.top,
    surface.scrollTop,
    cache,
    rect.height,
  );
  hoveredIndex.value = hit.itemIndex;
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

// ─── LoAF instrumentation ────────────────────────────────────────────

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
function loafSweep() {
  recomputeLoaf();
  loafSweepHandle = window.setTimeout(loafSweep, 500);
}

onMounted(() => {
  type PEWithType = typeof PerformanceObserver & {
    supportedEntryTypes?: readonly string[];
  };
  const supports =
    typeof PerformanceObserver !== 'undefined' &&
    (PerformanceObserver as PEWithType).supportedEntryTypes?.includes(
      'long-animation-frame',
    );
  if (supports) {
    loafSupported.value = true;
    loafObserver = new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) {
        loafRecent.push({ t: now, duration: entry.duration });
      }
      recomputeLoaf();
    });
    try {
      loafObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      loafSupported.value = false;
    }
    loafSweep();
  }
});

onBeforeUnmount(() => {
  if (loafSweepHandle) clearTimeout(loafSweepHandle);
  loafObserver?.disconnect();
});
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Drag-and-drop stress (Spike D)</h1>
      <p>
        Click and drag any item below. Drag near the top or bottom edge
        to trigger auto-scroll. Drop on a target to record where (no
        actual reorder — the spike validates the gesture flow, not
        the data shuffle).
      </p>
    </header>

    <div class="metrics">
      <div class="metric metric--authoritative">
        <span class="metric__label">⚖ Long frames (5s)</span>
        <span
          class="metric__value"
          :class="{
            'metric__value--good': loafSupported && loafCount === 0,
            'metric__value--ok': loafSupported && loafCount > 0 && loafCount <= 3,
            'metric__value--bad': loafSupported && loafCount > 3,
          }"
        >{{ loafSupported ? loafCount : 'n/a' }}</span>
      </div>
      <div class="metric metric--authoritative">
        <span class="metric__label">⚖ Worst frame (5s)</span>
        <span
          class="metric__value"
          :class="{
            'metric__value--good': loafSupported && loafWorst < 50,
            'metric__value--ok': loafSupported && loafWorst >= 50 && loafWorst < 100,
            'metric__value--bad': loafSupported && loafWorst >= 100,
          }"
        >{{ loafSupported ? `${loafWorst} ms` : 'n/a' }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Dragging</span>
        <span class="metric__value">{{ isDragging ? 'YES' : 'no' }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Drop target</span>
        <span class="metric__value">
          {{ dropTargetIndex >= 0 ? `#${dropTargetIndex} (${dropPosition})` : '—' }}
        </span>
      </div>
      <div class="metric">
        <span class="metric__label">Last drop</span>
        <span class="metric__value">
          {{ lastDrop ? `${lastDrop.from} → ${lastDrop.to} ${lastDrop.position} @ ${lastDrop.when}` : '—' }}
        </span>
      </div>
    </div>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="items.length"
      :estimated-item-size="ITEM_HEIGHT"
      :fixed-item-size="ITEM_HEIGHT"
      :overscan="3"
      class="surface"
    >
      <template #item="{ y }">
        <div
          class="row"
          :class="{
            'row--drop-before':
              dropTargetIndex === y && dropPosition === 'before',
            'row--drop-after':
              dropTargetIndex === y && dropPosition === 'after',
            'row--dragging': draggedData?.id === items[y].id,
          }"
          :style="{ background: `hsl(${items[y].hue} 70% 95%)` }"
          @pointerdown="startDrag(items[y])($event)"
        >
          <span class="row__handle">⋮⋮</span>
          <span class="row__title">{{ items[y].title }}</span>
        </div>
      </template>
    </VirtualizedSurface1DY>

    <Teleport to="body">
      <div
        v-show="ghost.visible"
        class="ghost"
        :style="{
          transform: `translate(${ghost.x + 12}px, ${ghost.y + 4}px)`,
          background: `hsl(${ghost.hue} 70% 88%)`,
        }"
      >
        {{ ghost.title }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.view {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 {
  margin: 0 0 4px 0;
  font-size: 22px;
}
.view__header p {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  padding: 12px;
  background: #f6f7f9;
  border: 1px solid #e3e5e9;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.metric { display: flex; flex-direction: column; gap: 2px; }
.metric--authoritative {
  background: rgba(37, 99, 235, 0.06);
  border-radius: 4px;
  padding: 2px 6px;
  margin: -4px -2px;
}
.metric__label {
  font-size: 11px;
  color: #6c7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.metric__value {
  font-size: 16px;
  font-weight: 600;
  color: #1a1c1f;
}
.metric__value--good { color: #16a34a; }
.metric__value--ok { color: #d97706; }
.metric__value--bad { color: #dc2626; }

.surface {
  height: 600px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid #e3e5e9;
  font-variant-numeric: tabular-nums;
  cursor: grab;
  user-select: none;
  position: relative;
  transition: opacity 100ms ease;
}
.row:active { cursor: grabbing; }
.row--dragging { opacity: 0.4; }
.row--drop-before::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #2563eb;
  border-radius: 2px;
}
.row--drop-after::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #2563eb;
  border-radius: 2px;
}

.row__handle {
  color: #9ca3af;
  font-size: 14px;
  letter-spacing: -2px;
  cursor: grab;
}
.row__title { font-size: 14px; color: #1a1c1f; }

.ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #1a1c1f;
  pointer-events: none;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
  /* Tell the compositor to layer the ghost so its transform updates
     don't trigger a paint of anything else. */
  will-change: transform;
}
</style>
