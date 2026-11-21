<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import {
  CoarButton,
  CoarFormField,
  CoarIcon,
  CoarNumberInput,
  CoarSelect,
  CoarSwitch,
  CoarTagSelect,
  CoarTextInput,
} from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { detectTypeId, orderedKeys, resolveSchema } from '../core/resolve';
import {
  addProperty,
  changePropertyType,
  moveProperty,
  propertyOptions,
  removeProperty,
  renameProperty,
  setOptions,
  setRequired,
  uniqueKey,
  updateProperty,
  objectSchemaAt,
  type SchemaPath,
} from '../core/schema-ops';
import { checkSchema, PROPERTY_KEY_PATTERN, schemaProblemMessage, type SchemaProblem } from '../core/schema-check';
import type { CoarObjectEditorOption } from '../core/options';
import type { JsonSchema } from '../core/schema';
import { defineObjectEditorTypes } from '../types/builtins';
import type { CoarObjectEditorTypes, CoarValueType } from '../types/types';
import HiddenLabelField from './HiddenLabelField.vue';

const props = withDefaults(
  defineProps<{
    /** Value types to choose from; \`defineObjectEditorTypes()\` adds the types of the app. */
    types?: CoarObjectEditorTypes;
  }>(),
  { types: undefined },
);
/** The JSON Schema being edited; every change emits a new object. */
const schema = defineModel<JsonSchema>({ required: true });
const { t } = useI18n();
const baseId = useId();

const register = computed(() => props.types ?? defineObjectEditorTypes());
const typeLabel = (type: CoarValueType) => t(`coar.objectEditor.type.${type.id}`, undefined, type.label);
const typeOptions = computed(() =>
  [...register.value.values()]
    .filter((type) => !type.readonlyOnly)
    .map((type) => ({ value: type.id, label: typeLabel(type) })),
);

interface Item {
  path: string[];
  id: string;
  key: string;
  title: string;
  depth: number;
  type: CoarValueType;
  required: boolean;
  /** A group of properties edited here (not an app type, whose schema belongs to the app). */
  group: boolean;
}

const items = computed<Item[]>(() => {
  const known = new Set(register.value.keys());
  const list: Item[] = [];
  function visit(object: JsonSchema, path: string[], depth: number) {
    const required = new Set(object.required ?? []);
    for (const key of orderedKeys(object)) {
      const raw = object.properties![key];
      const typeId = detectTypeId(schema.value, raw, known);
      const at = [...path, key];
      const group = !raw.$ref && !!objectSchemaAt(schema.value, at);
      list.push({
        path: at,
        id: at.join('/'),
        key,
        title: resolveSchema(schema.value, raw).title ?? key,
        depth,
        type: register.value.get(typeId) ?? register.value.get('json')!,
        required: required.has(key),
        group,
      });
      if (group) visit(raw, at, depth + 1);
    }
  }
  visit(schema.value, [], 0);
  return list;
});

const selectedId = ref(items.value[0]?.id ?? '');
const selected = computed(() => items.value.find((item) => item.id === selectedId.value));
const property = computed(() => {
  if (!selected.value) return undefined;
  const parent = objectSchemaAt(schema.value, selected.value.path.slice(0, -1));
  return parent?.properties?.[selected.value.key];
});
const settings = computed(() => new Set(selected.value?.type.settings ?? []));

const problems = computed(() => checkSchema(schema.value));
const problemsAt = (path: SchemaPath, field?: SchemaProblem['field']) =>
  problems.value.filter((p) => p.path.join('/') === path.join('/') && (!field || p.field === field));
const problemText = (path: SchemaPath, field: SchemaProblem['field']) =>
  problemsAt(path, field).map((p) => schemaProblemMessage(p, t)).join(' ') || undefined;

function apply(next: JsonSchema, select?: string[]) {
  schema.value = next;
  if (select) selectedId.value = select.join('/');
}

// ── New property ────────────────────────────────────────────────────
const composerTarget = ref<string[] | null>(null);
const newKey = ref('');
const newType = ref<string | null>('text');
const newKeyError = computed(() => {
  const key = newKey.value.trim();
  if (!key || !composerTarget.value) return undefined;
  if (!PROPERTY_KEY_PATTERN.test(key)) return t('coar.schemaEditor.invalidKey', undefined, 'Use letters, digits, _ and -, starting with a letter.');
  const object = objectSchemaAt(schema.value, composerTarget.value);
  if (object?.properties && Object.hasOwn(object.properties, key)) return t('coar.schemaEditor.keyTaken', undefined, 'This key exists already.');
  return undefined;
});

function openComposer(target: string[]) {
  composerTarget.value = target;
  newKey.value = uniqueKey(objectSchemaAt(schema.value, target) ?? {});
  newType.value = 'text';
}

