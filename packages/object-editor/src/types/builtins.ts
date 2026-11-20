import { markRaw } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { HEX_COLOR_PATTERN } from '../core/resolve';
import { isJsonObject, type JsonValue } from '../core/schema';
import TextControl from './controls/TextControl.vue';
import NumberControl from './controls/NumberControl.vue';
import BooleanControl from './controls/BooleanControl.vue';
import DateControl from './controls/DateControl.vue';
import ChoiceControl from './controls/ChoiceControl.vue';
import ChoicesControl from './controls/ChoicesControl.vue';
import TagsView from './controls/TagsView.vue';
import ColorView from './controls/ColorView.vue';
import type { CoarObjectEditorTypes, CoarValueContext, CoarValueType } from './types';

function decimalsOf(context: CoarValueContext): number {
  return context.schema['x-coar-decimals'] ?? (context.schema.type === 'integer' ? 0 : 2);
}

const builtinList: CoarValueType[] = [
  {
    id: 'text',
    label: 'Text',
    icon: 'type',
    hue: 255,
    schema: { type: 'string' },
    control: markRaw(TextControl),
    controlInView: true,
    format: (value: string) => value,
  },
  {
    id: 'multiline',
    label: 'Long text',
    icon: 'align-left',
    hue: 255,
    schema: { type: 'string' },
    control: markRaw(TextControl),
    controlProps: { rows: 2 },
    previewInEdit: true,
    format: (value: string) => value.split('\n')[0],
  },
  {
    id: 'number',
    label: 'Number',
    icon: 'hash',
    hue: 45,
    schema: { type: 'number' },
    settings: ['range', 'decimals', 'unit'],
    control: markRaw(NumberControl),
    format: (value: number, context) => {
      const decimals = decimalsOf(context);
      const text = new Intl.NumberFormat(context.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
      const unit = context.schema['x-coar-unit'];
      return unit ? `${text} ${unit}` : text;
    },
  },
  {
    id: 'boolean',
    label: 'Yes / no',
    icon: 'check',
    hue: 150,
    schema: { type: 'boolean' },
    control: markRaw(BooleanControl),
    isEmpty: (value) => value === undefined,
    format: (value: boolean, { t }) =>
      value ? t('coar.objectEditor.yes', undefined, 'Yes') : t('coar.objectEditor.no', undefined, 'No'),
  },
  {
    id: 'date',
    label: 'Date',
    icon: 'calendar',
    hue: 75,
    schema: { type: 'string', format: 'date' },
    control: markRaw(DateControl),
    format: (value: string, context) => {
      try {
        return Temporal.PlainDate.from(value).toLocaleString(context.locale, { dateStyle: 'medium' });
      } catch {
        return value;
      }
    },
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'at-sign',
    hue: 220,
    schema: { type: 'string', format: 'email' },
    control: markRaw(TextControl),
    controlProps: { inputType: 'email' },
    controlInView: true,
    format: (value: string) => value,
  },
  {
    id: 'color',
    label: 'Colour',
    icon: 'palette',
    hue: 330,
    schema: { type: 'string', pattern: HEX_COLOR_PATTERN },
    control: markRaw(TextControl),
    controlProps: { swatch: true },
    view: markRaw(ColorView),
  },
  {
    id: 'choice',
    label: 'Choice',
    icon: 'list',
    hue: 200,
    schema: { oneOf: [{ const: 'option-1', title: 'Option 1' }] },
    settings: ['options'],
    control: markRaw(ChoiceControl),
    view: markRaw(TagsView),
  },
  {
    id: 'choices',
    label: 'Multiple choice',
    icon: 'list-checks',
    hue: 200,
    schema: { type: 'array', uniqueItems: true, items: { anyOf: [{ const: 'option-1', title: 'Option 1' }] } },
    settings: ['options'],
    control: markRaw(ChoicesControl),
    view: markRaw(TagsView),
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: 'tag',
    hue: 270,
    schema: { type: 'array', uniqueItems: true, items: { type: 'string' } },
    settings: ['suggestions'],
    control: markRaw(ChoicesControl),
    controlProps: { allowCreate: true },
    view: markRaw(TagsView),
  },
  {
    id: 'object',
    label: 'Group',
    icon: 'folder',
    hue: 270,
    schema: { type: 'object', properties: {}, 'x-coar-order': [] },
    isEmpty: (value) => value === undefined || (isJsonObject(value) && Object.keys(value).length === 0),
  },
  {
    id: 'list',
    label: 'List of groups',
    icon: 'list',
    hue: 270,
    schema: { type: 'array', items: { type: 'object' } },
    readonlyOnly: true,
    format: (value: JsonValue[], { t }) =>
      value.length === 1
        ? t('coar.objectEditor.entry', undefined, '1 entry')
        : t('coar.objectEditor.entries', { count: value.length }, '{count} entries').replace('{count}', String(value.length)),
  },
  {
    id: 'json',
    label: 'Value',
    icon: 'braces',
    hue: 0,
    schema: {},
    readonlyOnly: true,
    format: (value: JsonValue) => JSON.stringify(value),
  },
];
const builtins: CoarValueType[] = builtinList.map((type) => ({ ...type, builtin: true }));

/** The built-in types: text, multiline, number, boolean, date, email, color, choice, choices, tags, object. */
export const COAR_BUILTIN_VALUE_TYPES: readonly CoarValueType[] = builtins;

/**
 * The register of an editor: the built-in types plus the types of the app.
 * An app type with the id of a built-in type replaces it.
 */
export function defineObjectEditorTypes(types: readonly CoarValueType[] = []): CoarObjectEditorTypes {
  const register = new Map<string, CoarValueType>(builtins.map((type) => [type.id, type]));
  for (const type of types) register.set(type.id, { ...type, builtin: false });
  return register;
}
