import { markRaw } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import TextFieldControl from './fields/TextFieldControl.vue';
import NumberFieldControl from './fields/NumberFieldControl.vue';
import DateFieldControl from './fields/DateFieldControl.vue';
import DateTimeFieldControl from './fields/DateTimeFieldControl.vue';
import BooleanFieldControl from './fields/BooleanFieldControl.vue';
import SelectFieldControl from './fields/SelectFieldControl.vue';
import MarkdownFieldControl from './fields/MarkdownFieldControl.vue';
import MarkdownFieldReadonly from './fields/MarkdownFieldReadonly.vue';
import { parseFiniteNumber, parseMarkdownFormSelectOptions } from './field-layout';
import type { MarkdownFormContext, MarkdownFormField, MarkdownFormFieldRegistry } from './types';

const INLINE_LAYOUTS = ['inline', 'row', 'stacked', 'block'] as const;

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === false ||
    (Array.isArray(value) && value.length === 0)
  );
}

function formatNumber(
  value: unknown,
  field: MarkdownFormField,
  context: MarkdownFormContext,
): string {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return String(value ?? context.messages.empty);
  const decimals = Math.max(0, Math.trunc(parseFiniteNumber(field.props['decimals']) ?? 0));
  const formatted = new Intl.NumberFormat(context.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(parsed);
  return field.props['suffix'] ? `${formatted} ${field.props['suffix']}` : formatted;
}

function formatDate(value: unknown, context: MarkdownFormContext): string {
  if (typeof value !== 'string' || !value) return context.messages.empty;
  try {
    return Temporal.PlainDate.from(value).toLocaleString(context.locale, { dateStyle: 'medium' });
  } catch {
    return value;
  }
}

function formatDateTime(value: unknown, context: MarkdownFormContext): string {
  if (typeof value !== 'string' || !value) return context.messages.empty;
  try {
    return Temporal.PlainDateTime.from(value).toLocaleString(context.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export const BUILTIN_MARKDOWN_FORM_FIELDS: Readonly<MarkdownFormFieldRegistry> = {
  text: {
    control: markRaw(TextFieldControl),
    valueType: 'string',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => '',
    isEmpty,
    validate: (value, field) => {
      const text = typeof value === 'string' ? value : '';
      const minLength = parseFiniteNumber(field.props['minLength']);
      const maxLength = parseFiniteNumber(field.props['maxLength']);
      if (minLength !== undefined && text.length < minLength) {
        return field.props['minLengthMessage'] || `Enter at least ${minLength} characters.`;
      }
      if (maxLength !== undefined && text.length > maxLength) {
        return field.props['maxLengthMessage'] || `Enter no more than ${maxLength} characters.`;
      }
      return null;
    },
    formatReadonly: (value, _field, context) =>
      typeof value === 'string' && value ? value : context.messages.empty,
  },
  number: {
    control: markRaw(NumberFieldControl),
    valueType: 'number',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => null,
    isEmpty,
    validate: (value, field) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(parsed)) return field.props['numberMessage'] || 'Enter a valid number.';
      const min = parseFiniteNumber(field.props['min']);
      const max = parseFiniteNumber(field.props['max']);
      if (min !== undefined && parsed < min) return field.props['minMessage'] || `Minimum: ${min}.`;
      if (max !== undefined && parsed > max) return field.props['maxMessage'] || `Maximum: ${max}.`;
      return null;
    },
    formatReadonly: formatNumber,
  },
  date: {
    control: markRaw(DateFieldControl),
    valueType: 'date',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => '',
    isEmpty,
    formatReadonly: (value, _field, context) => formatDate(value, context),
  },
  datetime: {
    control: markRaw(DateTimeFieldControl),
    valueType: 'datetime',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => '',
    isEmpty,
    formatReadonly: (value, _field, context) => formatDateTime(value, context),
  },
  boolean: {
    control: markRaw(BooleanFieldControl),
    valueType: 'boolean',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => false,
    isEmpty,
    formatReadonly: (value, field, context) =>
      value === true
        ? field.props['trueLabel'] || context.messages.booleanTrue
        : field.props['falseLabel'] || context.messages.booleanFalse,
  },
  select: {
    control: markRaw(SelectFieldControl),
    valueType: 'string',
    layouts: INLINE_LAYOUTS,
    defaultValue: () => null,
    isEmpty,
    validate: (value, field) => {
      if (value === null || value === undefined || value === '') return null;
      const options = parseMarkdownFormSelectOptions(field.props['options']);
      return options.some((option) => option.value === value)
        ? null
        : field.props['optionMessage'] || 'Select one of the available options.';
    },
    formatReadonly: (value, field, context) => {
      if (typeof value !== 'string' || !value) return context.messages.empty;
      return (
        parseMarkdownFormSelectOptions(field.props['options']).find(
          (option) => option.value === value,
        )?.label ?? value
      );
    },
  },
  markdown: {
    control: markRaw(MarkdownFieldControl),
    readonly: markRaw(MarkdownFieldReadonly),
    valueType: 'string',
    layouts: ['block'],
    defaultValue: () => '',
    isEmpty,
  },
};

export function mergeMarkdownFormFields(
  custom: MarkdownFormFieldRegistry | undefined,
): MarkdownFormFieldRegistry {
  return {
    ...BUILTIN_MARKDOWN_FORM_FIELDS,
    ...custom,
  };
}
