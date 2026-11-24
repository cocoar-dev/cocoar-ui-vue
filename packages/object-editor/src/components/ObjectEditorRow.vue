<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarButton, CoarIcon, CoarMenu, CoarMenuItem, CoarPopover, CoarTextInput } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { isEmptyValue } from '../core/resolve';
import { isJsonObject, type JsonValue } from '../core/schema';
import type { CoarPresence } from '../core/validate';
import type { CoarObjectEditorOrigin, ObjectEditorRowModel, ObjectEditorRowState } from './rows';
import HiddenLabelField from './HiddenLabelField.vue';

const props = defineProps<{
  row: ObjectEditorRowModel;
  /** The value the row shows: the local one, or the inherited one. */
  value: JsonValue | undefined;
  state: ObjectEditorRowState;
  mode: 'view' | 'edit';
  presence: CoarPresence;
  /** The row's value shows its control instead of its display. */
  editing: boolean;
  error?: string;
  controlId: string;
  locale?: string;
  /** Where an inherited value comes from. */
  origin?: CoarObjectEditorOrigin;
  /** A base value exists here: removing the local value resets to it. */
  hasBase: boolean;
  /** Title of the enclosing group that is `null`: the row is locked. */
  lockedBy?: string;
  /** The app masks this value (`redact`). */
  redacted: boolean;
  /** A value the schema does not describe that the app lets the user edit (`editUnknown`). */
  unknownEditable?: boolean;
  /** A key of a map entry that was refused (empty or taken). */
  keyError?: string;
}>();
const emit = defineEmits<{
  'update:value': [value: JsonValue | undefined];
  remove: [];
  edit: [];
  leave: [];
  toggle: [];
  /** List or map: add an entry at the end. */
  add: [];
  /** List entry: insert an entry after this one. */
  insert: [];
  /** List entry: move one place up (-1) or down (1). */
  move: [offset: -1 | 1];
  /** Map entry: give it another key. */
  rename: [key: string];
}>();
const { t } = useI18n();

const type = computed(() => props.row.type);
const readOnlyRow = computed(
  () => (props.row.extra ? !props.unknownEditable : !!type.value.readonlyOnly) || !type.value.control,
);
const conflict = computed(() => props.state === 'inherited' && !!props.origin?.conflict);
const showsControl = computed(() => {
  // A redacted value never reaches a control: the control would show it.
  if (readOnlyRow.value || props.lockedBy || props.redacted) return false;
  if (props.mode === 'view') return !!type.value.controlInView && !conflict.value;
  if (conflict.value) return props.editing;
  return !type.value.previewInEdit || props.editing;
});
const context = computed(() => ({
  schema: props.row.schema,
  options: props.row.options,
  locale: props.locale,
  t,
}));

/**
 * The value is never shown as generic text: a sensitive type without a format
 * or view of its own, and every value the app redacts, read as dots.
 */
const masked = computed(
  () => props.redacted || (!!type.value.sensitive && !type.value.format && !type.value.view),
);

/** `null`, `""`, `[]` and `{}` as literals: they are values, not absence. */
function literal(value: JsonValue | undefined): string | undefined {
  if (props.presence !== 'key') return undefined;
  if (value === null) return 'null';
  if (value === '') return '""';
  if (Array.isArray(value) && value.length === 0) return '[]';
  if (isJsonObject(value) && Object.keys(value).length === 0) return '{}';
  return undefined;
}

const notSet = computed(() =>
  props.value === undefined || (props.presence === 'filled' && isEmptyValue(props.value)),
);
const valueLiteral = computed(() => literal(props.value));
const showsView = computed(
  () => !!type.value.view && !masked.value && !notSet.value && !valueLiteral.value && !conflict.value,
);
const displayText = computed(() => {
  if (conflict.value) return t('coar.objectEditor.conflict', undefined, 'differs by context');
  if (props.lockedBy) return '–';
  if (notSet.value) return '–';
  if (valueLiteral.value) return valueLiteral.value;
  if (masked.value) return '••••••';
  if (props.row.nested && !props.row.container) {
    const count = isJsonObject(props.value) ? Object.keys(props.value).length : 0;
    return t('coar.objectEditor.filled', { count }, '{count} filled').replace('{count}', String(count));
  }
  const format = type.value.format ?? ((value: JsonValue) => JSON.stringify(value));
  return format(props.value as JsonValue, context.value);
});

// A control that cannot show "no value" for a value that does not allow null
// (an emptied number, date or choice): nothing is written, and leaving the field
// restores the value. Absence is never written by accident.
const pendingEmpty = ref(false);
const revision = ref(0);

