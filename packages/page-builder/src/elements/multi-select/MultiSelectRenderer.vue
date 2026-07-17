<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarMultiSelect } from '@cocoar/vue-ui';
import type { MultiSelectNode } from '../../schema';
import { usePageElement } from '../usePageElement';
import { useResolvedOptions } from '../useResolvedOptions';
import { toSelectOptions } from '../optionUtils';

const props = defineProps<{ node: MultiSelectNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);
const options = useResolvedOptions(() => props.node.props);

// Selects have no meaningful blur moment — choosing a value IS the
// interaction, so it marks the field touched (otherwise their errors could
// never surface between submits).
function setFieldValue(v: unknown) {
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
    <CoarMultiSelect
      :model-value="name ? (ctx.getValue(name) as string[] ?? []) : []"
      :options="toSelectOptions(options)"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      @update:model-value="setFieldValue"
    />
  </CoarFormField>
</template>
