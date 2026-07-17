<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarSwitch } from '@cocoar/vue-ui';
import type { SwitchNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: SwitchNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

// Boolean like checkbox; touch-on-change — flipping the switch IS the
// interaction, so it marks the field touched.
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
    <CoarSwitch
      :model-value="name ? (ctx.getValue(name) as boolean ?? false) : false"
      :label="node.props.label"
      :disabled="node.props.disabled"
      @update:model-value="setFieldValue"
    />
  </CoarFormField>
</template>
