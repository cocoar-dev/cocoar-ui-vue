import type { Translate } from './messages';
import { propertyOptions, type SchemaPath } from './schema-ops';
import { orderedKeys } from './resolve';
import type { JsonSchema } from './schema';

/** A problem of the schema itself, at the property it belongs to. */
export interface SchemaProblem {
  path: SchemaPath;
  /** What is wrong: the key, the range or the options. */
  field: 'key' | 'range' | 'options';
  code: 'invalidKey' | 'rangeOrder' | 'noOptions' | 'emptyOption' | 'duplicateOption';
}

/** Keys the editors write: a letter or `_` first, then letters, digits, `_` and `-`. */
export const PROPERTY_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** Checks what a JSON Schema validator does not: keys, ranges and option lists a person can get wrong. */
export function checkSchema(root: JsonSchema): SchemaProblem[] {
  const problems: SchemaProblem[] = [];
  function visit(object: JsonSchema, path: string[]) {
    for (const key of orderedKeys(object)) {
      const property = object.properties![key];
      const at = [...path, key];
      if (!PROPERTY_KEY_PATTERN.test(key)) problems.push({ path: at, field: 'key', code: 'invalidKey' });
      if (property.minimum !== undefined && property.maximum !== undefined && property.minimum > property.maximum) {
        problems.push({ path: at, field: 'range', code: 'rangeOrder' });
      }
      const isChoice = !!(property.oneOf ?? property.enum ?? property.items?.anyOf ?? property.items?.oneOf);
      if (isChoice) {
        const values = propertyOptions(property).map((option) => String(option.value));
        if (!values.length) problems.push({ path: at, field: 'options', code: 'noOptions' });
        if (values.some((value) => value.trim() === '')) problems.push({ path: at, field: 'options', code: 'emptyOption' });
        if (new Set(values).size !== values.length) {
          problems.push({ path: at, field: 'options', code: 'duplicateOption' });
        }
      }
      if (!property.$ref && property.properties) visit(property, at);
    }
  }
  visit(root, []);
  return problems;
}

const TEXTS: Record<SchemaProblem['code'], string> = {
  invalidKey: 'Use letters, digits, _ and -, starting with a letter.',
  rangeOrder: 'The minimum is above the maximum.',
  noOptions: 'Add at least one value.',
  emptyOption: 'Every value needs a text.',
  duplicateOption: 'Each value may appear only once.',
};

export function schemaProblemMessage(problem: SchemaProblem, t: Translate): string {
  return t(`coar.schemaEditor.${problem.code}`, undefined, TEXTS[problem.code]);
}
