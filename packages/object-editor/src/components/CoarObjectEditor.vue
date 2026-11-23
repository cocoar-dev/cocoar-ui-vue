<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { formatPointer, getAt, isPointerPrefix, parsePointer, setAt } from '../core/pointer';
import { issueMessage } from '../core/messages';
import { nonNullSchema, resolveSchema, schemaAt } from '../core/resolve';
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
  searchRows,
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
/** Filters the rows by title, key or path (`dimensions.width`), also under closed groups. Never reads values. */
const search = defineModel<string>('search', { default: '' });
const root = useTemplateRef<HTMLElement>('root');
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
const searching = computed(() => search.value.trim() !== '');
const buildOptions = computed(() => ({ resolveType: props.resolveType }));

interface RowView {
  row: ObjectEditorRowModel;
  value: JsonValue | undefined;
  state: ObjectEditorRowState;
  hasBase: boolean;
  lockedBy?: string;
}

const views = computed<RowView[]>(() => {
  // A search sees every group open; the user's open and closed groups come back when it is cleared.
  const rows = buildRows(props.schema, shape.value, register.value, sources.value, toggled.value, {
    ...buildOptions.value,
    allOpen: searching.value,
  });
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
  let list = views.value;
  if (props.view === 'local') {
    const set = list.filter((entry) => entry.state === 'local').map((entry) => entry.row.pointer);
    list = list.filter((entry) => set.some((pointer) => isPointerPrefix(entry.row.pointer, pointer)));
  }
  if (searching.value) {
    const found = new Set(searchRows(list.map((entry) => entry.row), search.value).map((row) => row.pointer));
    list = list.filter((entry) => found.has(entry.row.pointer));
  }
  return list;
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

/**
 * Shows the row of `pointer`: opens its groups, scrolls to it and focuses its
 * control (or the row). For links from search results or from messages.
 */
async function focus(pointer: string) {
  const tokens = parsePointer(pointer);
  for (let round = 0; round < tokens.length + 1; round++) {
    if (views.value.some((entry) => entry.row.pointer === pointer)) break;
    const closed = views.value.filter((entry) => entry.row.collapsed && isPointerPrefix(entry.row.pointer, pointer));
    if (!closed.length) break;
    for (const entry of closed) toggle(entry.row.pointer);
    await nextTick();
  }
  await nextTick();
  const element = root.value?.querySelector<HTMLElement>(`[data-pointer="${CSS.escape(pointer)}"]`);
  if (!element) return false;
  element.scrollIntoView({ block: 'nearest' });
  const target =
    element.querySelector<HTMLElement>('.coar-object-editor-value input:not([type="hidden"]), .coar-object-editor-value [role="combobox"], .coar-object-editor-value button') ??
    element.querySelector<HTMLElement>('button');
  target?.focus({ preventScroll: true });
  return true;
}

defineExpose({ issues, focus });

const controlId = (pointer: string) => `${baseId}-value${pointer}`;

function update(tokens: string[], value: JsonValue | undefined) {
  model.value = (setAt(model.value ?? {}, tokens, value) ?? {}) as JsonObject;
}

// ── Lists and maps ──────────────────────────────────────────────────
// An entry is always written through its list or map: an inherited list is
// copied into the document first, never patched by index into an object.

const shown = (tokens: string[]) => getAt(model.value, tokens) ?? getAt(props.base, tokens);

function entrySchema(row: ObjectEditorRowModel): JsonSchema {
  const raw = row.container === 'list' ? row.schema.items : row.schema.additionalProperties;
  return raw && typeof raw === 'object' ? nonNullSchema(props.schema, resolveSchema(props.schema, raw)) : {};
}

function initialValue(schema: JsonSchema): JsonValue {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'string') return '';
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'boolean') return false;
  return null;
}

function writeEntry(row: ObjectEditorRowModel, change: (container: JsonValue[] | JsonObject) => void) {
  const parent = row.tokens.slice(0, -1);
  const current = shown(parent);
  const copy = row.entry?.container === 'list'
    ? [...(Array.isArray(current) ? current : [])]
    : { ...(isJsonObject(current) ? current : {}) };
  change(copy);
  update(parent, copy);
}

