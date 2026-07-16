<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarRadioButton, CoarRadioGroup } from '@cocoar/vue-ui';
import type { RadioGroupNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: RadioGroupNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

// Radio groups have no meaningful blur moment — choosing a value IS the
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
    <CoarRadioGroup
      :model-value="name ? (ctx.getValue(name) as string ?? undefined) : undefined"
      :name="name ?? node.id"
      :label="node.props.label"
      :orientation="node.props.orientation"
      :required="node.validation?.required"
      :disabled="node.props.disabled"
      @update:model-value="setFieldValue"
    >
      <CoarRadioButton
        v-for="o in node.props.options ?? []"
        :key="o.value"
        :value="o.value"
        :disabled="node.props.disabled"
      >
        {{ o.label }}
      </CoarRadioButton>
    </CoarRadioGroup>
  </CoarFormField>
</template>
