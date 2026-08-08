<script setup lang="ts">
import { computed } from 'vue'
import { CoarFormField, CoarSelect, CoarTextInput, type CoarSelectOption } from '@cocoar/vue-ui'
import type { FeedbackNode } from '../../schema'
const props = defineProps<{ node: FeedbackNode; patch: (update: Partial<FeedbackNode>) => void }>()
const options = computed<CoarSelectOption<string>[]>(() => [
  { value: 'form-error', label: 'Form / action error' },
  { value: 'error', label: 'Host error' },
  { value: 'success', label: 'Success' },
  { value: 'info', label: 'Information' },
  { value: 'loading', label: 'Loading / submitting' },
])
</script>
<template>
  <CoarFormField label="Feedback source">
    <CoarSelect size="s" :model-value="node.props.kind ?? 'form-error'" :options="options" @update:model-value="(v) => props.patch({ props: { kind: v as FeedbackNode['props']['kind'] } })" />
  </CoarFormField>
  <CoarFormField v-if="node.props.kind !== 'form-error'" label="Fallback text">
    <CoarTextInput size="s" :model-value="node.props.text ?? ''" @update:model-value="(v) => props.patch({ props: { text: v } })" />
  </CoarFormField>
</template>
