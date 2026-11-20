// Components
export { default as CoarObjectEditor } from './components/CoarObjectEditor.vue';
export type { CoarObjectEditorOptionSource } from './components/CoarObjectEditor.vue';

// Value types
export { COAR_BUILTIN_VALUE_TYPES, defineObjectEditorTypes } from './types/builtins';
export type {
  CoarObjectEditorTypes,
  CoarTypeSetting,
  CoarValueContext,
  CoarValueControlProps,
  CoarValueType,
  CoarValueViewProps,
} from './types/types';

// Schema, values and validation
export { createObjectSchema, isJsonObject, SCHEMA_DIALECT } from './core/schema';
export type { JsonObject, JsonSchema, JsonValue } from './core/schema';
export { formatPointer, getAt, parsePointer, setAt } from './core/pointer';
export { detectTypeId, orderedKeys, resolveSchema } from './core/resolve';
export { optionsOf } from './core/options';
export type { CoarObjectEditorOption } from './core/options';
export { validateValue } from './core/validate';
export type { ObjectEditorIssue } from './core/validate';