function addNew() {
  const key = newKey.value.trim();
  const type = newType.value ? register.value.get(newType.value) : undefined;
  if (!composerTarget.value || !key || newKeyError.value || !type) return;
  apply(addProperty(schema.value, composerTarget.value, key, type), [...composerTarget.value, key]);
  composerTarget.value = null;
}

// ── The selected property ───────────────────────────────────────────
const keyDraft = ref('');
watch(selectedId, () => (keyDraft.value = selected.value?.key ?? ''), { immediate: true });
const keyError = computed(() => {
  const item = selected.value;
  const key = keyDraft.value.trim();
  if (!item || key === item.key) return problemText(item?.path ?? [], 'key');
  if (!PROPERTY_KEY_PATTERN.test(key)) return t('coar.schemaEditor.invalidKey', undefined, 'Use letters, digits, _ and -, starting with a letter.');
  const parent = objectSchemaAt(schema.value, item.path.slice(0, -1));
  if (parent?.properties && Object.hasOwn(parent.properties, key)) return t('coar.schemaEditor.keyTaken', undefined, 'This key exists already.');
  return undefined;
});

function commitKey() {
  const item = selected.value;
  const key = keyDraft.value.trim();
  if (!item || key === item.key || keyError.value) return;
  apply(renameProperty(schema.value, item.path, key), [...item.path.slice(0, -1), key]);
}

function update(patch: Partial<JsonSchema>) {
  if (selected.value) apply(updateProperty(schema.value, selected.value.path, patch));
}

function setType(id: string | null) {
  const type = id ? register.value.get(id) : undefined;
  if (selected.value && type && type.id !== selected.value.type.id) {
    apply(changePropertyType(schema.value, selected.value.path, type));
  }
}

function move(offset: -1 | 1) {
  if (selected.value) apply(moveProperty(schema.value, selected.value.path, offset));
}

function remove() {
  const item = selected.value;
  if (!item) return;
  // Select the neighbour, so the keyboard user keeps a place in the list. It is
  // chosen before the change: the list follows the new schema only after the
  // parent has rendered it.
  const others = items.value.filter((other) => other.id !== item.id && !other.id.startsWith(`${item.id}/`));
  const index = items.value.indexOf(item);
  const next = others.find((other) => items.value.indexOf(other) > index) ?? others[others.length - 1];
  apply(removeProperty(schema.value, item.path), next?.path ?? []);
}

const options = computed(() => (property.value ? propertyOptions(property.value) : []));
function changeOptions(next: CoarObjectEditorOption[]) {
  if (selected.value) apply(setOptions(schema.value, selected.value.path, next));
}
function editOption(index: number, change: Partial<CoarObjectEditorOption>) {
  changeOptions(options.value.map((option, i) => (i === index ? { ...option, ...change } : option)));
}
function addOption() {
  const values = new Set(options.value.map((option) => String(option.value)));
  let n = options.value.length + 1;
  while (values.has(`option-${n}`)) n++;
  changeOptions([...options.value, { value: `option-${n}`, label: `Option ${n}` }]);
}

const suggestions = computed(() => property.value?.['x-coar-suggestions'] ?? []);
const suggestionOptions = computed(() => suggestions.value.map((value) => ({ value, label: value })));
const fieldId = (name: string) => `${baseId}-${name}`;
</script>

