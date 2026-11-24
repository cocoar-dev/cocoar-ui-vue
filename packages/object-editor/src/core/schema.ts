/** A JSON value as the editors read and write it. */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * The part of JSON Schema (Draft 2020-12) the editors understand, plus the
 * `x-coar-*` extensions they write. Other keywords are kept and still validated.
 */
export interface JsonSchema {
  $schema?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  title?: string;
  description?: string;
  default?: JsonValue;
  readOnly?: boolean;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  uniqueItems?: boolean;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  enum?: JsonValue[];
  const?: JsonValue;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  /** Id of the value type of a property (see `CoarValueType`). */
  'x-coar-type'?: string;
  /** Order of the properties of an object; keys not listed follow in `properties` order. */
  'x-coar-order'?: string[];
  /** Unit shown after a number, such as `cm`. */
  'x-coar-unit'?: string;
  /** Decimal places of a number; without it 0 for `integer` and 2 for `number`. */
  'x-coar-decimals'?: number;
  /** Name of an option source the app passes in `optionSources`. */
  'x-coar-options'?: string;
  /** Suggested values of free tags. */
  'x-coar-suggestions'?: string[];
  [keyword: string]: unknown;
}

export const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/** The fixed decimal places of a number: `x-coar-decimals`, 0 for `integer`, none otherwise. */
export function numberScale(schema: JsonSchema): number | undefined {
  return schema['x-coar-decimals'] ?? (schema.type === 'integer' ? 0 : undefined);
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An empty object schema to start a schema editor with. */
export function createObjectSchema(): JsonSchema {
  return { $schema: SCHEMA_DIALECT, type: 'object', properties: {}, 'x-coar-order': [] };
}
