<script setup lang="ts">
import { computed, defineComponent, h, markRaw, provide, useAttrs, watch } from 'vue';
import {
  CoarMarkdown,
  defaultMarkdownRenderers,
  type EmbedRegistry,
  type MarkdownViewerRenderers,
} from '@cocoar/vue-markdown';
import { parse, toEmbedProps } from '@cocoar/vue-markdown-core';
import BlockFieldEmbed from './BlockFieldEmbed.vue';
import InlineTextRenderer from './InlineTextRenderer';
import ParagraphRenderer from './ParagraphRenderer';
import { MARKDOWN_FORM_RUNTIME_KEY, resolveMarkdownFormContext } from './context';
import { mergeMarkdownFormFields } from './registry';
import { analyzeMarkdownFormTemplate } from './template-parser';
import type {
  MarkdownFormContextInput,
  MarkdownFormExpose,
  MarkdownFormField,
  MarkdownFormFieldRegistry,
  MarkdownFormMode,
  MarkdownFormValidationResult,
  MarkdownFormValues,
} from './types';

const props = withDefaults(
  defineProps<{
    template: string;
    values: MarkdownFormValues;
    mode?: MarkdownFormMode;
    fields?: MarkdownFormFieldRegistry;
    context?: MarkdownFormContextInput;
    embeds?: EmbedRegistry;
    showErrors?: boolean;
  }>(),
  {
    mode: 'fill',
    fields: () => ({}),
    context: () => ({}),
    embeds: () => ({}),
    showErrors: false,
  },
);

const emit = defineEmits<{
  'update:values': [value: MarkdownFormValues];
  validation: [result: MarkdownFormValidationResult];
}>();

function createBlockViewer(defaultType: string) {
  return markRaw(
    defineComponent({
      name: `CoarMarkdownForm${defaultType}Block`,
      inheritAttrs: false,
      setup() {
        const attrs = useAttrs();
        return () =>
          h(BlockFieldEmbed, {
            fieldProps: toEmbedProps(attrs),
            defaultType,
          });
      },
    }),
  );
}

const context = computed(() => resolveMarkdownFormContext(props.context));
const registry = computed(() => mergeMarkdownFormFields(props.fields));
const doc = computed(() => parse(props.template));
const analysis = computed(() =>
  analyzeMarkdownFormTemplate(doc.value, registry.value, context.value.messages),
);
const errors = computed<Readonly<Record<string, string>>>(() => {
  const result: Record<string, string> = {};
  for (const field of analysis.value.fields) {
    if (!field.id || result[field.id]) continue;
    const definition = registry.value[field.type];
    if (!definition) continue;
    const stored = props.values[field.id];
    const value = stored === undefined ? definition.defaultValue?.(field) : stored;
    const isEmpty =
      definition.isEmpty?.(value, field) ??
      (value === undefined || value === null || value === '' || value === false);
    if (field.required && isEmpty) {
      result[field.id] = field.props['requiredMessage'] || context.value.messages.required(field);
      continue;
    }
    const error = definition.validate?.(value, field, props.values, context.value);
    if (error) result[field.id] = error;
  }
  return result;
});
const validation = computed<MarkdownFormValidationResult>(() => ({
  valid: analysis.value.issues.length === 0 && Object.keys(errors.value).length === 0,
  errors: errors.value,
  issues: analysis.value.issues,
}));
const mode = computed(() => props.mode);
const showErrors = computed(() => props.showErrors);
const renderers: MarkdownViewerRenderers = {
  ...defaultMarkdownRenderers,
  paragraph: ParagraphRenderer,
  text: InlineTextRenderer,
};
const fieldBlockViewer = createBlockViewer('text');
const markdownBlockViewer = createBlockViewer('markdown');
const embeds = computed<EmbedRegistry>(() => ({
  ...props.embeds,
  field: { viewer: fieldBlockViewer },
  'markdown-field': { viewer: markdownBlockViewer },
}));

provide(MARKDOWN_FORM_RUNTIME_KEY, {
  mode,
  context,
  registry,
  validation,
  showErrors,
  getValue: (id) => props.values[id],
  updateValue: (field: MarkdownFormField, value: unknown) => {
    if (props.mode !== 'fill' || !field.id) return;
    emit('update:values', { ...props.values, [field.id]: value });
  },
});

watch(validation, (result) => emit('validation', result), { immediate: true, deep: true });

defineExpose<MarkdownFormExpose>({
  validate: () => validation.value,
});
</script>

<template>
  <div class="coar-markdown-form" :class="`coar-markdown-form--${mode}`">
    <div v-if="analysis.issues.length" class="coar-markdown-form__issues" role="alert">
      <strong>Invalid Markdown form template</strong>
      <ul>
        <li v-for="issue in analysis.issues" :key="`${issue.field.occurrenceId}:${issue.code}`">
          {{ issue.message }}
        </li>
      </ul>
    </div>
    <CoarMarkdown :doc="doc" :renderers="renderers" :embeds="embeds" />
  </div>
</template>