<template>
  <div class="coar-schema-editor">
    <div class="coar-schema-editor-list" role="list" :aria-label="t('coar.schemaEditor.properties', undefined, 'Properties')">
      <div
        v-for="item in items"
        :key="item.id"
        role="listitem"
        class="coar-schema-editor-item"
        :class="{ 'coar-schema-editor-item--selected': item.id === selectedId }"
        :style="{ '--coar-object-editor-depth': item.depth }"
        :data-path="item.id"
      >
        <button type="button" class="coar-schema-editor-pick" :aria-current="item.id === selectedId || undefined" @click="selectedId = item.id">
          <span class="coar-object-editor-type" :style="{ '--coar-object-editor-hue': item.type.hue ?? 255 }" :title="typeLabel(item.type)">
            <CoarIcon :name="item.type.icon" size="s" />
          </span>
          <span class="coar-object-editor-label">
            <span>{{ item.title }}<b v-if="item.required" class="coar-object-editor-required" aria-hidden="true">*</b></span>
            <small>{{ item.key }}</small>
          </span>
          <CoarIcon v-if="problemsAt(item.path).length" class="coar-schema-editor-warning" name="circle-alert" size="s" />
        </button>
        <CoarButton
          v-if="item.group"
          variant="ghost"
          size="xs"
          icon-start="plus"
          :aria-label="t('coar.schemaEditor.addTo', { group: item.title }, 'Add a property to {group}').replace('{group}', item.title)"
          @click="openComposer(item.path)"
        />
      </div>
      <p v-if="!items.length" class="coar-object-editor-empty">
        {{ t('coar.objectEditor.noProperties', undefined, 'The schema has no properties yet.') }}
      </p>

      <div v-if="composerTarget" class="coar-schema-editor-composer">
        <span v-if="composerTarget.length" class="coar-schema-editor-target">
          {{ t('coar.schemaEditor.in', undefined, 'in') }} <code>{{ composerTarget.join('.') }}</code>
        </span>
        <HiddenLabelField :id="fieldId('new-key')" :label="t('coar.schemaEditor.key', undefined, 'Key')" :error="newKeyError">
          <CoarTextInput :id="fieldId('new-key')" v-model="newKey" size="s" @keydown.enter="addNew" />
        </HiddenLabelField>
        <HiddenLabelField :id="fieldId('new-type')" :label="t('coar.schemaEditor.type', undefined, 'Type')">
          <CoarSelect :id="fieldId('new-type')" v-model="newType" size="s" :options="typeOptions" />
        </HiddenLabelField>
        <CoarButton size="s" :disabled="!newKey.trim() || !!newKeyError" @click="addNew">
          {{ t('coar.schemaEditor.add', undefined, 'Add') }}
        </CoarButton>
        <CoarButton size="s" variant="ghost" icon-start="x" :aria-label="t('coar.schemaEditor.cancel', undefined, 'Cancel')" @click="composerTarget = null" />
        <span v-if="newKeyError" class="coar-object-editor-error" aria-hidden="true">{{ newKeyError }}</span>
      </div>
      <div v-else class="coar-schema-editor-add">
        <CoarButton variant="ghost" size="s" icon-start="plus" @click="openComposer([])">
          {{ t('coar.schemaEditor.addProperty', undefined, 'Add property') }}
        </CoarButton>
      </div>
    </div>

    <section v-if="selected && property" class="coar-schema-editor-inspector" :aria-label="selected.title">
      <header class="coar-schema-editor-head">
        <span class="coar-object-editor-type coar-schema-editor-type--large" :style="{ '--coar-object-editor-hue': selected.type.hue ?? 255 }">
          <CoarIcon :name="selected.type.icon" size="m" />
        </span>
        <div class="coar-schema-editor-head-text">
          <strong>{{ selected.title }}</strong>
          <code>{{ selected.path.join('.') }}</code>
        </div>
        <CoarButton variant="ghost" size="xs" icon-start="arrow-up" :aria-label="t('coar.schemaEditor.moveUp', undefined, 'Move up')" @click="move(-1)" />
        <CoarButton variant="ghost" size="xs" icon-start="arrow-down" :aria-label="t('coar.schemaEditor.moveDown', undefined, 'Move down')" @click="move(1)" />
        <CoarButton variant="ghost" size="xs" icon-start="trash-2" :aria-label="t('coar.schemaEditor.remove', undefined, 'Remove')" @click="remove" />
      </header>

      <CoarFormField :id="fieldId('key')" :label="t('coar.schemaEditor.key', undefined, 'Key')" :error="keyError" :hint="t('coar.schemaEditor.keyHint', undefined, 'The name in the JSON data.')">
        <CoarTextInput :id="fieldId('key')" v-model="keyDraft" @change="commitKey" @keydown.enter="commitKey" />
      </CoarFormField>
      <CoarFormField :id="fieldId('title')" :label="t('coar.schemaEditor.title', undefined, 'Title')">
        <CoarTextInput :id="fieldId('title')" :model-value="property.title ?? ''" @update:model-value="update({ title: $event })" />
      </CoarFormField>
      <CoarFormField :id="fieldId('description')" :label="t('coar.schemaEditor.description', undefined, 'Description')">
        <CoarTextInput
          :id="fieldId('description')"
          :model-value="property.description ?? ''"
          :rows="2"
          @update:model-value="update({ description: $event })"
        />
      </CoarFormField>
      <CoarFormField :id="fieldId('type')" :label="t('coar.schemaEditor.type', undefined, 'Type')">
        <CoarSelect :id="fieldId('type')" :model-value="selected.type.id" :options="typeOptions" @update:model-value="setType" />
      </CoarFormField>
      <CoarSwitch
        :model-value="selected.required"
        size="s"
        :label="t('coar.schemaEditor.required', undefined, 'Required')"
        @update:model-value="apply(setRequired(schema, selected.path, $event))"
      />

      <template v-if="settings.has('range') || settings.has('decimals') || settings.has('unit')">
        <h3>{{ t('coar.schemaEditor.number', undefined, 'Number') }}</h3>
        <div v-if="settings.has('range')" class="coar-schema-editor-columns">
          <CoarFormField :id="fieldId('min')" :label="t('coar.schemaEditor.minimum', undefined, 'Minimum')" :error="problemText(selected.path, 'range')">
            <CoarNumberInput
              :id="fieldId('min')"
              :model-value="property.minimum ?? null"
              :decimals="property['x-coar-decimals'] ?? 0"
              @update:model-value="update({ minimum: $event ?? undefined })"
            />
          </CoarFormField>
          <CoarFormField :id="fieldId('max')" :label="t('coar.schemaEditor.maximum', undefined, 'Maximum')">
            <CoarNumberInput
              :id="fieldId('max')"
              :model-value="property.maximum ?? null"
              :decimals="property['x-coar-decimals'] ?? 0"
              @update:model-value="update({ maximum: $event ?? undefined })"
            />
          </CoarFormField>
        </div>
        <div class="coar-schema-editor-columns">
          <CoarFormField v-if="settings.has('decimals')" :id="fieldId('decimals')" :label="t('coar.schemaEditor.decimals', undefined, 'Decimal places')">
            <CoarNumberInput
              :id="fieldId('decimals')"
              :model-value="property['x-coar-decimals'] ?? null"
              :min="0"
              :max="6"
              @update:model-value="update({ 'x-coar-decimals': $event ?? undefined })"
            />
          </CoarFormField>
          <CoarFormField v-if="settings.has('unit')" :id="fieldId('unit')" :label="t('coar.schemaEditor.unit', undefined, 'Unit')">
            <CoarTextInput :id="fieldId('unit')" :model-value="property['x-coar-unit'] ?? ''" @update:model-value="update({ 'x-coar-unit': $event })" />
          </CoarFormField>
        </div>
      </template>

      <template v-if="settings.has('options')">
        <h3>{{ t('coar.schemaEditor.options', undefined, 'Allowed values') }}</h3>
        <div class="coar-schema-editor-columns coar-schema-editor-column-labels" aria-hidden="true">
          <span>{{ t('coar.schemaEditor.optionValue', undefined, 'Value in the JSON') }}</span>
          <span>{{ t('coar.schemaEditor.optionLabel', undefined, 'Text') }}</span>
        </div>
        <div v-for="(option, index) in options" :key="index" class="coar-schema-editor-option">
          <HiddenLabelField
            :id="fieldId(`option-value-${index}`)"
            :label="t('coar.schemaEditor.optionValueOf', { n: index + 1 }, 'Value {n}').replace('{n}', String(index + 1))"
          >
            <CoarTextInput
              :id="fieldId(`option-value-${index}`)"
              :model-value="String(option.value)"
              size="s"
              @update:model-value="editOption(index, { value: $event })"
            />
          </HiddenLabelField>
          <HiddenLabelField
            :id="fieldId(`option-label-${index}`)"
            :label="t('coar.schemaEditor.optionLabelOf', { n: index + 1 }, 'Text {n}').replace('{n}', String(index + 1))"
          >
            <CoarTextInput
              :id="fieldId(`option-label-${index}`)"
              :model-value="option.label"
              size="s"
              @update:model-value="editOption(index, { label: $event })"
            />
          </HiddenLabelField>
          <CoarButton
            variant="ghost"
            size="xs"
            icon-start="x"
            :aria-label="t('coar.schemaEditor.removeOption', { n: index + 1 }, 'Remove value {n}').replace('{n}', String(index + 1))"
            @click="changeOptions(options.filter((_, i) => i !== index))"
          />
        </div>
        <span v-if="problemText(selected.path, 'options')" class="coar-object-editor-error">{{ problemText(selected.path, 'options') }}</span>
        <div>
          <CoarButton variant="ghost" size="s" icon-start="plus" @click="addOption">
            {{ t('coar.schemaEditor.addOption', undefined, 'Add value') }}
          </CoarButton>
        </div>
      </template>

      <template v-if="settings.has('suggestions')">
        <h3>{{ t('coar.schemaEditor.suggestions', undefined, 'Suggested tags') }}</h3>
        <HiddenLabelField :id="fieldId('suggestions')" :label="t('coar.schemaEditor.suggestions', undefined, 'Suggested tags')">
          <CoarTagSelect
            :id="fieldId('suggestions')"
            :model-value="suggestions"
            :options="suggestionOptions"
            allow-create
            size="s"
            @update:model-value="update({ 'x-coar-suggestions': $event.length ? $event : undefined })"
          />
        </HiddenLabelField>
      </template>
    </section>
  </div>
</template>
