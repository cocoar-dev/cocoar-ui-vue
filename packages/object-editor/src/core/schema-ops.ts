import { optionEntries, optionsOf, type CoarObjectEditorOption } from './options';
import { orderedKeys, refId } from './resolve';
import { isJsonObject, type JsonSchema } from './schema';
import type { CoarValueType } from '../types/types';

/**
 * The keys from the root to a property, such as `['dimensions', 'width']`. The
 * operations below never change the schema they get; they return a new one.
 */
export type SchemaPath = readonly string[];

/** Keywords a type change keeps: what describes the property, not its data. */
const DESCRIPTIVE = ['title', 'description', 'readOnly', 'deprecated', 'writeOnly', '$comment'] as const;

// Annotations of other tools (`x-…`, not the editor's own `x-coar-…`) describe the
// property too, not its data: a type change keeps them.
const keptByTypeChange = (keyword: string) =>
  (DESCRIPTIVE as readonly string[]).includes(keyword) || (keyword.startsWith('x-') && !keyword.startsWith('x-coar-'));

// A schema is JSON. A JSON round trip also copies reactive proxies of Vue,
// which structuredClone refuses.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The object schema at `path` (the root for `[]`), or undefined when it is not an editable object. */
export function objectSchemaAt(root: JsonSchema, path: SchemaPath): JsonSchema | undefined {
  let current: JsonSchema | undefined = root;
  for (const key of path) current = current?.properties?.[key];
  return current && !current.$ref && (current.type === 'object' || current.properties) ? current : undefined;
}

/** The schema of the property at `path`, as written (not resolved). */
export function propertyAt(root: JsonSchema, path: SchemaPath): JsonSchema | undefined {
  if (!path.length) return undefined;
  return objectSchemaAt(root, path.slice(0, -1))?.properties?.[path[path.length - 1]];
}

// Applies `change` to a copy of the object schema at `path` and returns the new root.
function changeObject(root: JsonSchema, path: SchemaPath, change: (object: JsonSchema) => void): JsonSchema {
  const next = clone(root);
  const object = objectSchemaAt(next, path);
  if (!object) throw new Error(`No object schema at /${path.join('/')}`);
  object.properties ??= {};
  change(object);
  return next;
}

/** How a choice writes its allowed values: `oneOf` of `{ const, title }` (with texts) or a plain `enum`. */
export type ChoiceEncoding = 'oneOf' | 'enum';

export interface AuthoringOptions {
  choiceEncoding?: ChoiceEncoding;
}

const isNullEntry = (entry: JsonSchema) => entry.type === 'null' || ('const' in entry && entry.const === null);

function hasType(schema: JsonSchema, type: string) {
  return Array.isArray(schema.type) ? schema.type.includes(type) : schema.type === type;
}

// Writes the options into a choice schema, keeping a null alternative it has.
function writeOptions(target: JsonSchema, options: readonly CoarObjectEditorOption[], encoding: ChoiceEncoding) {
  const nulls = [...(target.oneOf ?? []), ...(target.anyOf ?? [])].filter(isNullEntry);
  const hadNullInEnum = Array.isArray(target.enum) && target.enum.includes(null);
  const keyword = target.anyOf && !target.oneOf ? 'anyOf' : 'oneOf';
  delete target.oneOf;
  delete target.anyOf;
  delete target.enum;
  if (encoding === 'enum') {
    target.enum = [...options.map((option) => option.value), ...(hadNullInEnum || nulls.length ? [null] : [])];
  } else {
    target[keyword] = [...optionEntries(options), ...nulls];
  }
}

/** The schema a new property of `type` gets: built-in types inline, app types as `$ref` into `$defs`. */
export function propertySchemaFor(type: CoarValueType, { choiceEncoding = 'oneOf' }: AuthoringOptions = {}): JsonSchema {
  if (!type.builtin) return { $ref: `#/$defs/${type.id}`, 'x-coar-type': type.id };
  const schema: JsonSchema = { ...clone(type.schema), 'x-coar-type': type.id };
  if (choiceEncoding === 'enum') {
    const target = type.id === 'choices' ? schema.items : type.id === 'choice' ? schema : undefined;
    if (target) writeOptions(target, optionsOf(target), 'enum');
  }
  return schema;
}

function withDefinition(root: JsonSchema, type: CoarValueType): void {
  if (type.builtin) return;
  root.$defs ??= {};
  root.$defs[type.id] ??= clone(type.schema);
}

/** A key not yet used in the object, from `base`, `base2`, `base3` … */
export function uniqueKey(object: JsonSchema, base = 'property'): string {
  const keys = new Set(Object.keys(object.properties ?? {}));
  if (!keys.has(base)) return base;
  let index = 2;
  while (keys.has(`${base}${index}`)) index++;
  return `${base}${index}`;
}

export function addProperty(
  root: JsonSchema,
  objectPath: SchemaPath,
  key: string,
  type: CoarValueType,
  options: AuthoringOptions = {},
): JsonSchema {
  const next = changeObject(root, objectPath, (object) => {
    if (Object.hasOwn(object.properties!, key)) throw new Error(`The key ${key} exists already.`);
    object.properties![key] = propertySchemaFor(type, options);
    object['x-coar-order'] = [...orderedKeys(object).filter((k) => k !== key), key];
  });
  withDefinition(next, type);
  return next;
}

