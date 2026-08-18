import { inject, type ComputedRef, type InjectionKey } from 'vue';
import type {
  MarkdownFormContext,
  MarkdownFormContextInput,
  MarkdownFormField,
  MarkdownFormFieldRegistry,
  MarkdownFormMode,
  MarkdownFormValidationResult,
} from './types';

const DEFAULT_MARKDOWN_TOOLS = [
  'bold',
  'italic',
  'strikethrough',
  'inlineCode',
  'headings',
  'divider',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'divider',
  'table',
  'image',
  'clearFormatting',
  'divider',
  'undo',
  'redo',
] as const;

export const DEFAULT_MARKDOWN_FORM_CONTEXT: Readonly<MarkdownFormContext> = {
  design: 'coar',
  locale: 'en',
  widths: {
    small: '10ch',
    medium: '18ch',
    large: '32ch',
  },
  decorations: {
    markdownFrame: true,
    inlineUnderline: true,
  },
  messages: {
    required: (field) => `${field.props['label'] || field.id} is required.`,
    missingId: () => 'A form field is missing its id.',
    duplicateId: (field) => `Field id "${field.id}" is used more than once.`,
    unknownType: (field) => `Unknown field type "${field.type}".`,
    unsupportedLayout: (field) =>
      `Field type "${field.type}" does not support layout "${field.layout}".`,
    booleanTrue: 'Yes',
    booleanFalse: 'No',
    empty: '—',
  },
  markdownTools: DEFAULT_MARKDOWN_TOOLS,
};

export function resolveMarkdownFormContext(
  input: MarkdownFormContextInput | undefined,
): Readonly<MarkdownFormContext> {
  return {
    ...DEFAULT_MARKDOWN_FORM_CONTEXT,
    ...input,
    widths: {
      ...DEFAULT_MARKDOWN_FORM_CONTEXT.widths,
      ...input?.widths,
    },
    decorations: {
      ...DEFAULT_MARKDOWN_FORM_CONTEXT.decorations,
      ...input?.decorations,
    },
    messages: {
      ...DEFAULT_MARKDOWN_FORM_CONTEXT.messages,
      ...input?.messages,
    },
    markdownTools: input?.markdownTools ?? DEFAULT_MARKDOWN_FORM_CONTEXT.markdownTools,
  };
}

export interface MarkdownFormRuntime {
  mode: ComputedRef<MarkdownFormMode>;
  context: ComputedRef<Readonly<MarkdownFormContext>>;
  registry: ComputedRef<Readonly<MarkdownFormFieldRegistry>>;
  validation: ComputedRef<MarkdownFormValidationResult>;
  showErrors: ComputedRef<boolean>;
  getValue(id: string): unknown;
  updateValue(field: MarkdownFormField, value: unknown): void;
}

export const MARKDOWN_FORM_RUNTIME_KEY: InjectionKey<MarkdownFormRuntime> = Symbol(
  'coar:markdown-form-runtime',
);

export function useMarkdownFormRuntime(): MarkdownFormRuntime {
  const runtime = inject(MARKDOWN_FORM_RUNTIME_KEY);
  if (!runtime) throw new Error('Markdown form fields require a CoarMarkdownForm parent.');
  return runtime;
}
