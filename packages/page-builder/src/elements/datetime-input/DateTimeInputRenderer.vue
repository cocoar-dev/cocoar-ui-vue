<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import type { DateTimeInputNode } from '../../schema';
import { isoToPlainDateTime } from '../../renderSafety';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: DateTimeInputNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

// Picking a date-time IS the interaction — it marks the field touched
// (otherwise its error could never surface between submits).
function setValue(v: string) {
  if (!name.value) return;
  ctx.setValue(name.value, v);
  ctx.markTouched(name.value);
}
</script>

<template>
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled"
  >
    <CoarPlainDateTimePicker
      :model-value="name ? isoToPlainDateTime(ctx.getValue(name)) : null"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      clearable
      @update:model-value="(d) => setValue(d ? d.toString() : '')"
    />
  </CoarFormField>
</template>
