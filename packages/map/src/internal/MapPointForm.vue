<script setup lang="ts">
/**
 * Built-in property form for the selected point — the default content of
 * `<CoarMapEditor>`'s marker popup. Uses the Cocoar UI form controls
 * (`CoarTextInput` / `CoarSelect` / `CoarButton`) so the editor matches the
 * design system. `@cocoar/vue-ui` is an OPTIONAL peer of `@cocoar/vue-map`:
 * only the editor pulls it in, viewer-only consumers don't. Consumers who want
 * a different form override the whole thing via the `#point-form` slot.
 *
 * Purely presentational — it never touches `MapData`, only emits intent
 * (`update` with a patch, `remove`, `move-up` / `move-down`).
 */
import { computed } from 'vue';
import { CoarButton, CoarSelect, CoarTextInput, type CoarSelectOption } from '@cocoar/vue-ui';
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
const canReorder = computed(() => props.type === 'route' && props.count > 1);

const categoryOptions = computed<CoarSelectOption<string>[]>(() =>
  (props.config?.categories ?? []).map((c) => ({
    value: c.id,
    label: c.emoji ? `${c.emoji} ${c.label}` : c.label,
  })),
);

/** Emit a single-field patch; an emptied field is cleared (sent as `undefined`). */
function set(field: 'label' | 'note' | 'icon', value: string): void {
  emit('update', { [field]: value === '' ? undefined : value });
}
function setCategory(value: string | null | undefined): void {
  emit('update', { category: value || undefined });
}
</script>

<template>
  <div class="coar-map-form">
    <label class="coar-map-form__field">
      <span class="coar-map-form__label">Label</span>
      <CoarTextInput
        :model-value="point.label ?? ''"
        size="s"
        @update:model-value="set('label', $event)"
      />
    </label>

    <label class="coar-map-form__field">
      <span class="coar-map-form__label">Note</span>
      <CoarTextInput
        :model-value="point.note ?? ''"
        :rows="2"
        size="s"
        @update:model-value="set('note', $event)"
      />
    </label>

    <template v-if="isStop">
      <label v-if="categoryOptions.length" class="coar-map-form__field">
        <span class="coar-map-form__label">Category</span>
        <CoarSelect
          :model-value="point.category ?? null"
          :options="categoryOptions"
          size="s"
          clearable
          placeholder="None"
          @update:model-value="setCategory($event as string | null)"
        />
      </label>

      <label class="coar-map-form__field">
        <span class="coar-map-form__label">Icon</span>
        <CoarTextInput
          :model-value="point.icon ?? ''"
          size="s"
          placeholder="emoji"
          @update:model-value="set('icon', $event)"
        />
      </label>
    </template>

    <div class="coar-map-form__actions">
      <CoarButton variant="secondary" size="s" @click="emit('update', { kind: isStop ? 'shape' : 'stop' })">
        {{ isStop ? 'Make vertex' : 'Make stop' }}
      </CoarButton>
      <template v-if="canReorder">
        <CoarButton variant="tertiary" size="s" :disabled="index === 0" aria-label="Move earlier" @click="emit('move-up')">↑</CoarButton>
        <CoarButton variant="tertiary" size="s" :disabled="index === count - 1" aria-label="Move later" @click="emit('move-down')">↓</CoarButton>
      </template>
      <CoarButton class="coar-map-form__delete" variant="danger" size="s" @click="emit('remove')">
        Delete
      </CoarButton>
    </div>
  </div>
</template>

<style>
.coar-map-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 210px;
}
.coar-map-form__field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.coar-map-form__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--coar-text-neutral-secondary, #64748b);
}
.coar-map-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.coar-map-form__delete {
  margin-left: auto;
}
</style>
