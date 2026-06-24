<script setup lang="ts">
/**
 * Grid size picker for inserting a table, opened from the toolbar's
 * **Insert Table** button. Hover (desktop) or tap (touch) a cell to choose
 * `cols × rows`; selecting inserts. Also surfaces the markdown-native
 * `|CxR|`-and-space shortcut, which works anywhere (incl. floating mode).
 */
import { ref, computed } from 'vue';

const props = defineProps<{
  /** Insert a table of the chosen size. Injected by the overlay opener. */
  pick: (rows: number, cols: number) => void;
  /** Max selectable dimension per axis. Defaults to 8. */
  max?: number;
}>();

const MAX = props.max ?? 8;
const axis = Array.from({ length: MAX }, (_, i) => i + 1);

// 0 = nothing hovered yet.
const hoverRow = ref(0);
const hoverCol = ref(0);

const label = computed(() =>
  hoverRow.value > 0 ? `${hoverCol.value} × ${hoverRow.value}` : 'Pick size',
);

function over(row: number, col: number) {
  hoverRow.value = row;
  hoverCol.value = col;
}
function reset() {
  hoverRow.value = 0;
  hoverCol.value = 0;
}
function isOn(row: number, col: number) {
  return row <= hoverRow.value && col <= hoverCol.value;
}
</script>

<template>
  <div class="coar-md-table-picker" @mouseleave="reset">
    <div
      class="coar-md-table-picker__grid"
      :style="{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }"
    >
      <template v-for="row in axis" :key="row">
        <button
          v-for="col in axis"
          :key="`${row}-${col}`"
          type="button"
          class="coar-md-table-picker__cell"
          :class="{ 'coar-md-table-picker__cell--on': isOn(row, col) }"
          :aria-label="`${col} by ${row}`"
          @mouseover="over(row, col)"
          @focus="over(row, col)"
          @click="pick(row, col)"
        />
      </template>
    </div>
    <div class="coar-md-table-picker__label">{{ label }}</div>
    <div class="coar-md-table-picker__hint">
      or type <code>|3x4|</code> + space
    </div>
  </div>
</template>

<style scoped>
.coar-md-table-picker {
  padding: var(--coar-spacing-s, 8px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.coar-md-table-picker__grid {
  display: grid;
  gap: 3px;
}
.coar-md-table-picker__cell {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--coar-border-neutral);
  border-radius: 2px;
  background: var(--coar-background-neutral-primary);
  cursor: pointer;
}
.coar-md-table-picker__cell--on {
  background: var(--coar-background-accent-primary, #2563eb);
  border-color: var(--coar-background-accent-primary, #2563eb);
}
.coar-md-table-picker__label {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: var(--coar-text-neutral-secondary);
}
.coar-md-table-picker__hint {
  font-size: 11px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
}
.coar-md-table-picker__hint code {
  background: var(--coar-background-neutral-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}
</style>
