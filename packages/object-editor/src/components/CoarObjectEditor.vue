<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { getAt, parsePointer, setAt } from '../core/pointer';
import { issueMessage } from '../core/messages';
import { schemaAt } from '../core/resolve';
import { validateValue, type ObjectEditorIssue } from '../core/validate';
import type { CoarObjectEditorOption } from '../core/options';
import type { JsonObject, JsonSchema, JsonValue } from '../core/schema';
import { defineObjectEditorTypes } from '../types/builtins';
import type { CoarObjectEditorTypes } from '../types/types';
import ObjectEditorRow from './ObjectEditorRow.vue';
import { buildRows, rowForPointer, type OptionSourceValues } from './rows';

/** Options of a source: a list, or a function that returns one (also asynchronously). */
export type CoarObjectEditorOptionSource =
  | readonly CoarObjectEditorOption[]
  | (() => readonly CoarObjectEditorOption[] | Promise<readonly CoarObjectEditorOption[]>);

const props = withDefaults(
  defineProps<{
    /** The JSON Schema of the object. */
    schema: JsonSchema;
    /** Value types; `defineObjectEditorTypes()` adds the types of the app to the built-in ones. */
    types?: CoarObjectEditorTypes;
    /** Option lists named by `x-coar-options` in the schema. */
    optionSources?: Readonly<Record<string, CoarObjectEditorOptionSource>>;
    mode?: 'view' | 'edit';
    /** Locale of numbers and dates; the browser's when not set. */
    locale?: string;
  }>(),
  { types: undefined, optionSources: () => ({}), mode: 'edit', locale: undefined },
);
const model = defineModel<JsonObject | undefined>();
const { t } = useI18n();
const baseId = useId();

const register = computed(() => props.types ?? defineObjectEditorTypes());
const collapsed = ref(new Set<string>());
const editing = ref('');

const sources = shallowRef<OptionSourceValues>({});
watch(
  () => props.optionSources,
  async (given) => {
    const entries = await Promise.all(
      Object.entries(given).map(async ([name, source]) => [name, typeof source === 'function' ? await source() : source] as const),
    );
    sources.value = Object.fromEntries(entries);
  },
  { immediate: true },
);

const rows = computed(() => buildRows(props.schema, model.value, register.value, sources.value, collapsed.value));

/** Every problem of the value: the schema's and those of the value types. */
const issues = computed<ObjectEditorIssue[]>(() => {
  const list = validateValue(props.schema, model.value);
  const context = { locale: props.locale, t };
  for (const row of buildRows(props.schema, model.value, register.value, sources.value, new Set())) {
    const value = getAt(model.value, row.tokens);
    const message = value !== undefined ? row.type.validate?.(value, { ...context, schema: row.schema, options: row.options }) : null;
    if (message) list.push({ pointer: row.pointer, keyword: 'custom', message });
  }
  return list;
});

const errors = computed(() => {
  const byRow = new Map<string, string>();
  for (const issue of issues.value) {
    const row = rowForPointer(rows.value, issue.pointer);
    if (!row || byRow.has(row.pointer)) continue;
    const schema = schemaAt(props.schema, parsePointer(issue.pointer)) ?? row.schema;
    byRow.set(row.pointer, issueMessage(issue, schema, t));
  }
  return byRow;
});

defineExpose({ issues });

const controlId = (pointer: string) => `${baseId}-value${pointer}`;

function update(tokens: string[], value: JsonValue | undefined) {
  model.value = (setAt(model.value ?? {}, tokens, value) ?? {}) as JsonObject;
}

function toggle(pointer: string) {
  const next = new Set(collapsed.value);
  if (next.has(pointer)) next.delete(pointer);
  else next.add(pointer);
  collapsed.value = next;
}

async function edit(pointer: string) {
  if (props.mode !== 'edit') return;
  editing.value = pointer;
  // The display is replaced by its control on the next render.
  await nextTick();
  if (props.mode !== 'edit' || editing.value !== pointer) return;
  const control = document.getElementById(controlId(pointer));
  control?.focus({ preventScroll: true });
  // A select trigger opens on click; a tag select opens on focus of its input.
  if (control?.matches('[role="combobox"][aria-expanded="false"]:not(input)')) control.click();
}
</script>

<template>
  <div class="coar-object-editor" :class="`coar-object-editor--${mode}`">
    <ObjectEditorRow
      v-for="row in rows"
      :key="row.pointer"
      :row="row"
      :value="getAt(model, row.tokens)"
      :mode="mode"
      :editing="editing === row.pointer"
      :collapsed="collapsed.has(row.pointer)"
      :error="errors.get(row.pointer)"
      :control-id="controlId(row.pointer)"
      :locale="locale"
      @update:value="update(row.tokens, $event)"
      @edit="edit(row.pointer)"
      @leave="editing = ''"
      @toggle="toggle(row.pointer)"
    />
    <p v-if="!rows.length" class="coar-object-editor-empty">
      {{ t('coar.objectEditor.noProperties', undefined, 'The schema has no properties yet.') }}
    </p>
  </div>
</template>
