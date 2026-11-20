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
const DESCRIPTIVE = ['title', 'description', 'readOnly'] as const;

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

/** The schema a new property of `type` gets: built-in types inline, app types as `$ref` into `$defs`. */
export function propertySchemaFor(type: CoarValueType): JsonSchema {
  if (type.builtin) return { ...clone(type.schema), 'x-coar-type': type.id };
  return { $ref: `#/$defs/${type.id}`, 'x-coar-type': type.id };
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

export function addProperty(root: JsonSchema, objectPath: SchemaPath, key: string, type: CoarValueType): JsonSchema {
  const next = changeObject(root, objectPath, (object) => {
    if (Object.hasOwn(object.properties!, key)) throw new Error(`The key ${key} exists already.`);
    object.properties![key] = propertySchemaFor(type);
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

/** Gives a property another type; its title and description stay, its data keywords are replaced. */
export function changePropertyType(root: JsonSchema, path: SchemaPath, type: CoarValueType): JsonSchema {
  const key = path[path.length - 1];
  const before = propertyAt(root, path);
  const next = changeObject(root, path.slice(0, -1), (object) => {
    const old = object.properties![key];
    const kept = Object.fromEntries(DESCRIPTIVE.filter((k) => old[k] !== undefined).map((k) => [k, old[k]]));
    object.properties![key] = { ...propertySchemaFor(type), ...kept };
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

/** The options of a choice (`oneOf`) or of a multiple choice (`items.anyOf`). */
export function propertyOptions(property: JsonSchema): CoarObjectEditorOption[] {
  return property.type === 'array' && property.items ? optionsOf(property.items) : optionsOf(property);
}

export function setOptions(root: JsonSchema, path: SchemaPath, options: readonly CoarObjectEditorOption[]): JsonSchema {
  const key = path[path.length - 1];
  return changeObject(root, path.slice(0, -1), (object) => {
    const property = object.properties![key];
    if (property.type === 'array') {
      property.items = { anyOf: optionEntries(options) };
    } else {
      delete property.enum;
      delete property.anyOf;
      property.oneOf = optionEntries(options);
    }
  });
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
