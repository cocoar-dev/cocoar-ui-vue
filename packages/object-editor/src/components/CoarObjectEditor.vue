<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { formatPointer, getAt, isPointerPrefix, parsePointer, setAt } from '../core/pointer';
import { issueMessage } from '../core/messages';
import { schemaAt } from '../core/resolve';
import { validateValue, type CoarPresence, type ObjectEditorIssue } from '../core/validate';
import type { CoarObjectEditorOption } from '../core/options';
import { isJsonObject, type JsonObject, type JsonSchema, type JsonValue } from '../core/schema';
import { defineObjectEditorTypes } from '../types/builtins';
import type { CoarObjectEditorTypes } from '../types/types';
import ObjectEditorRow from './ObjectEditorRow.vue';
import {
  buildRows,
  overlay,
  rowForPointer,
  type CoarObjectEditorOrigin,
  type CoarResolveType,
  type ObjectEditorRowModel,
  type ObjectEditorRowState,
  type OptionSourceValues,
} from './rows';

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
    /** Every second row on a light background; off: all rows on the background of the page. */
    striped?: boolean;
    /**
     * `key` (default, JSON Schema): a value is there when its key is; `null`, `""`,
     * `[]` and `{}` are values, and only Remove deletes a key. `filled` (forms):
     * emptying a value removes its key, and an empty value counts as missing.
     */
    presence?: CoarPresence;
    /** Chooses the value type of a property, e.g. from a marker of the app in the schema. */
    resolveType?: CoarResolveType;
    /** `true` for a value that must never appear as text (shown as dots). */
    redact?: (pointer: string, value: JsonValue) => boolean;
    /** Read-only values that apply where the edited document has no key; editing writes the document. */
    base?: JsonObject;
    /** Where an inherited value comes from. */
    origin?: (pointer: string) => CoarObjectEditorOrigin | undefined;
    /** `local`: only values the edited document sets, with their groups. Never changes the document. */
    view?: 'all' | 'local';
    /** `false`: no built-in validation; show the app's `issues` instead. */
    validate?: boolean;
    /** Problems the app found, shown in their rows like the editor's own. */
    issues?: readonly ObjectEditorIssue[];
  }>(),
  {
    types: undefined,
    optionSources: () => ({}),
    mode: 'edit',
    locale: undefined,
    striped: false,
    presence: 'key',
    resolveType: undefined,
    redact: undefined,
    base: undefined,
    origin: undefined,
    view: 'all',
    validate: true,
    issues: () => [],
  },
);
const model = defineModel<JsonObject | undefined>();
const { t } = useI18n();
const baseId = useId();

const register = computed(() => props.types ?? defineObjectEditorTypes());
/** Groups switched by the user from their default (open; a recursive group closed). */
const toggled = ref(new Set<string>());
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

/** Local over base: which groups and keys there are. Not stored. */
const shape = computed(() => overlay(props.base, model.value));
const buildOptions = computed(() => ({ resolveType: props.resolveType }));

interface RowView {
  row: ObjectEditorRowModel;
  value: JsonValue | undefined;
  state: ObjectEditorRowState;
  hasBase: boolean;
  lockedBy?: string;
}

const views = computed<RowView[]>(() => {
  const rows = buildRows(props.schema, shape.value, register.value, sources.value, toggled.value, buildOptions.value);
  const titles = new Map(rows.map((row) => [row.pointer, row.title]));
  return rows.map((row) => {
    const local = getAt(model.value, row.tokens);
    const inherited = getAt(props.base, row.tokens);
    const state: ObjectEditorRowState =
      local !== undefined ? 'local' : inherited !== undefined ? 'inherited' : 'absent';
    // Editing below a group that is null (here or inherited) would silently
    // replace that null with an object: such rows are locked.
    let lockedBy: string | undefined;
    for (let depth = row.tokens.length - 1; depth > 0 && !lockedBy; depth--) {
      const group = row.tokens.slice(0, depth);
      if (getAt(shape.value, group) === null) lockedBy = titles.get(formatPointer(group)) ?? group.join('.');
    }
    return { row, value: state === 'local' ? local : inherited, state, hasBase: inherited !== undefined, lockedBy };
  });
});

/** `local` view: rows with a local key, and the groups that lead to them. */
const visible = computed(() => {
  if (props.view !== 'local') return views.value;
  const set = views.value.filter((entry) => entry.state === 'local').map((entry) => entry.row.pointer);
  return views.value.filter((entry) => set.some((pointer) => isPointerPrefix(entry.row.pointer, pointer)));
});

