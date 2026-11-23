import { isJsonObject, type JsonSchema, type JsonValue } from './schema';

/** The `pattern` of a colour as `#RRGGBB`. */
export const HEX_COLOR_PATTERN = '^#[0-9A-Fa-f]{6}$';

const LOCAL_REF = /^#\/(\$defs|definitions)\/(.+)$/;

/** The id of a local `#/$defs/<id>` reference, or undefined. */
export function refId(schema: JsonSchema): string | undefined {
  return schema.$ref ? LOCAL_REF.exec(schema.$ref)?.[2] : undefined;
}

/**
 * Follows local `$ref`s into `$defs` and merges the keywords beside the
 * reference over the target (a property's `title` wins over the type's).
 */
export function resolveSchema(root: JsonSchema, schema: JsonSchema): JsonSchema {
  let current = schema;
  for (let depth = 0; depth < 16 && current.$ref; depth++) {
    const match = LOCAL_REF.exec(current.$ref);
    const defs = match && (match[1] === '$defs' ? root.$defs : (root.definitions as Record<string, JsonSchema> | undefined));
    const target = match ? defs?.[match[2]] : undefined;
    if (!target) break;
    const beside = { ...current };
    delete beside.$ref;
    current = { ...target, ...beside };
  }
  return current;
}

/** The schema of the value at `tokens` (through `properties` and `items`), `$ref` resolved. */
export function schemaAt(root: JsonSchema, tokens: readonly string[]): JsonSchema | undefined {
  let schema: JsonSchema | undefined = resolveSchema(root, root);
  for (const token of tokens) {
    if (!schema) return undefined;
    const next: JsonSchema | undefined = schema.properties?.[token] ?? (/^\d+$/.test(token) ? schema.items : undefined);
    schema = next ? resolveSchema(root, next) : undefined;
  }
  return schema;
}

/** The keys of an object schema in display order: `x-coar-order` first, then the rest of `properties`. */
export function orderedKeys(schema: JsonSchema): string[] {
  const keys = Object.keys(schema.properties ?? {});
  const order = (schema['x-coar-order'] ?? []).filter((key) => keys.includes(key));
  return [...new Set([...order, ...keys])];
}

function hasType(schema: JsonSchema, type: string): boolean {
  return Array.isArray(schema.type) ? schema.type.includes(type) : schema.type === type;
}

const isNullEntry = (entry: JsonSchema) => entry.type === 'null' || ('const' in entry && entry.const === null);

/**
 * Whether the schema allows `null`: `type: [t, "null"]`, an `anyOf`/`oneOf`
 * entry `{ type: "null" }` or `{ const: null }`, or `null` in `enum`.
 */
export function allowsNull(schema: JsonSchema): boolean {
  if (hasType(schema, 'null')) return true;
  if ((schema.anyOf ?? schema.oneOf)?.some(isNullEntry)) return true;
  return Array.isArray(schema.enum) && schema.enum.includes(null);
}

/**
 * The schema without its `null` alternative, so a nullable value gets the type of
 * its other form: `type: ["boolean", "null"]` reads as `type: "boolean"`, and
 * `anyOf: [{ type: "boolean" }, { type: "null" }]` as `{ type: "boolean" }`.
 * The schema itself is not changed; validation keeps using it as written.
 */
export function nonNullSchema(root: JsonSchema, schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    const rest = schema.type.filter((type) => type !== 'null');
    return { ...schema, type: rest.length === 1 ? rest[0] : rest };
  }
  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const list = schema[keyword];
    if (!list?.some(isNullEntry)) continue;
    const others = list.filter((entry) => !isNullEntry(entry));
    // A choice keeps its other constants as the choice.
    if (others.length !== 1 || 'const' in others[0]) return { ...schema, [keyword]: others };
    const outer = { ...schema };
    delete outer[keyword];
    return { ...outer, ...resolveSchema(root, others[0]) };
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) {
    return { ...schema, enum: schema.enum.filter((value) => value !== null) };
  }
  return schema;
}

/** A list of constants, from `oneOf`/`anyOf` of `{ const }` or from `enum`. */
export function isChoiceList(schema: JsonSchema): boolean {
  const list = schema.oneOf ?? schema.anyOf;
  if (list) return list.length > 0 && list.every((entry) => 'const' in entry);
  return Array.isArray(schema.enum);
}

/**
 * The id of the value type of a property: `x-coar-type` when it names a known
 * type, otherwise recognized from the form of the schema.
 */
export function detectTypeId(root: JsonSchema, raw: JsonSchema, known: ReadonlySet<string>): string {
  const declared = raw['x-coar-type'];
  if (declared && known.has(declared)) return declared;
  const ref = refId(raw);
  if (ref && known.has(ref)) return ref;
  const schema = nonNullSchema(root, resolveSchema(root, raw));
  if (schema['x-coar-options'] || isChoiceList(schema)) return 'choice';
  if (hasType(schema, 'object') || schema.properties) return 'object';
  if (hasType(schema, 'array')) {
    const items = schema.items ? resolveSchema(root, schema.items) : {};
    if (isChoiceList(items)) return 'choices';
    if (hasType(items, 'object') || items.properties) return 'list';
    if (hasType(items, 'string')) return 'tags';
    return 'json';
  }
  if (hasType(schema, 'string')) {
    if (schema.format === 'date') return 'date';
    if (schema.format === 'email') return 'email';
    if (schema.pattern === HEX_COLOR_PATTERN) return 'color';
    return 'text';
  }
  if (hasType(schema, 'number') || hasType(schema, 'integer')) return 'number';
  if (hasType(schema, 'boolean')) return 'boolean';
  return 'json';
}

/** Whether a value counts as "not filled in" for `presence: 'filled'`. */
export function isEmptyValue(value: JsonValue | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (isJsonObject(value) && Object.keys(value).length === 0)
  );
}
