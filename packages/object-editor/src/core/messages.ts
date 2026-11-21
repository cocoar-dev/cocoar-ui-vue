import type { ObjectEditorIssue } from './validate';
import type { JsonSchema } from './schema';

/** `t` of `@cocoar/vue-localization`: key, parameters, fallback text. */
export type Translate = (key: string, params?: Record<string, unknown>, fallback?: string) => string;

function fill(text: string, params: Record<string, unknown>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

function message(t: Translate, key: string, fallback: string, params: Record<string, unknown> = {}): string {
  // Without a localization service `t` returns the fallback as it is.
  return fill(t(`coar.objectEditor.${key}`, params, fallback), params);
}

/** The text of an issue, from its keyword and the schema of its value. */
export function issueMessage(issue: ObjectEditorIssue, schema: JsonSchema, t: Translate): string {
  switch (issue.keyword) {
    case 'custom':
      return issue.message ?? message(t, 'invalid', 'Invalid value.');
    case 'required':
      return message(t, 'required', 'Required.');
    case 'minimum':
    case 'exclusiveMinimum':
      return message(t, 'minimum', 'At least {min}.', { min: schema.minimum ?? schema.exclusiveMinimum });
    case 'maximum':
    case 'exclusiveMaximum':
      return message(t, 'maximum', 'At most {max}.', { max: schema.maximum ?? schema.exclusiveMaximum });
    case 'minLength':
      return message(t, 'minLength', 'At least {min} characters.', { min: schema.minLength });
    case 'maxLength':
      return message(t, 'maxLength', 'At most {max} characters.', { max: schema.maxLength });
    case 'format':
      if (schema.format === 'date') return message(t, 'formatDate', 'Not a valid date.');
      if (schema.format === 'email') return message(t, 'formatEmail', 'Not a valid email address.');
      return message(t, 'format', 'Wrong format.');
    case 'pattern':
      return message(t, 'format', 'Wrong format.');
    case 'type':
      return message(t, 'type', 'Wrong kind of value.');
    case 'oneOf':
    case 'anyOf':
    case 'enum':
    case 'const':
      return message(t, 'notAllowed', 'Not one of the allowed values.');
    case 'uniqueItems':
      return message(t, 'unique', 'Each value may appear only once.');
    case 'additionalProperties':
    case 'unevaluatedProperties':
      return message(t, 'additional', 'Contains values the schema does not allow.');
    default:
      return message(t, 'invalid', 'Invalid value.');
  }
}