function update(next: JsonValue | undefined) {
  // A value the schema does not describe is written as entered: `null`, `""`,
  // `[]` and `{}` stay values, also with presence="filled".
  if (props.row.extra) {
    if (next !== undefined) emit('update:value', next);
    return;
  }
  // An entry of a list or map keeps its place while it is emptied: it leaves only through Remove.
  if (props.presence === 'filled' && !props.row.entry) {
    const empty = type.value.isEmpty ? type.value.isEmpty(next) : isEmptyValue(next);
    emit('update:value', empty ? undefined : next);
    return;
  }
  if (next === undefined && !props.row.nullable) {
    pendingEmpty.value = true;
    return;
  }
  pendingEmpty.value = false;
  emit('update:value', next === undefined ? null : next);
}

// Leaving an activated value returns it to its display, e.g. a multiline text
// back to its one-line preview. Focus moving within the cell, or into the open
// panel of its picker (teleported, so outside the cell), keeps it active.
function onFocusOut(event: FocusEvent) {
  const cell = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && cell.contains(next)) return;
  if (cell.querySelector('[aria-expanded="true"]')) return;
  if (pendingEmpty.value) {
    pendingEmpty.value = false;
    revision.value++;
  }
  if (props.editing) emit('leave');
}

// A click into the blank part of a numeric cell focuses its input.
function focusInput(event: MouseEvent) {
  (event.currentTarget as HTMLElement)
    .querySelector<HTMLInputElement>('input[inputmode="decimal"]:enabled:not([readonly])')
    ?.focus();
}

const canRemove = computed(() => props.state === 'local');
const canSetNull = computed(
  () => props.row.nullable && !props.row.extra && !(props.state === 'local' && props.value === null),
);
// A group that is null (here or inherited) is filled in with {} to edit its values.
const canFillGroup = computed(() => props.row.nested && !props.row.container && props.value === null);
const listEntry = computed(() => (props.row.entry?.container === 'list' ? props.row.entry : undefined));
const canAdd = computed(() => !!props.row.container && props.value !== null);
const hasActions = computed(
  () =>
    props.mode === 'edit' &&
    !props.lockedBy &&
    !type.value.readonlyOnly &&
    (canRemove.value || canSetNull.value || canFillGroup.value || canAdd.value || !!props.row.entry),
);

// Alt+↑ / Alt+↓ move a list entry, like the menu does.
function onKeydown(event: KeyboardEvent) {
  if (!listEntry.value || !event.altKey || props.mode !== 'edit') return;
  if (event.key === 'ArrowUp' && listEntry.value.index > 0) emit('move', -1);
  else if (event.key === 'ArrowDown' && listEntry.value.index < listEntry.value.count - 1) emit('move', 1);
  else return;
  event.preventDefault();
}

const keyDraft = ref(props.row.key);
// Always reported, also the unchanged key: that clears an earlier refusal.
function commitKey() {
  emit('rename', keyDraft.value.trim());
}
</script>

