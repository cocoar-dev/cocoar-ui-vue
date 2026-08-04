<script setup lang="ts">
import { computed } from 'vue';
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: CheckboxNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);
const runtimeProps = computed(() => props.node.props as Record<string, unknown>);
const repeatValue = computed(() => runtimeProps.value._repeatValue);
const repeatRequired = computed(() => runtimeProps.value._repeatRequired === true);
const isRepeatSelection = computed(() => repeatValue.value !== undefined && !!name.value);
const modelValue = computed(() => {
  if (!name.value) return false;
  if (!isRepeatSelection.value) return (ctx.getValue(name.value) as boolean | undefined) ?? false;
  const current = ctx.getValue(name.value);
  return Array.isArray(current) && current.some((value) => Object.is(value, repeatValue.value));
});

// Checkboxes have no meaningful blur moment — choosing a value IS the
// interaction, so it marks the field touched (otherwise their errors could
// never surface between submits).
function setFieldValue(v: unknown) {
  if (!name.value) return;
  if (isRepeatSelection.value) {
    if (repeatRequired.value) return;
    const current = ctx.getValue(name.value);
    const next = new Set(Array.isArray(current) ? current : []);
    if (v) next.add(repeatValue.value);
    else next.delete(repeatValue.value);
    ctx.setValue(name.value, [...next]);
  } else {
    ctx.setValue(name.value, v);
  }
  ctx.markTouched(name.value);
}
</script>

<template>
  <!-- FormField wrapper so its validation error can surface -->
  <CoarFormField
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled || repeatRequired"
  >
    <CoarCheckbox
      :model-value="modelValue"
      :label="node.props.label"
      :required="node.validation?.required"
      :disabled="node.props.disabled || repeatRequired"
      @update:model-value="setFieldValue"
    />
  </CoarFormField>
</template>