function updateEntry(row: ObjectEditorRowModel, value: JsonValue | undefined) {
  writeEntry(row, (container) => {
    if (Array.isArray(container)) {
      if (value === undefined) container.splice(Number(row.key), 1);
      else container[Number(row.key)] = value;
    } else if (value === undefined) delete container[row.key];
    else container[row.key] = value;
  });
}

function addEntry(row: ObjectEditorRowModel) {
  const value = initialValue(entrySchema(row));
  const current = shown(row.tokens);
  if (row.container === 'list') {
    update(row.tokens, [...(Array.isArray(current) ? current : []), value]);
  } else {
    const map = { ...(isJsonObject(current) ? current : {}) };
    let key = 'key';
    for (let n = 2; Object.hasOwn(map, key); n++) key = `key${n}`;
    map[key] = value;
    update(row.tokens, map);
  }
}

function insertEntry(row: ObjectEditorRowModel) {
  const parent = views.value.find((entry) => entry.row.pointer === formatPointer(row.tokens.slice(0, -1)));
  if (!parent) return;
  writeEntry(row, (list) => (list as JsonValue[]).splice(Number(row.key) + 1, 0, initialValue(entrySchema(parent.row))));
}

function moveEntry(row: ObjectEditorRowModel, offset: -1 | 1) {
  writeEntry(row, (list) => {
    const items = list as JsonValue[];
    const from = Number(row.key);
    const to = from + offset;
    if (to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
  });
  nextTick(() => focus(formatPointer([...row.tokens.slice(0, -1), String(Number(row.key) + offset)])));
}

/** Map keys the user tried to give twice, by pointer of the entry: shown at the key. */
const keyErrors = ref(new Map<string, string>());

function renameEntry(row: ObjectEditorRowModel, key: string) {
  const parent = row.tokens.slice(0, -1);
  const current = shown(parent);
  const map = isJsonObject(current) ? current : {};
  const errors = new Map(keyErrors.value);
  errors.delete(row.pointer);
  if (key !== row.key && (key === '' || Object.hasOwn(map, key))) {
    errors.set(row.pointer, key === ''
      ? t('coar.objectEditor.keyEmpty', undefined, 'A key cannot be empty.')
      : t('coar.objectEditor.keyTaken', undefined, 'This key exists already.'));
  } else if (key !== row.key) {
    // Rebuilt in order, so the renamed entry keeps its place.
    update(parent, Object.fromEntries(Object.entries(map).map(([k, v]) => [k === row.key ? key : k, v])));
  }
  keyErrors.value = errors;
}

// Removing a value. Over a base, a group left empty by it is removed too: an
// empty local group would only stand in for the inherited one. Without a base,
// {} is a value and stays. An entry of a list or map leaves through its container.
function remove(tokens: string[]) {
  const entry = views.value.find((view) => view.row.pointer === formatPointer(tokens))?.row;
  if (entry?.entry) return updateEntry(entry, undefined);
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
  <div ref="root" class="coar-object-editor" :class="[`coar-object-editor--${mode}`, { 'coar-object-editor--striped': striped }]">
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
      :key-error="keyErrors.get(entry.row.pointer)"
      @update:value="entry.row.entry ? updateEntry(entry.row, $event) : update(entry.row.tokens, $event)"
      @remove="remove(entry.row.tokens)"
      @add="addEntry(entry.row)"
      @insert="insertEntry(entry.row)"
      @move="moveEntry(entry.row, $event)"
      @rename="renameEntry(entry.row, $event)"
      @edit="edit(entry.row.pointer)"
      @leave="editing = ''"
      @toggle="toggle(entry.row.pointer)"
    />
    <p v-if="!visible.length" class="coar-object-editor-empty">
      {{
        searching
          ? t('coar.objectEditor.noMatches', undefined, 'No property matches the search.')
          : view === 'local'
          ? t('coar.objectEditor.noLocalValues', undefined, 'No values are set here.')
          : t('coar.objectEditor.noProperties', undefined, 'The schema has no properties yet.')
      }}
    </p>
  </div>
</template>
