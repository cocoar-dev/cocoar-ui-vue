import { formatPointer, isPointerPrefix } from '../core/pointer';
import { optionsOf, type CoarObjectEditorOption } from '../core/options';
import { allowsNull, detectTypeId, nonNullSchema, orderedKeys, refId, resolveSchema } from '../core/resolve';
import { isJsonObject, type JsonSchema, type JsonValue } from '../core/schema';
import type { CoarObjectEditorTypes, CoarValueType } from '../types/types';

/** One line of the object editor: a property of the schema, or a value the schema does not know. */
export interface ObjectEditorRowModel {
  pointer: string;
  tokens: string[];
  key: string;
  title: string;
  description?: string;
  required: boolean;
  depth: number;
  typeId: string;
  type: CoarValueType;
  /** The schema of the value, `$ref` resolved and without its `null` alternative. */
  schema: JsonSchema;
  /** The schema allows `null`. */
  nullable: boolean;
  options: CoarObjectEditorOption[];
  /** An object edited as the rows below it. */
  nested: boolean;
  /** A nested row whose rows are hidden. */
  collapsed: boolean;
  /** Refers (`$ref`) to a definition that already encloses it: closed until opened, one level per click. */
  recursive: boolean;
  /** A value in the data the schema has no property for. */
  extra: boolean;
  /** An ordered list or a map, edited as one row per entry. */
  container?: 'list' | 'map';
  /** An entry of a list or a map: its place among the others. */
  entry?: { container: 'list' | 'map'; index: number; count: number };
}

export type OptionSourceValues = Readonly<Record<string, readonly CoarObjectEditorOption[]>>;

/** `local`: the key is in the edited document; `inherited`: only `base` has a value; `absent`: neither. */
export type ObjectEditorRowState = 'local' | 'inherited' | 'absent';

/** Where an inherited value comes from, as the app describes it. */
export interface CoarObjectEditorOrigin {
  /** Short text beside the value, such as the name of the layer. */
  label: string;
  /** Longer text on hover. */
  title?: string;
  /** The contexts the value comes from disagree: no single value is shown as the one that applies. */
  conflict?: boolean;
}

/**
 * The shape the rows are built from: the local document over `base`, key by
 * key. It decides which groups and unknown keys exist; it is never stored, and
 * it is not a merge policy: a local value, also `null`, simply hides the base.
 * A group inherits the keys it does not set; a list, and an object for which
 * `replaces(tokens)` is true (a map), replaces the inherited one as a whole.
 */
export function overlay(
  base: JsonValue | undefined,
  local: JsonValue | undefined,
  replaces: (tokens: readonly string[]) => boolean = () => false,
  tokens: string[] = [],
): JsonValue | undefined {
  if (local === undefined) return base;
  if (!isJsonObject(local) || !isJsonObject(base)) return local;
  if (tokens.length && replaces(tokens)) return local;
  const result: Record<string, JsonValue> = { ...base };
  for (const [key, value] of Object.entries(local)) {
    result[key] = overlay(base[key], value, replaces, [...tokens, key]) as JsonValue;
  }
  return result;
}

/** Lets the app choose the value type of a property, e.g. from a marker of its own in the schema. */
export type CoarResolveType = (context: {
  /** The schema of the property, `$ref` resolved. */
  schema: JsonSchema;
  pointer: string;
  /** The type the editor recognized. */
  typeId: string;
}) => string | undefined;

export interface BuildRowsOptions {
  /** Every group that holds data is open, also a recursive one (still finite: the data is). */
  allWithData?: boolean;
  resolveType?: CoarResolveType;
  /** Every group is open, regardless of `toggled` (a search sees all rows). */
  allOpen?: boolean;
}

function optionsFor(root: JsonSchema, schema: JsonSchema, typeId: string, sources: OptionSourceValues) {
  const source = schema['x-coar-options'];
  if (source) return [...(sources[source] ?? [])];
  if (typeId === 'choices' && schema.items) return optionsOf(resolveSchema(root, schema.items));
  return optionsOf(schema);
}

/**
 * The rows of `value` under `root`, in display order; the rows below a collapsed
 * object are left out. A group is open by default, a recursive one closed;
 * `toggled` holds the pointers of the groups the user switched.
 */