/** Every problem of the value: the schema's, those of the value types, and the app's. */
const issues = computed<ObjectEditorIssue[]>(() => {
  const list: ObjectEditorIssue[] = [];
  if (props.validate) {
    // Every value is checked, also below closed groups and inside recursive data.
    const checked = buildRows(props.schema, model.value, register.value, sources.value, new Set(), {
      ...buildOptions.value,
      allWithData: true,
    });
    // A type whose stored form differs from the schema (validateSchema: false)
    // skips the schema's checks at its value.
    const opaque = checked.filter((row) => row.type.validateSchema === false).map((row) => row.pointer);
    for (const issue of validateValue(props.schema, model.value, { presence: props.presence })) {
      // "required" checks the parent object, not the stored form: it always stays.
      const skipped = issue.keyword !== 'required' && opaque.some((pointer) => isPointerPrefix(pointer, issue.pointer));
      if (!skipped) list.push(issue);
    }
    const context = { locale: props.locale, t };
    for (const row of checked) {
      const value = getAt(model.value, row.tokens);
      if (value === undefined || value === null) continue;
      const message = row.type.validate?.(value, { ...context, schema: row.schema, options: row.options });
      if (message) list.push({ pointer: row.pointer, keyword: 'custom', message });
    }
  }
  return [...list, ...props.issues];
});

// An issue goes to the deepest row that contains it. When that row is not the
// value itself (a required key without a property schema, a part of an app type
// or of a closed group), the rest of the path comes first: "currency: Required."
// Issues no row contains are listed above the rows.
const placed = computed(() => {
  const byRow = new Map<string, string>();
  const unplaced: string[] = [];
  const rows = visible.value.map((entry) => entry.row);
  for (const issue of issues.value) {
    const tokens = parsePointer(issue.pointer);
    const row = rowForPointer(rows, issue.pointer);
    const rest = tokens.slice(row?.tokens.length ?? 0).join('.');
    const schema = schemaAt(props.schema, tokens) ?? row?.schema ?? {};
    const text = issueMessage(issue, schema, t);
    const message = rest ? `${rest}: ${text}` : text;
    if (!row) unplaced.push(message);
    else if (!byRow.has(row.pointer)) byRow.set(row.pointer, message);
  }
  return { byRow, unplaced };
});

defineExpose({ issues });

const controlId = (pointer: string) => `${baseId}-value${pointer}`;

function update(tokens: string[], value: JsonValue | undefined) {
  model.value = (setAt(model.value ?? {}, tokens, value) ?? {}) as JsonObject;
}

// Removing a value. Over a base, a group left empty by it is removed too: an
// empty local group would only stand in for the inherited one. Without a base,
// {} is a value and stays.
function remove(tokens: string[]) {
  let next = setAt(model.value ?? {}, tokens, undefined) as JsonObject;
  if (props.base) {
    for (let depth = tokens.length - 1; depth > 0; depth--) {
      const group = getAt(next, tokens.slice(0, depth));
      if (!isJsonObject(group) || Object.keys(group).length) break;
      next = setAt(next, tokens.slice(0, depth), undefined) as JsonObject;
    }
  }
  model.value = next ?? {};
}

function toggle(pointer: string) {
  const next = new Set(toggled.value);
  if (next.has(pointer)) next.delete(pointer);
  else next.add(pointer);
  toggled.value = next;
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
  <div class="coar-object-editor" :class="[`coar-object-editor--${mode}`, { 'coar-object-editor--striped': striped }]">
    <ul v-if="placed.unplaced.length" class="coar-object-editor-issues">
      <li v-for="message in placed.unplaced" :key="message" class="coar-object-editor-error">{{ message }}</li>
    </ul>
    <ObjectEditorRow
      v-for="entry in visible"
      :key="entry.row.pointer"
      :row="entry.row"
      :value="entry.value"
      :state="entry.state"
      :has-base="entry.hasBase"
      :locked-by="entry.lockedBy"
      :origin="entry.state === 'inherited' ? origin?.(entry.row.pointer) : undefined"
      :redacted="entry.value !== undefined && !!redact?.(entry.row.pointer, entry.value)"
      :mode="mode"
      :presence="presence"
      :editing="editing === entry.row.pointer"
      :error="placed.byRow.get(entry.row.pointer)"
      :control-id="controlId(entry.row.pointer)"
      :locale="locale"
      @update:value="update(entry.row.tokens, $event)"
      @remove="remove(entry.row.tokens)"
      @edit="edit(entry.row.pointer)"
      @leave="editing = ''"
      @toggle="toggle(entry.row.pointer)"
    />
    <p v-if="!visible.length" class="coar-object-editor-empty">
      {{
        view === 'local'
          ? t('coar.objectEditor.noLocalValues', undefined, 'No values are set here.')
          : t('coar.objectEditor.noProperties', undefined, 'The schema has no properties yet.')
      }}
    </p>
  </div>
</template>