<template>
  <div
    class="coar-object-editor-row"
    :class="{
      'coar-object-editor-row--nested': row.depth > 0,
      'coar-object-editor-row--open': row.nested && !row.collapsed && !!row.schema.properties && Object.keys(row.schema.properties).length > 0,
      'coar-object-editor-row--extra': row.extra,
      'coar-object-editor-row--inherited': state === 'inherited',
      'coar-object-editor-row--locked': !!lockedBy,
    }"
    :data-pointer="row.pointer"
    :data-state="state"
    :style="{ '--coar-object-editor-depth': row.depth }"
    @keydown="onKeydown"
  >
    <div class="coar-object-editor-key">
      <span class="coar-object-editor-chevron">
        <CoarButton
          v-if="row.nested"
          variant="ghost"
          size="xs"
          :icon-start="row.collapsed ? 'chevron-right' : 'chevron-down'"
          :aria-expanded="!row.collapsed"
          :aria-label="row.title"
          @click="emit('toggle')"
        />
      </span>
      <span
        class="coar-object-editor-type"
        :style="{ '--coar-object-editor-hue': type.hue ?? 255 }"
        :title="type.label"
      >
        <CoarIcon :name="row.extra ? 'circle-alert' : type.icon" size="s" />
      </span>
      <HiddenLabelField
        v-if="row.entry?.container === 'map' && mode === 'edit' && !lockedBy"
        :id="`${controlId}-key`"
        :label="t('coar.objectEditor.mapKey', undefined, 'Key')"
        :error="keyError"
      >
        <CoarTextInput
          :id="`${controlId}-key`"
          v-model="keyDraft"
          size="s"
          appearance="inline"
          width="content"
          class="coar-object-editor-map-key"
          @change="commitKey"
          @keydown.enter="commitKey"
        />
      </HiddenLabelField>
      <span v-else class="coar-object-editor-label" :title="row.description">
        <span
          >{{ row.title }}<b v-if="row.required" class="coar-object-editor-required" aria-hidden="true">*</b></span
        >
        <small v-if="!listEntry">{{
          row.extra ? t('coar.objectEditor.notInSchema', undefined, 'not in the schema') : row.key
        }}</small>
      </span>
    </div>
    <div class="coar-object-editor-value">
      <div class="coar-object-editor-value-line">
        <span
          v-if="lockedBy || row.nested || readOnlyRow"
          class="coar-object-editor-static"
          :class="{ 'coar-object-editor-muted': row.nested || notSet || !!lockedBy }"
        >
          <component
            :is="type.view"
            v-if="showsView && !row.nested && !lockedBy"
            :value="value"
            :schema="row.schema"
            :options="row.options"
            :locale="locale"
          />
          <span v-else :class="{ 'coar-object-editor-literal': !!valueLiteral && !lockedBy }">{{ displayText }}</span>
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
              :key="revision"
              :model-value="row.extra ? value : value ?? undefined"
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
          :class="{ 'coar-object-editor-muted': notSet || conflict }"
          :disabled="mode === 'view'"
          @click="emit('edit')"
        >
          <component
            :is="type.view"
            v-if="showsView"
            :value="value"
            :schema="row.schema"
            :options="row.options"
            :locale="locale"
          />
          <span v-else :class="{ 'coar-object-editor-literal': !!valueLiteral }">{{ displayText }}</span>
        </button>
        <span
          v-if="showsControl && valueLiteral && !row.nested && !row.extra"
          class="coar-object-editor-literal"
          :title="t('coar.objectEditor.literalHint', undefined, 'This value is set; Remove deletes it.')"
          >{{ valueLiteral }}</span
        >
        <span
          v-if="state === 'inherited'"
          class="coar-object-editor-origin"
          :title="origin?.title"
          >{{ origin?.label ?? t('coar.objectEditor.inherited', undefined, 'inherited') }}</span
        >
      </div>
      <span v-if="lockedBy" class="coar-object-editor-hint">{{
        t('coar.objectEditor.lockedByNull', { group: lockedBy }, '{group} is null: fill it in from its menu to edit this value').replace(
          '{group}',
          lockedBy,
        )
      }}</span>
      <span v-if="keyError" class="coar-object-editor-error" aria-hidden="true">{{ keyError }}</span>
      <span v-else-if="pendingEmpty" class="coar-object-editor-hint">{{
        t('coar.objectEditor.needsValue', undefined, 'Enter a value, or remove it from the menu.')
      }}</span>
      <span v-if="error" class="coar-object-editor-error" aria-hidden="true">{{ error }}</span>
    </div>
    <div class="coar-object-editor-actions">
      <CoarPopover v-if="hasActions" mode="click">
        <template #default>
          <CoarButton
            variant="ghost"
            size="xs"
            icon-start="ellipsis"
            :aria-label="t('coar.objectEditor.actions', { title: row.title }, 'Actions for {title}').replace('{title}', row.title)"
          />
        </template>
        <template #content>
          <CoarMenu>
            <CoarMenuItem
              v-if="canAdd"
              :label="
                row.container === 'list'
                  ? t('coar.objectEditor.addItem', undefined, 'Add item')
                  : t('coar.objectEditor.addEntry', undefined, 'Add entry')
              "
              icon="plus"
              @clicked="emit('add')"
            />
            <template v-if="listEntry">
              <CoarMenuItem
                :label="t('coar.objectEditor.moveUp', undefined, 'Move up')"
                icon="arrow-up"
                :disabled="listEntry.index === 0"
                @clicked="emit('move', -1)"
              />
              <CoarMenuItem
                :label="t('coar.objectEditor.moveDown', undefined, 'Move down')"
                icon="arrow-down"
                :disabled="listEntry.index === listEntry.count - 1"
                @clicked="emit('move', 1)"
              />
              <CoarMenuItem
                :label="t('coar.objectEditor.insertBelow', undefined, 'Insert below')"
                icon="plus"
                @clicked="emit('insert')"
              />
            </template>
            <CoarMenuItem
              v-if="canRemove || row.entry"
              :label="
                row.entry
                  ? t('coar.objectEditor.removeEntry', undefined, 'Remove')
                  : hasBase
                    ? t('coar.objectEditor.reset', undefined, 'Reset to inherited')
                    : t('coar.objectEditor.remove', undefined, 'Remove value')
              "
              :icon="hasBase && !row.entry ? 'rotate-ccw' : 'trash-2'"
              @clicked="emit('remove')"
            />
            <CoarMenuItem
              v-if="canFillGroup"
              :label="t('coar.objectEditor.fillGroup', undefined, 'Fill in this group')"
              icon="plus"
              @clicked="emit('update:value', {})"
            />
            <CoarMenuItem
              v-if="canSetNull"
              :label="t('coar.objectEditor.setNull', undefined, 'Set to null')"
              icon="x-circle"
              @clicked="emit('update:value', null)"
            />
          </CoarMenu>
        </template>
      </CoarPopover>
    </div>
  </div>
</template>
