<script setup lang="ts">
import { computed } from 'vue';
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: CheckboxNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

// Checkboxes have no meaningful blur moment — choosing a value IS the
// interaction, so it marks the field touched (otherwise their errors could
// never surface between submits).
function setFieldValue(v: unknown) {
  if (!name.value) return;
  ctx.setValue(name.value, v);
  ctx.markTouched(name.value);
}
</script>

<template>
  <!-- FormField wrapper so its validation error can surface -->
  <CoarFormField
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled"
  >
    <CoarCheckbox
      :model-value="name ? (ctx.getValue(name) as boolean ?? false) : false"
      :label="node.props.label"
      :required="node.validation?.required"
      :disabled="node.props.disabled"
      @update:model-value="setFieldValue"
    />
  </CoarFormField>
</template>
