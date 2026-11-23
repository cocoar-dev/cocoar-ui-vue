import { formatPointer, isPointerPrefix } from '../core/pointer';
import { optionsOf, type CoarObjectEditorOption } from '../core/options';
import { detectTypeId, orderedKeys, refId, resolveSchema } from '../core/resolve';
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
  /** The schema of the value, `$ref` resolved. */
  schema: JsonSchema;
  options: CoarObjectEditorOption[];
  /** An object edited as the rows below it. */
  nested: boolean;
  /** A nested row whose rows are hidden. */
  collapsed: boolean;
  /** Refers (`$ref`) to a definition that already encloses it: closed until opened, one level per click. */
  recursive: boolean;
  /** A value in the data the schema has no property for. */
  extra: boolean;
}

export type OptionSourceValues = Readonly<Record<string, readonly CoarObjectEditorOption[]>>;

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
 * `allWithData`: every group that holds data is open, also a recursive one
 * (still finite: the data is), for checks that must see every value.
 */
export function buildRows(
  root: JsonSchema,
  value: JsonValue | undefined,
  types: CoarObjectEditorTypes,
  sources: OptionSourceValues,
  toggled: ReadonlySet<string>,
  allWithData = false,
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
      const resolved = resolveSchema(root, raw);
      const typeId = detectTypeId(root, raw, known);
      const type = types.get(typeId) ?? fallback;
      const childTokens = [...tokens, key];
      const pointer = formatPointer(childTokens);
      const nested = !type.control && !type.readonlyOnly && !!resolved.properties;
      const ref = refId(raw);
      const recursive = !!ref && refs.has(ref);
      const collapsed = allWithData
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
        options: optionsFor(root, resolved, typeId, sources),
        nested,
        collapsed,
        recursive,
        extra: false,
      });
      if (nested && !collapsed) {
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
        options: [],
        nested: false,
        collapsed: false,
        recursive: false,
        extra: true,
      });
    }
  }

  visit(resolveSchema(root, root), value, [], 0, new Set());
  return rows;
}

/** The row an issue at `pointer` belongs to: the deepest row that contains it. */
export function rowForPointer(rows: readonly ObjectEditorRowModel[], pointer: string) {
  let found: ObjectEditorRowModel | undefined;
  for (const row of rows) {
    if (isPointerPrefix(row.pointer, pointer) && (!found || row.pointer.length > found.pointer.length)) found = row;
  }
  return found;
}
