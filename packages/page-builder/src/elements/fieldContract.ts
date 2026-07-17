/**
 * Field-contract helpers: which contract fields can an element edit, and
 * which elements can represent a field. Compatibility is exact token match
 * between `ElementValueSpec.types` and `PageFieldSpec.valueType`; a value
 * spec WITHOUT declared types is unconstrained (compatible with everything —
 * never falsely blocking a consumer element that didn't declare).
 */
import type { PageFieldSpec, PageValueType } from '../schema';
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
 * representation switch.
 */
export function compatibleElementTypes(
  elements: PageElementRegistry,
  valueType: PageValueType,
): string[] {
  return Object.entries(elements)
    .filter(([, def]) =>
      !!def.value && (!def.value.types || def.value.types.length === 0
        ? true
        : def.value.types.includes(valueType)),
    )
    .map(([type]) => type);
}

/** The element type the field-first flow creates for a field. */
export function defaultElementForField(
  elements: PageElementRegistry,
  field: PageFieldSpec,
): string | undefined {
  if (field.defaultElement && elements[field.defaultElement]?.builder) return field.defaultElement;
  return compatibleElementTypes(elements, field.valueType).find(
    (type) => !!elements[type].builder,
  );
}
