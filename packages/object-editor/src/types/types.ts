import type { Component } from 'vue';
import type { CoarObjectEditorOption } from '../core/options';
import type { Translate } from '../core/messages';
import type { JsonSchema, JsonValue } from '../core/schema';

/** Props every value control receives; it emits `update:modelValue` (`undefined` clears the value). */
export interface CoarValueControlProps<TValue = JsonValue> {
  modelValue: TValue | undefined;
  /** The schema of the value, `$ref` resolved. */
  schema: JsonSchema;
  id: string;
  /** Accessible name of the control (the title of the property). */
  label: string;
  readonly: boolean;
  error: boolean;
  /** Allowed values: from the schema, or from the option source it names. */
  options: CoarObjectEditorOption[];
  locale?: string;
}

/** Props of a component that shows a value in view mode. */
export interface CoarValueViewProps<TValue = JsonValue> {
  value: TValue | undefined;
  schema: JsonSchema;
  options: CoarObjectEditorOption[];
  locale?: string;
}

export interface CoarValueContext {
  schema: JsonSchema;
  options: CoarObjectEditorOption[];
  locale?: string;
  t: Translate;
}

/** What the schema editor offers for a property of the type. */
export type CoarTypeSetting = 'range' | 'decimals' | 'unit' | 'options' | 'suggestions' | 'itemType' | 'valueType';

/**
 * A value type: the shape of its data and how the editors show it. The built-in
 * types and the types of an app are entries of the same register.
 */
// format, isEmpty and validate are methods: their parameter is then checked
// bivariantly, so a CoarValueType<Money> fits a register of CoarValueType.
export interface CoarValueType<TValue = unknown> {
  /** Written to `x-coar-type`; an app type is also its key in `$defs`. */
  id: string;
  /** Name in the type list of the schema editor. */
  label: string;
  /** Icon name of `@cocoar/vue-ui`. */
  icon: string;
  /** Hue (0–360) of the icon badge. */
  hue?: number;
  /** The schema of the data. Built-in types write it into the property; app types into `$defs`. */
  schema: JsonSchema;
  settings?: readonly CoarTypeSetting[];
  /** Edits the value; without one, an object type is edited as nested rows. */
  control?: Component;
  /** Extra props for `control`. */
  controlProps?: Record<string, unknown>;
  /** Shows the value in view mode; without one, `format` gives its text. */
  view?: Component;
  format?(value: TValue, context: CoarValueContext): string;
  /** With `presence="filled"`: whether a value counts as not filled in (default: `null`, `""`, `[]`, `{}`). */
  isEmpty?(value: TValue | undefined): boolean;
  /** A check beyond the schema; returns a message or null. */
  validate?(value: TValue, context: CoarValueContext): string | null;
  /** The control stays in view mode too, read-only (single-line text: switching modes moves nothing). */
  controlInView?: boolean;
  /** In edit mode a one-line preview until the value is clicked (multiline text). */
  previewInEdit?: boolean;
  /** Built in: written inline into the property instead of `$defs`. Set by the package. */
  builtin?: boolean;
  /** Edited as one row per entry: an ordered list (`items`) or a map (`additionalProperties`). Set by the package. */
  container?: 'list' | 'map';
  /** Shown read-only and not offered in the schema editor (lists of objects, unknown values). */
  readonlyOnly?: boolean;
  /**
   * A secret or other value that must not appear as text: the editor shows it
   * only through `format` or `view` of this type, never in generic output.
   */
  sensitive?: boolean;
  /**
   * `false`: the stored value has another form than the schema describes (an
   * encrypted envelope for a logical string), so the schema's checks are not
   * applied at this value; `validate` of the type still is.
   */
  validateSchema?: boolean;
}

export type CoarObjectEditorTypes = ReadonlyMap<string, CoarValueType>;
