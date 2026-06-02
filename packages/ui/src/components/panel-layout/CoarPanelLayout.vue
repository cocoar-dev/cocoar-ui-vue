<script setup lang="ts">
/**
 * `<CoarPanelLayout>` — a VS-Code-style workbench: named, resizable regions you
 * fill with whatever you like. The shell owns the arrangement + drag-to-resize;
 * you own the contents.
 *
 * ```
 * ┌───────────────────────────────────────┐
 * │  #top            (fixed, full width)   │
 * ├────────┬────────────────────┬──────────┤
 * │ #left  │     #default        │  #right  │
 * │        ├────────────────────┤          │
 * │        │     #bottom         │          │
 * ├────────┴────────────────────┴──────────┤
 * │  #status         (fixed, full width)   │
 * └───────────────────────────────────────┘
 * ```
 *
 * - An empty slot renders **no region** (and no divider) — take only what you
 *   need. `#default` (content) always fills the centre.
 * - `#left` / `#right` / `#bottom` are resizable (drag or arrow keys) and
 *   collapsible via the `*-open` props — render your own toggle button.
 * - `#bottom` sits under the content, between the sidebars (VS-Code default).
 * - Need a split *within* a region (e.g. a tree above a details panel in
 *   `#left`)? Nest a {@link CoarSplitPane} — same resize behaviour.
 *
 * Sizes are px and two-way (`v-model:left-width` …) so persisting them is a
 * one-liner on the consumer side. The layout itself stays stateless.
 */
import { computed, ref, useSlots, watch } from 'vue';

import CoarPaneDivider from './internal/CoarPaneDivider.vue';

const props = withDefaults(
  defineProps<{
    leftWidth?: number;
    rightWidth?: number;
    bottomHeight?: number;
    /** Collapse a sidebar / panel without unmounting its slot content's owner. */
    leftOpen?: boolean;
    rightOpen?: boolean;
    bottomOpen?: boolean;
    leftMin?: number;
    leftMax?: number;
    rightMin?: number;
    rightMax?: number;
    bottomMin?: number;
    bottomMax?: number;
    leftResizable?: boolean;
    rightResizable?: boolean;
    bottomResizable?: boolean;
    /**
     * Minimum size the content region keeps. Sidebars / the bottom panel can
     * never be dragged (or a shrinking window can never squeeze them) past the
     * point where content would fall below this — content is never crushed to 0.
     */
    contentMinWidth?: number;
    contentMinHeight?: number;
  }>(),
  {
    leftWidth: undefined,
    rightWidth: undefined,
    bottomHeight: undefined,
    leftOpen: true,
    rightOpen: true,
    bottomOpen: true,
    leftMin: 0,
    leftMax: Number.POSITIVE_INFINITY,
    rightMin: 0,
    rightMax: Number.POSITIVE_INFINITY,
    bottomMin: 0,
    bottomMax: Number.POSITIVE_INFINITY,
    leftResizable: true,
    rightResizable: true,
    bottomResizable: true,
    contentMinWidth: 120,
    contentMinHeight: 80,
  },
);

const emit = defineEmits<{
  'update:leftWidth': [value: number];
  'update:rightWidth': [value: number];
  'update:bottomHeight': [value: number];
}>();

/** Controlled-or-internal size, mirroring CoarSplitPane's pattern. */
function useSize(get: () => number | undefined, set: (v: number) => void, fallback: number) {
  const internal = ref(get() ?? fallback);
  // Sync the internal fallback with external updates so it never goes stale.
  watch(get, (v) => {
    if (v !== undefined) internal.value = v;
  });
  return computed<number>({
    get: () => get() ?? internal.value,
    set: (v) => {
      internal.value = v;
      set(v);
    },
  });
}

const leftWidth = useSize(
  () => props.leftWidth,
  (v) => emit('update:leftWidth', v),
  240,
);
const rightWidth = useSize(
  () => props.rightWidth,
  (v) => emit('update:rightWidth', v),
  280,
);
const bottomHeight = useSize(
  () => props.bottomHeight,
  (v) => emit('update:bottomHeight', v),
  200,
);

const slots = useSlots();
const showLeft = computed(() => !!slots.left && props.leftOpen);
const showRight = computed(() => !!slots.right && props.rightOpen);
const showBottom = computed(() => !!slots.bottom && props.bottomOpen);

// Reserve enough room for the content region (and the opposite sidebar) so a
// divider drag can never squeeze content below its min. The divider also clamps
// to its live container extent, so this holds as the window resizes; the CSS
// `min-width`/`min-height` on the centre is the final backstop.
const DIVIDER_PX = 6;
const leftReserve = computed(
  () => props.contentMinWidth + DIVIDER_PX + (showRight.value ? rightWidth.value + DIVIDER_PX : 0),
);
const rightReserve = computed(
  () => props.contentMinWidth + DIVIDER_PX + (showLeft.value ? leftWidth.value + DIVIDER_PX : 0),
);
const bottomReserve = computed(() => props.contentMinHeight + DIVIDER_PX);
</script>

<template>
  <div class="coar-panel-layout">
    <div v-if="$slots.top" class="coar-panel-layout__top">
      <slot name="top" />
    </div>

    <div class="coar-panel-layout__body">
      <div
        v-if="showLeft"
        class="coar-panel-layout__left"
        :style="{ flex: `0 0 ${leftWidth}px` }"
      >
        <slot name="left" />
      </div>
      <CoarPaneDivider
        v-if="showLeft && leftResizable"
        orientation="vertical"
        v-model:value="leftWidth"
        :min="leftMin"
        :max="leftMax"
        :reserve="leftReserve"
        aria-label="Resize left panel"
      />

      <div class="coar-panel-layout__center" :style="{ minWidth: `${contentMinWidth}px` }">
        <div class="coar-panel-layout__content" :style="{ minHeight: `${contentMinHeight}px` }">
          <slot />
        </div>
        <CoarPaneDivider
          v-if="showBottom && bottomResizable"
          orientation="horizontal"
          v-model:value="bottomHeight"
          :min="bottomMin"
          :max="bottomMax"
          :reserve="bottomReserve"
          invert
          aria-label="Resize bottom panel"
        />
        <div
          v-if="showBottom"
          class="coar-panel-layout__bottom"
          :style="{ flex: `0 0 ${bottomHeight}px` }"
        >
          <slot name="bottom" />
        </div>
      </div>

      <CoarPaneDivider
        v-if="showRight && rightResizable"
        orientation="vertical"
        v-model:value="rightWidth"
        :min="rightMin"
        :max="rightMax"
        :reserve="rightReserve"
        invert
        aria-label="Resize right panel"
      />
      <div
        v-if="showRight"
        class="coar-panel-layout__right"
        :style="{ flex: `0 0 ${rightWidth}px` }"
      >
        <slot name="right" />
      </div>
    </div>

    <div v-if="$slots.status" class="coar-panel-layout__status">
      <slot name="status" />
    </div>
  </div>
</template>

<style scoped>
.coar-panel-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.coar-panel-layout__top,
.coar-panel-layout__status {
  flex: 0 0 auto;
  min-width: 0;
}
.coar-panel-layout__body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}
.coar-panel-layout__left,
.coar-panel-layout__right,
.coar-panel-layout__bottom {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.coar-panel-layout__center {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.coar-panel-layout__content {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
