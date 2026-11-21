<script setup lang="ts">
import { computed } from 'vue';
import { CoarButton, CoarIcon } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { isEmptyValue } from '../core/resolve';
import { isJsonObject, type JsonValue } from '../core/schema';
import type { ObjectEditorRowModel } from './rows';
import HiddenLabelField from './HiddenLabelField.vue';

const props = defineProps<{
  row: ObjectEditorRowModel;
  value: JsonValue | undefined;
  mode: 'view' | 'edit';
  /** The row's value shows its control instead of its display. */
  editing: boolean;
  collapsed: boolean;
  error?: string;
  controlId: string;
  locale?: string;
}>();
const emit = defineEmits<{
  'update:value': [value: JsonValue | undefined];
  edit: [];
  leave: [];
  toggle: [];
}>();
const { t } = useI18n();

const type = computed(() => props.row.type);
const readOnlyRow = computed(() => props.row.extra || !!type.value.readonlyOnly || !type.value.control);
const showsControl = computed(() => {
  if (readOnlyRow.value) return false;
  if (props.mode === 'view') return !!type.value.controlInView;
  return !type.value.previewInEdit || props.editing;
});
const context = computed(() => ({
  schema: props.row.schema,
  options: props.row.options,
  locale: props.locale,
  t,
}));
const displayText = computed(() => {
  if (props.row.nested) {
    const count = isJsonObject(props.value) ? Object.keys(props.value).length : 0;
    return t('coar.objectEditor.filled', { count }, '{count} filled').replace('{count}', String(count));
  }
  if (isEmptyValue(props.value)) return '–';
  const format = type.value.format ?? ((value: JsonValue) => JSON.stringify(value));
  return format(props.value as JsonValue, context.value);
});

function update(next: JsonValue | undefined) {
  const empty = type.value.isEmpty ? type.value.isEmpty(next) : isEmptyValue(next);
  emit('update:value', empty ? undefined : next);
}

// Leaving an activated value returns it to its display, e.g. a multiline text
// back to its one-line preview. Focus moving within the cell, or into the open
// panel of its picker (teleported, so outside the cell), keeps it active.
function onFocusOut(event: FocusEvent) {
  if (!props.editing) return;
  const cell = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && cell.contains(next)) return;
  if (cell.querySelector('[aria-expanded="true"]')) return;
  emit('leave');
}

// A click into the blank part of a numeric cell focuses its input.
function focusInput(event: MouseEvent) {
  (event.currentTarget as HTMLElement)
    .querySelector<HTMLInputElement>('input[inputmode="decimal"]:enabled:not([readonly])')
    ?.focus();
}
</script>

<template>
  <div
    class="coar-object-editor-row"
    :class="{ 'coar-object-editor-row--nested': row.depth > 0, 'coar-object-editor-row--extra': row.extra }"
    :data-pointer="row.pointer"
    :style="{ '--coar-object-editor-depth': row.depth }"
  >
    <div class="coar-object-editor-key">
      <CoarButton
        v-if="row.nested"
        variant="ghost"
        size="xs"
        :icon-start="collapsed ? 'chevron-right' : 'chevron-down'"
        :aria-expanded="!collapsed"
        :aria-label="row.title"
        @click="emit('toggle')"
      />
      <span v-else class="coar-object-editor-chevron-space"></span>
      <span
        class="coar-object-editor-type"
        :style="{ '--coar-object-editor-hue': type.hue ?? 255 }"
        :title="type.label"
      >
        <CoarIcon :name="row.extra ? 'circle-alert' : type.icon" size="s" />
      </span>
      <span class="coar-object-editor-label" :title="row.description">
        <span
          >{{ row.title }}<b v-if="row.required" class="coar-object-editor-required" aria-hidden="true">*</b></span
        >
        <small>{{
          row.extra ? t('coar.objectEditor.notInSchema', undefined, 'not in the schema') : row.key
        }}</small>
      </span>
    </div>
    <div class="coar-object-editor-value">
      <span v-if="row.nested || readOnlyRow" class="coar-object-editor-static" :class="{ 'coar-object-editor-muted': row.nested }">
        <component
          :is="type.view"
          v-if="type.view && !row.nested && !isEmptyValue(value)"
          :value="value"
          :schema="row.schema"
          :options="row.options"
          :locale="locale"
        />
        <template v-else>{{ displayText }}</template>
      </span>
      <HiddenLabelField v-else-if="showsControl" :id="controlId" :label="row.title" :error="error">
        <div
          class="coar-object-editor-control"
          :class="{ 'coar-object-editor-control--numeric': row.typeId === 'number' }"
          @click.self="focusInput"
          @focusout="onFocusOut"
        >
          <component
            :is="type.control"
            v-bind="type.controlProps"
            :id="controlId"
            :model-value="value"
            :schema="row.schema"
            :label="row.title"
            :readonly="mode === 'view' || !!row.schema.readOnly"
            :error="!!error"
            :options="row.options"
            :locale="locale"
            @update:model-value="update"
          />
        </div>
      </HiddenLabelField>
      <button
        v-else
        type="button"
        class="coar-object-editor-display"
        :disabled="mode === 'view'"
        @click="emit('edit')"
      >
        <component
          :is="type.view"
          v-if="type.view && !isEmptyValue(value)"
          :value="value"
          :schema="row.schema"
          :options="row.options"
          :locale="locale"
        />
        <template v-else>{{ displayText }}</template>
      </button>
      <span v-if="error" class="coar-object-editor-error" aria-hidden="true">{{ error }}</span>
    </div>
  </div>
</template>
