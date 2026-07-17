<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
import type { RadioGroupNode } from '../../schema';

const props = defineProps<{
  node: RadioGroupNode;
  resolveAsset?: (id: string) => string;
}>();

// The template can't carry the `as string | undefined` cast — vue-eslint
// parses the union's `|` as a deprecated filter.
const previewValue = computed(() =>
  typeof props.node.defaultValue === 'string' ? props.node.defaultValue : undefined,
);
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <CoarRadioGroup
      :model-value="previewValue"
      :name="`preview-${node.id}`"
      :orientation="node.props.orientation"
      disabled
    >
      <CoarRadioButton
        v-for="o in node.props.options ?? []"
        :key="o.value"
        :value="o.value"
        disabled
      >
        {{ o.label }}
      </CoarRadioButton>
    </CoarRadioGroup>
  </CoarFormField>
</template>