export function buildRows(
  root: JsonSchema,
  value: JsonValue | undefined,
  types: CoarObjectEditorTypes,
  sources: OptionSourceValues,
  toggled: ReadonlySet<string>,
  { allWithData = false, resolveType, allOpen = false }: BuildRowsOptions = {},
): ObjectEditorRowModel[] {
  const known = new Set(types.keys());
  const fallback = types.get('json')!;
  const rows: ObjectEditorRowModel[] = [];

  // `refs`: the definitions that enclose this object. Without them a definition
  // that contains itself would add rows without end.
  function visit(
    schema: JsonSchema,
    object: JsonValue | undefined,
    tokens: string[],
    depth: number,
    refs: ReadonlySet<string>,
  ) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const data = isJsonObject(object) ? object : {};
    for (const key of orderedKeys(schema)) {
      const raw = properties[key];
      const full = resolveSchema(root, raw);
      const resolved = nonNullSchema(root, full);
      const childTokens = [...tokens, key];
      const pointer = formatPointer(childTokens);
      const detected = detectTypeId(root, raw, known);
      const chosen = resolveType?.({ schema: full, pointer, typeId: detected });
      const typeId = chosen && known.has(chosen) ? chosen : detected;
      const type = types.get(typeId) ?? fallback;
      const container = type.container;
      const nested = !!container || (!type.control && !type.readonlyOnly && !!resolved.properties);
      const ref = refId(raw);
      const recursive = !!ref && refs.has(ref);
      const collapsed = allWithData || allOpen
        ? nested && recursive && !isJsonObject(data[key])
        : nested && recursive !== toggled.has(pointer);
      rows.push({
        pointer,
        tokens: childTokens,
        key,
        title: resolved.title ?? key,
        description: resolved.description,
        required: required.has(key),
        depth,
        typeId,
        type,
        schema: resolved,
        nullable: allowsNull(full),
        options: optionsFor(root, resolved, typeId, sources),
        nested,
        collapsed,
        recursive,
        extra: false,
        ...(container ? { container } : {}),
      });
      if (container && !collapsed) entries(container, resolved, data[key], childTokens, depth + 1);
      else if (nested && !collapsed) {
        visit(resolved, data[key], childTokens, depth + 1, ref ? new Set([...refs, ref]) : refs);
      }
    }
    // Values the schema does not describe stay in the data and are shown read-only.
    for (const key of Object.keys(data)) {
      if (Object.hasOwn(properties, key)) continue;
      const childTokens = [...tokens, key];
      rows.push({
        pointer: formatPointer(childTokens),
        tokens: childTokens,
        key,
        title: key,
        required: false,
        depth,
        typeId: 'json',
        type: fallback,
        schema: {},
        nullable: true,
        options: [],
        nested: false,
        collapsed: false,
        recursive: false,
        extra: true,
      });
    }
  }

  // The entries of a list (by index) or a map (by key), each with the type of
  // `items` / `additionalProperties`.
  function entries(
    container: 'list' | 'map',
    schema: JsonSchema,
    data: JsonValue | undefined,
    tokens: string[],
    depth: number,
  ) {
    const raw = (container === 'list' ? schema.items : schema.additionalProperties) as JsonSchema | undefined;
    const itemRaw: JsonSchema = raw && typeof raw === 'object' ? raw : {};
    const full = resolveSchema(root, itemRaw);
    const resolved = nonNullSchema(root, full);
    const typeId = detectTypeId(root, itemRaw, known);
    const type = types.get(typeId) ?? fallback;
    const keys =
      container === 'list'
        ? (Array.isArray(data) ? data : []).map((_, index) => String(index))
        : Object.keys(isJsonObject(data) ? data : {});
    keys.forEach((key, index) => {
      const childTokens = [...tokens, key];
      rows.push({
        pointer: formatPointer(childTokens),
        tokens: childTokens,
        key,
        title: container === 'list' ? String(index + 1) : key,
        required: false,
        depth,
        typeId,
        type,
        schema: resolved,
        nullable: allowsNull(full),
        options: optionsFor(root, resolved, typeId, sources),
        nested: false,
        collapsed: false,
        recursive: false,
        extra: false,
        entry: { container, index, count: keys.length },
      });
    });
  }

  visit(resolveSchema(root, root), value, [], 0, new Set());
  return rows;
}

/**
 * The rows that match a search, and the groups that lead to them. A row matches
 * by its title, its key or its path (`dimensions.width`), never by its value.
 */
export function searchRows(rows: readonly ObjectEditorRowModel[], query: string): ObjectEditorRowModel[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  const hits = rows
    .filter((row) =>
      [row.title, row.key, row.tokens.join('.'), row.pointer].some((text) => text.toLowerCase().includes(needle)),
    )
    .map((row) => row.pointer);
  return rows.filter((row) => hits.some((pointer) => isPointerPrefix(row.pointer, pointer)));
}

/** The row an issue at `pointer` belongs to: the deepest row that contains it. */
export function rowForPointer(rows: readonly ObjectEditorRowModel[], pointer: string) {
  let found: ObjectEditorRowModel | undefined;
  for (const row of rows) {
    if (isPointerPrefix(row.pointer, pointer) && (!found || row.pointer.length > found.pointer.length)) found = row;
  }
  return found;
}
