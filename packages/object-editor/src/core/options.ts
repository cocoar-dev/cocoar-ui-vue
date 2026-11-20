import type { JsonSchema, JsonValue } from './schema';

/** One allowed value of a choice. */
export interface CoarObjectEditorOption {
  value: JsonValue;
  label: string;
  description?: string;
}

/** The fixed options of a choice schema (`oneOf`/`anyOf` of `{ const, title }`, or `enum`). */
export function optionsOf(schema: JsonSchema): CoarObjectEditorOption[] {
  const list = schema.oneOf ?? schema.anyOf;
  if (list) {
    return list
      .filter((entry) => 'const' in entry)
      .map((entry) => ({
        value: entry.const as JsonValue,
        label: entry.title ?? String(entry.const),
        ...(entry.description ? { description: entry.description } : {}),
      }));
  }
  return (schema.enum ?? []).map((value) => ({ value, label: String(value) }));
}

/** The `oneOf` / `anyOf` entries for a list of options. */
export function optionEntries(options: readonly CoarObjectEditorOption[]): JsonSchema[] {
  return options.map((option) => ({
    const: option.value,
    title: option.label,
    ...(option.description ? { description: option.description } : {}),
  }));
}