export function removeProperty(root: JsonSchema, path: SchemaPath): JsonSchema {
  const key = path[path.length - 1];
  const before = propertyAt(root, path);
  const next = changeObject(root, path.slice(0, -1), (object) => {
    delete object.properties![key];
    const required = (object.required ?? []).filter((k) => k !== key);
    if (required.length) object.required = required;
    else delete object.required;
    if (object['x-coar-order']) object['x-coar-order'] = object['x-coar-order'].filter((k) => k !== key);
  });
  return dropUnusedDefinition(next, before);
}

/** Renames a property in place: its position, its schema and whether it is required stay. */
export function renameProperty(root: JsonSchema, path: SchemaPath, newKey: string): JsonSchema {
  const key = path[path.length - 1];
  if (key === newKey) return root;
  return changeObject(root, path.slice(0, -1), (object) => {
    if (Object.hasOwn(object.properties!, newKey)) throw new Error(`The key ${newKey} exists already.`);
    const order = orderedKeys(object).map((k) => (k === key ? newKey : k));
    object.properties = Object.fromEntries(
      Object.entries(object.properties!).map(([k, schema]) => [k === key ? newKey : k, schema]),
    );
    object['x-coar-order'] = order;
    if (object.required) object.required = object.required.map((k) => (k === key ? newKey : k));
  });
}

/** Moves a property one place up (`-1`) or down (`1`) in `x-coar-order`. */
export function moveProperty(root: JsonSchema, path: SchemaPath, offset: -1 | 1): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const order = orderedKeys(object);
    const from = order.indexOf(key);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    object['x-coar-order'] = order;
  });
}

/**
 * The keywords a type change would drop: what the property has beyond its
 * title, description and `readOnly` that the new type's schema does not set.
 * Show them before the change; an empty list means nothing is lost.
 */
export function droppedByTypeChange(root: JsonSchema, path: SchemaPath, type: CoarValueType): string[] {
  const before = propertyAt(root, path) ?? {};
  const after = propertySchemaFor(type);
  return Object.keys(before).filter(
    (keyword) => !keptByTypeChange(keyword) && keyword !== 'x-coar-type' && !(keyword in after),
  );
}

/** Gives a property another type; its title and description stay, its data keywords are replaced. */
export function changePropertyType(
  root: JsonSchema,
  path: SchemaPath,
  type: CoarValueType,
  options: AuthoringOptions = {},
): JsonSchema {
  const key = path[path.length - 1];
  const before = propertyAt(root, path);
  const next = changeObject(root, path.slice(0, -1), (object) => {
    const old = object.properties![key];
    const kept = Object.fromEntries(Object.entries(old).filter(([k]) => keptByTypeChange(k)));
    object.properties![key] = { ...propertySchemaFor(type, options), ...kept };
  });
  withDefinition(next, type);
  return dropUnusedDefinition(next, before);
}

/** Sets keywords of a property; `undefined` removes one. */
export function updateProperty(root: JsonSchema, path: SchemaPath, patch: Partial<JsonSchema>): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const property = object.properties![key];
    for (const [keyword, value] of Object.entries(patch)) {
      if (value === undefined || value === '') delete property[keyword];
      else property[keyword] = clone(value);
    }
  });
}

export function setRequired(root: JsonSchema, path: SchemaPath, required: boolean): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const list = (object.required ?? []).filter((k) => k !== key);
    if (required) list.push(key);
    if (list.length) object.required = orderedKeys(object).filter((k) => list.includes(k));
    else delete object.required;
  });
}

/** The options of a choice (`oneOf`/`enum`) or of a multiple choice (`items`), without a null alternative. */
export function propertyOptions(property: JsonSchema): CoarObjectEditorOption[] {
  const target = hasType(property, 'array') && property.items ? property.items : property;
  return optionsOf(target).filter((option) => option.value !== null);
}

/** How a property writes its options now: `enum`, or `oneOf`/`anyOf` with texts. */
export function choiceEncodingOf(property: JsonSchema): ChoiceEncoding {
  const target = hasType(property, 'array') && property.items ? property.items : property;
  return Array.isArray(target.enum) ? 'enum' : 'oneOf';
}

/** Sets the allowed values; keeps the property's encoding unless one is given, and keeps a null alternative. */
export function setOptions(
  root: JsonSchema,
  path: SchemaPath,
  options: readonly CoarObjectEditorOption[],
  encoding?: ChoiceEncoding,
): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const property = object.properties![key];
    const use = encoding ?? choiceEncodingOf(property);
    if (hasType(property, 'array')) {
      property.items = { ...(property.items ?? {}) };
      if (!property.items.oneOf && !property.items.enum) property.items.anyOf ??= [];
      writeOptions(property.items, options, use);
    } else {
      writeOptions(property, options, use);
    }
  });
}

