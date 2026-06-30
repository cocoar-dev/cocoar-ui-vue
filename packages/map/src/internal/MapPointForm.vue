<script setup lang="ts">
/**
 * Built-in property form for the selected point — the default content of
 * `<CoarMapEditor>`'s marker popup. Plain native inputs keep the map package
 * dependency-free (Leaflet only); consumers who want design-system fields
 * override the whole thing via the `#point-form` slot.
 *
 * It is purely presentational: it never touches `MapData`, only emits intent
 * (`update` with a patch, `remove`, `move-up` / `move-down`).
 */
import { computed } from 'vue';
import type { MapConfig, MapPoint, MapType } from '../types';

const props = defineProps<{
  point: MapPoint;
  config: MapConfig | null;
  type: MapType;
  index: number;
  count: number;
}>();

const emit = defineEmits<{
  update: [Partial<MapPoint>];
  remove: [];
  'move-up': [];
  'move-down': [];
}>();

const isStop = computed(() => props.point.kind === 'stop');
const categories = computed(() => props.config?.categories ?? []);
const canReorder = computed(() => props.type === 'route' && props.count > 1);

/** Emit a single-field patch; an emptied field is cleared (sent as `undefined`). */
function set(field: 'label' | 'note' | 'category' | 'icon', value: string): void {
  emit('update', { [field]: value === '' ? undefined : value });
}
</script>

<template>
  <div class="coar-map-form">
    <label class="coar-map-form__row">
      <span class="coar-map-form__label">Label</span>
      <input
        class="coar-map-form__input"
        :value="point.label ?? ''"
        @input="set('label', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="coar-map-form__row">
      <span class="coar-map-form__label">Note</span>
      <textarea
        class="coar-map-form__input"
        rows="2"
        :value="point.note ?? ''"
        @input="set('note', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <template v-if="isStop">
      <label v-if="categories.length" class="coar-map-form__row">
        <span class="coar-map-form__label">Category</span>
        <select
          class="coar-map-form__input"
          :value="point.category ?? ''"
          @change="set('category', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">—</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">
            {{ c.emoji ? `${c.emoji} ` : '' }}{{ c.label }}
          </option>
        </select>
      </label>

      <label class="coar-map-form__row">
        <span class="coar-map-form__label">Icon</span>
        <input
          class="coar-map-form__input"
          :value="point.icon ?? ''"
          placeholder="emoji"
          @input="set('icon', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </template>

    <div class="coar-map-form__actions">
      <button type="button" class="coar-map-form__btn" @click="emit('update', { kind: isStop ? 'shape' : 'stop' })">
        {{ isStop ? 'Make vertex' : 'Make stop' }}
      </button>
      <template v-if="canReorder">
        <button
          type="button"
          class="coar-map-form__btn"
          :disabled="index === 0"
          title="Move earlier"
          @click="emit('move-up')"
        >↑</button>
        <button
          type="button"
          class="coar-map-form__btn"
          :disabled="index === count - 1"
          title="Move later"
          @click="emit('move-down')"
        >↓</button>
      </template>
      <button type="button" class="coar-map-form__btn coar-map-form__btn--danger" @click="emit('remove')">
        Delete
      </button>
    </div>
  </div>
</template>

<!-- Unscoped + `coar-map`-prefixed, matching the rest of the package. -->
<style>
.coar-map-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 190px;
}
.coar-map-form__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.coar-map-form__label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.coar-map-form__input {
  font: inherit;
  font-size: 13px;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
  color: #0f172a;
  resize: vertical;
}
.coar-map-form__input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}
.coar-map-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.coar-map-form__btn {
  font: inherit;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
}
.coar-map-form__btn:hover:not(:disabled) {
  background: #eef2f7;
}
.coar-map-form__btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.coar-map-form__btn--danger {
  margin-left: auto;
  color: #b91c1c;
  border-color: #fca5a5;
}
.coar-map-form__btn--danger:hover {
  background: #fef2f2;
}
</style>
