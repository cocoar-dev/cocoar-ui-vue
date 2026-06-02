<script setup lang="ts">
/**
 * `<CoarSplitPane>` — two resizable panes with a draggable divider between
 * them. The `side` pane carries a controlled px `size`; the other flexes to
 * fill. Nestable — drop another `CoarSplitPane` (or anything) into either slot
 * to build VS-Code-style splits, e.g. a tree above a properties panel:
 *
 * ```vue
 * <CoarSplitPane direction="column" side="second" v-model:size="propsHeight" :min="80">
 *   <template #first><CoarTree … /></template>
 *   <template #second><AssetInfo … /></template>
 * </CoarSplitPane>
 * ```
 *
 * `size` is optional — omit `v-model:size` for an uncontrolled pane seeded by
 * `defaultSize`. Panes clip overflow (`overflow: hidden`); put a scroll
 * container inside if the content can exceed the pane.
 */
import { computed, ref, watch } from 'vue';

import CoarPaneDivider from './internal/CoarPaneDivider.vue';
import type { SplitDirection, SplitSide } from './panel-layout-types';

const props = withDefaults(
  defineProps<{
    /** `'row'` = side by side (vertical divider); `'column'` = stacked (horizontal divider). */
    direction?: SplitDirection;
    /** Which pane carries the controlled `size`; the other fills. */
    side?: SplitSide;
    /** Controlled size (px) of the `side` pane — use `v-model:size`. */
    size?: number;
    /** Initial size (px) when uncontrolled. */
    defaultSize?: number;
    min?: number;
    max?: number;
    /** When false, the divider is hidden and the split is fixed. */
    resizable?: boolean;
    ariaLabel?: string;
  }>(),
  {
    direction: 'row',
    side: 'first',
    size: undefined,
    defaultSize: 240,
    min: 0,
    max: Number.POSITIVE_INFINITY,
    resizable: true,
    ariaLabel: 'Resize',
  },
);

const emit = defineEmits<{ 'update:size': [value: number] }>();

// Controlled when `size` is bound; otherwise track internally off `defaultSize`.
const internalSize = ref(props.size ?? props.defaultSize);
// Keep the internal fallback in step with external updates, so toggling back to
// uncontrolled (or any later read) reflects the latest value, not a stale one.
watch(
  () => props.size,
  (v) => {
    if (v !== undefined) internalSize.value = v;
  },
);
const size = computed<number>({
  get: () => props.size ?? internalSize.value,
  set: (v) => {
    internalSize.value = v;
    emit('update:size', v);
  },
});

const orientation = computed<'vertical' | 'horizontal'>(() =>
  props.direction === 'row' ? 'vertical' : 'horizontal',
);
// A handle controlling the SECOND pane grows it as the pointer moves the other
// way, so the drag/arrow direction is inverted.
const invert = computed(() => props.side === 'second');

const sizedStyle = computed(() => ({ flex: `0 0 ${size.value}px` }));
</script>

<template>
  <div class="coar-split" :class="`coar-split--${direction}`">
    <div
      class="coar-split__pane"
      :class="{ 'coar-split__pane--fill': side !== 'first' }"
      :style="side === 'first' ? sizedStyle : undefined"
    >
      <slot name="first" />
    </div>

    <CoarPaneDivider
      v-if="resizable"
      :orientation="orientation"
      v-model:value="size"
      :min="min"
      :max="max"
      :invert="invert"
      :aria-label="ariaLabel"
    />

    <div
      class="coar-split__pane"
      :class="{ 'coar-split__pane--fill': side !== 'second' }"
      :style="side === 'second' ? sizedStyle : undefined"
    >
      <slot name="second" />
    </div>
  </div>
</template>

<style scoped>
.coar-split {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.coar-split--row {
  flex-direction: row;
}
.coar-split--column {
  flex-direction: column;
}
.coar-split__pane {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.coar-split__pane--fill {
  flex: 1 1 0;
}
</style>
