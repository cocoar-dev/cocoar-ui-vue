<script setup lang="ts">
import { computed } from 'vue';
import { resolveMarkdownFormFieldWidth } from './field-layout';
import { useMarkdownFormRuntime } from './context';
import type { MarkdownFormField } from './types';

const props = defineProps<{ field: MarkdownFormField }>();
const runtime = useMarkdownFormRuntime();
const definition = computed(() => runtime.registry.value[props.field.type]);
const value = computed(() => {
  const stored = runtime.getValue(props.field.id);
  return stored === undefined ? definition.value?.defaultValue?.(props.field) : stored;
});
const error = computed(() => runtime.validation.value.errors[props.field.id]);
const width = computed(() =>
  resolveMarkdownFormFieldWidth(props.field.width, runtime.context.value.widths),
);
const widthMode = computed(() =>
  props.field.width === 'fill' || props.field.width === 'full' ? props.field.width : 'fixed',
);
const wrapperTag = computed(() => (props.field.source === 'block' ? 'section' : 'span'));
const formatted = computed(() => {
  if (!definition.value) return runtime.context.value.messages.empty;
  return (
    definition.value.formatReadonly?.(value.value, props.field, runtime.context.value) ??
    String(value.value ?? runtime.context.value.messages.empty)
  );
});
const invalidMessage = computed(() => {
  if (!props.field.id) return runtime.context.value.messages.missingId(props.field);
  if (!definition.value) return runtime.context.value.messages.unknownType(props.field);
  return '';
});
const isFrameless = computed(
  () =>
    props.field.source === 'block' &&
    runtime.mode.value === 'readonly' &&
    !runtime.context.value.decorations.markdownFrame,
);

function update(value: unknown): void {
  runtime.updateValue(props.field, value);
}
</script>

<template>
  <component
    :is="wrapperTag"
    class="coar-markdown-form-field"
    :class="[
      `coar-markdown-form-field--${field.source}`,
      `coar-markdown-form-field--layout-${field.layout}`,
      `coar-markdown-form-field--width-${widthMode}`,
      {
        'coar-markdown-form-field--readonly': runtime.mode.value === 'readonly',
        'coar-markdown-form-field--underlined':
          runtime.mode.value === 'readonly' &&
          field.source === 'inline' &&
          runtime.context.value.decorations.inlineUnderline,
        'coar-markdown-form-field--frameless': isFrameless,
        'coar-markdown-form-field--error': runtime.showErrors.value && Boolean(error),
        'coar-markdown-form-field--invalid': Boolean(invalidMessage),
      },
    ]"
    :style="field.source === 'inline' ? { width, maxWidth: '100%' } : undefined"
    :data-field-id="field.id || undefined"
    :data-field-type="field.type"
    :aria-label="field.props['label'] || field.id || field.type"
    :aria-invalid="runtime.showErrors.value && error ? 'true' : undefined"
    :title="invalidMessage || (runtime.showErrors.value ? error : undefined)"
  >
    <span v-if="invalidMessage" class="coar-markdown-form-field__invalid">
      {{ invalidMessage }}
    </span>
    <component
      :is="definition.control"
      v-else-if="runtime.mode.value === 'fill' && definition"
      :field="field"
      :model-value="value"
      :context="runtime.context.value"
      :error="runtime.showErrors.value ? error : undefined"
      @update:model-value="update"
    />
    <component
      :is="definition.readonly"
      v-else-if="definition?.readonly"
      :field="field"
      :model-value="value"
      :context="runtime.context.value"
    />
    <span v-else class="coar-markdown-form-field__readonly">{{ formatted }}</span>
    <small
      v-if="runtime.showErrors.value && error"
      class="coar-markdown-form-field__error"
      :class="{ 'coar-markdown-form-field__error--inline': field.layout === 'inline' }"
    >
      {{ error }}
    </small>
  </component>
</template>
