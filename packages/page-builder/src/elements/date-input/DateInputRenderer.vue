<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarPlainDatePicker } from '@cocoar/vue-ui';
import type { DateInputNode } from '../../schema';
import { isoToPlainDate } from '../../renderSafety';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: DateInputNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

// Picking a date IS the interaction — it marks the field touched (otherwise
// its error could never surface between submits).
function setValue(v: string) {
  if (!name.value) return;
  ctx.setValue(name.value, v);
  ctx.markTouched(name.value);
}
</script>

<template>
  <!-- ISO string in the value model, Temporal at the picker -->
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled"
  >
    <CoarPlainDatePicker
      :model-value="name ? isoToPlainDate(ctx.getValue(name)) : null"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      clearable
      @update:model-value="(d) => setValue(d ? d.toString() : '')"
    />
  </CoarFormField>
</template>
