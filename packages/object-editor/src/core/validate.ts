import { Validator } from '@cfworker/json-schema';
import { formatPointer } from './pointer';
import { isEmptyValue, orderedKeys, resolveSchema } from './resolve';
import { isJsonObject, type JsonSchema, type JsonValue } from './schema';

/** A problem of a value, at the JSON Pointer of the value it belongs to. */
export interface ObjectEditorIssue {
  pointer: string;
  /** The JSON Schema keyword that failed, or `custom` for the check of a value type. */
  keyword: string;
  /** Set for `custom` issues: the message of the value type. */
  message?: string;
}

// Keywords that only summarize the errors of their subschemas.
const SUMMARIES = new Set(['properties', 'items', 'prefixItems', '$ref', 'allOf', 'required', 'dependentSchemas']);

const validators = new WeakMap<JsonSchema, Validator>();

function validatorFor(schema: JsonSchema): Validator {
  let validator = validators.get(schema);
  if (!validator) {
    // cfworker interprets the schema; it never compiles code, so no CSP 'unsafe-eval'.
    validator = new Validator(schema as never, '2020-12', false);
    validators.set(schema, validator);
  }
  return validator;
}

function toPointer(instanceLocation: string): string {
  const fragment = instanceLocation.replace(/^#/, '');
  try {
    return decodeURI(fragment);
  } catch {
    return fragment;
  }
}

// "required" is reported at the missing property, not at its parent, and an
// empty value ("" or []) counts as missing.
function collectRequired(
  root: JsonSchema,
  raw: JsonSchema,
  value: JsonValue | undefined,
  tokens: string[],
  out: ObjectEditorIssue[],
): void {
  const schema = resolveSchema(root, raw);
  if (!schema.properties || !isJsonObject(value)) return;
  const required = new Set(schema.required ?? []);
  for (const key of orderedKeys(schema)) {
    const child = value[key];
    if (required.has(key) && isEmptyValue(child)) {
      out.push({ pointer: formatPointer([...tokens, key]), keyword: 'required' });
    } else if (child !== undefined) {
      collectRequired(root, schema.properties[key], child, [...tokens, key], out);
    }
  }
}

/** Validates `value` against `schema` and returns one issue per failing keyword. */
export function validateValue(schema: JsonSchema, value: JsonValue | undefined): ObjectEditorIssue[] {
  // An object nobody filled in yet is an empty object: its required values are missing.
  const instance = value ?? {};
  const issues: ObjectEditorIssue[] = [];
  collectRequired(schema, schema, instance, [], issues);
  const result = validatorFor(schema).validate(instance);
  const seen = new Set<string>();
  const choiceAt = new Set(
    result.errors.filter((e) => e.keyword === 'oneOf' || e.keyword === 'anyOf').map((e) => e.instanceLocation),
  );
  for (const error of result.errors) {
    if (SUMMARIES.has(error.keyword)) continue;
    // The `const` failures inside a choice repeat its oneOf/anyOf failure.
    if (error.keyword === 'const' && choiceAt.has(error.instanceLocation)) continue;
    const pointer = toPointer(error.instanceLocation);
    const id = `${pointer} ${error.keyword}`;
    if (seen.has(id)) continue;
    seen.add(id);
    issues.push({ pointer, keyword: error.keyword });
  }
  return issues;
}
