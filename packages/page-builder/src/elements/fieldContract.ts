/**
 * Field-contract helpers: which contract fields can an element edit, and
 * which elements can represent a field. Compatibility is exact token match
 * between `ElementValueSpec.types` and `PageFieldSpec.valueType`; a value
 * spec WITHOUT declared types is unconstrained (compatible with everything —
 * never falsely blocking a consumer element that didn't declare).
 */
import { isElementAllowed } from '../schema';
import type { PageConfig, PageFieldSpec, PageValueType } from '../schema';
import type { PageElementDefinition, PageElementRegistry } from './registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFieldCompatible(def: PageElementDefinition<any>, field: PageFieldSpec): boolean {
  if (!def.value) return false;
  if (!def.value.types || def.value.types.length === 0) return true;
  return def.value.types.includes(field.valueType);
}

/** Contract fields the given element may bind to. */
export function compatibleFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: PageElementDefinition<any> | undefined,
  fields: PageFieldSpec[] | undefined,
): PageFieldSpec[] {
  if (!def?.value || !fields) return [];
  return fields.filter((f) => isFieldCompatible(def, f));
}

/**
 * Registry entries that can represent the given value type (registry order —
 * built-ins first). Used by the field-first palette flow and the
 * representation switch. Pass the config to honour `allowedElements` — the
 * allow-list governs what may be USED, everywhere.
 */
export function compatibleElementTypes(
  elements: PageElementRegistry,
  valueType: PageValueType,
  config?: PageConfig,
): string[] {
  return Object.entries(elements)
    .filter(([type, def]) =>
      !!def.value &&
      (!def.value.types || def.value.types.length === 0
        ? true
        : def.value.types.includes(valueType)) &&
      isElementAllowed(type, config),
    )
    .map(([type]) => type);
}

// ─── Typed field lists (opt-in) ───────────────────────────────────────────────

/**
 * PageValueType tokens a DTO property type can legitimately map to. String
 * properties admit the date tokens too — dates travel as ISO strings.
 */
export type ValueTypeFor<T> =
  NonNullable<T> extends boolean ? 'boolean'
  : NonNullable<T> extends number ? 'number'
  : NonNullable<T> extends string ? 'string' | 'date' | 'datetime'
  : NonNullable<T> extends Date ? 'date' | 'datetime'
  : NonNullable<T> extends readonly string[] ? 'string[]'
  : PageValueType;

/** A PageFieldSpec whose `name` and `valueType` are checked against `TDto`. */
export type TypedFieldSpec<TDto> = {
  [K in keyof TDto & string]: {
    name: K;
    valueType: ValueTypeFor<TDto[K]>;
    label?: string;
    required?: boolean;
    defaultElement?: string;
  };
}[keyof TDto & string];

/**
 * Opt-in compile-time contract for a STATIC DTO: field names must be DTO
 * properties and value types must fit the property types. Zero runtime cost
 * (identity), and the result is a plain `PageFieldSpec[]` — so dynamic
 * extension stays trivial: `[...defineFields<LoginDto>([...]), ...extras]`.
 * DTOs that grow at runtime simply use `PageFieldSpec[]` directly.
 */
export function defineFields<TDto>(fields: readonly TypedFieldSpec<TDto>[]): PageFieldSpec[] {
  // The unresolved generic keeps TS from seeing the (real) structural overlap.
  return fields as unknown as PageFieldSpec[];
}

/**
 * The element type the field-first flow creates for a field: the field's
 * `defaultElement` when it is registered AND allowed, else the first
 * compatible, allowed, placeable element in registry order.
 */
export function defaultElementForField(
  elements: PageElementRegistry,
  field: PageFieldSpec,
  config?: PageConfig,
): string | undefined {
  if (
    field.defaultElement &&
    elements[field.defaultElement]?.builder &&
    isElementAllowed(field.defaultElement, config)
  ) {
    return field.defaultElement;
  }
  return compatibleElementTypes(elements, field.valueType, config).find(
    (type) => !!elements[type].builder,
  );
}