/** The schema of the items of a list (`items`) or the values of a map (`additionalProperties`). */
export function setEntryType(root: JsonSchema, path: SchemaPath, type: CoarValueType): JsonSchema {
  const key = path[path.length - 1];
  const next = changeObject(root, path.slice(0, -1), (object) => {
    const property = object.properties![key];
    const entry = propertySchemaFor(type);
    if (hasType(property, 'array')) property.items = entry;
    else property.additionalProperties = entry;
  });
  withDefinition(next, type);
  return next;
}

/** Whether the property allows null, in whatever form it already uses. */
export function isNullable(property: JsonSchema): boolean {
  if (hasType(property, 'null')) return true;
  if ((property.anyOf ?? property.oneOf)?.some(isNullEntry)) return true;
  return Array.isArray(property.enum) && property.enum.includes(null);
}

/**
 * Allows or forbids null, keeping the form the property has: an `anyOf`/`oneOf`
 * gets or loses `{ "type": "null" }`, an `enum` gets or loses `null`, a `$ref`
 * is wrapped into (or unwrapped from) `anyOf`, anything else uses a `type` array.
 */
export function setNullable(root: JsonSchema, path: SchemaPath, nullable: boolean): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const property = object.properties![key];
    if (isNullable(property) === nullable) return;
    // A typed enum or choice also needs "null" in its type, or the type rejects null.
    const typeAllowsNull = () => {
      if (!property.type) return;
      const types = (Array.isArray(property.type) ? property.type : [property.type]).filter((t) => t !== 'null');
      const next = nullable ? [...types, 'null'] : types;
      property.type = next.length === 1 ? next[0] : next;
    };
    const list = property.anyOf ? 'anyOf' : property.oneOf ? 'oneOf' : undefined;
    if (list) {
      typeAllowsNull();
      property[list] = nullable ? [...property[list]!, { type: 'null' }] : property[list]!.filter((e) => !isNullEntry(e));
      const rest = property[list]!;
      // An anyOf that only wrapped a $ref for null goes back to the plain $ref.
      if (!nullable && list === 'anyOf' && rest.length === 1 && rest[0].$ref) {
        delete property.anyOf;
        property.$ref = rest[0].$ref;
      }
    } else if (Array.isArray(property.enum)) {
      typeAllowsNull();
      property.enum = nullable ? [...property.enum, null] : property.enum.filter((value) => value !== null);
    } else if (property.$ref) {
      if (nullable) {
        property.anyOf = [{ $ref: property.$ref }, { type: 'null' }];
        delete property.$ref;
      }
    } else if (property.type) {
      const types = (Array.isArray(property.type) ? property.type : [property.type]).filter((t) => t !== 'null');
      const nextTypes = nullable ? [...types, 'null'] : types;
      property.type = nextTypes.length === 1 ? nextTypes[0] : nextTypes;
    }
  });
}

/** Keywords the schema editor reads and writes; a property with others is shown, not edited. */
const SUPPORTED = new Set([
  'type', 'title', 'description', 'default', 'readOnly', 'properties', 'required', 'items', 'additionalProperties',
  'uniqueItems', 'oneOf', 'anyOf', 'enum', 'const', 'format', 'pattern', 'minimum', 'maximum', 'minLength',
  'maxLength', '$ref', '$comment', 'examples', 'deprecated', 'writeOnly',
]);

/** The keywords of a property the schema editor cannot edit (`allOf`, `if`, `patternProperties`, …). */
export function unsupportedKeywords(property: JsonSchema): string[] {
  const own = Object.keys(property).filter((keyword) => !SUPPORTED.has(keyword) && !keyword.startsWith('x-'));
  if (property.$ref && !/^#\/(\$defs|definitions)\//.test(property.$ref)) own.push('$ref');
  const variants = (property.anyOf ?? property.oneOf ?? []).filter((entry) => !isNullEntry(entry) && !('const' in entry));
  if (variants.length > 1) own.push(property.anyOf ? 'anyOf' : 'oneOf');
  return own;
}

function collectRefs(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) value.forEach((entry) => collectRefs(entry, into));
  else if (isJsonObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (key === '$defs') continue;
      if (key === '$ref' && typeof entry === 'string') {
        const id = refId({ $ref: entry });
        if (id) into.add(id);
      } else collectRefs(entry, into);
    }
  }
}

/**
 * Removes the definition a removed or retyped property referred to, once nothing
 * refers to it any more (directly or through another definition). Other
 * definitions stay, also unused ones a schema brought along.
 */
function dropUnusedDefinition(root: JsonSchema, before: JsonSchema | undefined): JsonSchema {
  const id = before && refId(before);
  if (!id || !root.$defs?.[id]) return root;
  const used = new Set<string>();
  collectRefs(root, used);
  let size = -1;
  while (size !== used.size) {
    size = used.size;
    for (const ref of [...used]) collectRefs(root.$defs[ref], used);
  }
  if (used.has(id)) return root;
  const defs = { ...root.$defs };
  delete defs[id];
  const next: JsonSchema = { ...root, $defs: defs };
  if (!Object.keys(defs).length) delete next.$defs;
  return next;
}
