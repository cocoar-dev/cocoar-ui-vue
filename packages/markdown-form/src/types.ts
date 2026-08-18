import type { Component } from 'vue';
import type { CoarMarkdownEditorToolEntry } from '@cocoar/vue-markdown-editor';

export type MarkdownFormMode = 'fill' | 'readonly';
export type MarkdownFormControlDesign = 'basic' | 'coar';
export type MarkdownFormFieldSource = 'inline' | 'block';
export type MarkdownFormFieldLayout = 'inline' | 'row' | 'stacked' | 'block';
export type MarkdownFormNamedWidth = 'small' | 'medium' | 'large';
export type MarkdownFormFieldWidth =
  | MarkdownFormNamedWidth
  | 'fill'
  | 'full'
  | `${number}ch`
  | `${number}rem`;
export type MarkdownFormFieldWidths = Readonly<
  Record<MarkdownFormNamedWidth, `${number}ch` | `${number}rem`>
>;
export type MarkdownFormValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'date'
  | 'datetime'
  | (string & {});
export type MarkdownFormValues = Record<string, unknown>;

export interface MarkdownFormReadonlyDecorations {
  markdownFrame: boolean;
  inlineUnderline: boolean;
}

export interface MarkdownFormField {
  readonly occurrenceId: string;
  readonly id: string;
  readonly type: string;
  readonly source: MarkdownFormFieldSource;
  readonly layout: MarkdownFormFieldLayout;
  readonly width: string;
  readonly required: boolean;
  readonly props: Readonly<Record<string, string>>;
}

export interface MarkdownFormMessages {
  required(field: MarkdownFormField): string;
  missingId(field: MarkdownFormField): string;
  duplicateId(field: MarkdownFormField): string;
  unknownType(field: MarkdownFormField): string;
  unsupportedLayout(field: MarkdownFormField): string;
  booleanTrue: string;
  booleanFalse: string;
  empty: string;
}

export interface MarkdownFormContext {
  readonly design: MarkdownFormControlDesign;
  readonly locale: string;
  readonly widths: MarkdownFormFieldWidths;
  readonly decorations: Readonly<MarkdownFormReadonlyDecorations>;
  readonly messages: Readonly<MarkdownFormMessages>;
  readonly markdownTools: readonly CoarMarkdownEditorToolEntry[];
}

export interface MarkdownFormContextInput {
  design?: MarkdownFormControlDesign;
  locale?: string;
  widths?: Partial<MarkdownFormFieldWidths>;
  decorations?: Partial<MarkdownFormReadonlyDecorations>;
  messages?: Partial<MarkdownFormMessages>;
  markdownTools?: readonly CoarMarkdownEditorToolEntry[];
}

export interface MarkdownFormFieldControlProps<TValue = unknown> {
  field: MarkdownFormField;
  modelValue: TValue;
  context: Readonly<MarkdownFormContext>;
  error?: string;
}

export interface MarkdownFormFieldReadonlyProps<TValue = unknown> {
  field: MarkdownFormField;
  modelValue: TValue;
  context: Readonly<MarkdownFormContext>;
}

export interface MarkdownFormFieldDefinition<TValue = unknown> {
  control: Component;
  readonly?: Component;
  valueType: MarkdownFormValueType;
  layouts?: readonly MarkdownFormFieldLayout[];
  defaultValue?: (field: MarkdownFormField) => TValue;
  isEmpty?: (value: TValue, field: MarkdownFormField) => boolean;
  validate?: (
    value: TValue,
    field: MarkdownFormField,
    values: Readonly<MarkdownFormValues>,
    context: Readonly<MarkdownFormContext>,
  ) => string | null;
  formatReadonly?: (
    value: TValue,
    field: MarkdownFormField,
    context: Readonly<MarkdownFormContext>,
  ) => string;
}

export type MarkdownFormFieldRegistry = Record<string, MarkdownFormFieldDefinition>;

export type MarkdownFormTemplateIssueCode =
  | 'missing-id'
  | 'duplicate-id'
  | 'unknown-type'
  | 'unsupported-layout';

export interface MarkdownFormTemplateIssue {
  readonly code: MarkdownFormTemplateIssueCode;
  readonly message: string;
  readonly field: MarkdownFormField;
}

export interface MarkdownFormValidationResult {
  readonly valid: boolean;
  readonly errors: Readonly<Record<string, string>>;
  readonly issues: readonly MarkdownFormTemplateIssue[];
}

export interface MarkdownFormExpose {
  validate(): MarkdownFormValidationResult;
}
