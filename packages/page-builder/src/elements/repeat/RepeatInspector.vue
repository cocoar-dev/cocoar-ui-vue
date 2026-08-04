<script setup lang="ts">
import { computed } from 'vue'
import { CoarCheckbox, CoarFormField, CoarTextInput } from '@cocoar/vue-ui'
import type { RepeatNode, RepeatSelection } from '../../schema'
const props = defineProps<{ node: RepeatNode; patch: (update: Partial<RepeatNode>) => void }>()
const selection = computed(() => props.node.props.selection)
function patchProps(update: Partial<RepeatNode['props']>) { props.patch({ props: update } as Partial<RepeatNode>) }
function patchSelection(update: Partial<RepeatSelection>) {
  patchProps({ selection: { name: '', valuePath: '', ...(selection.value ?? {}), ...update } })
}
</script>
<template>
  <CoarFormField label="Context array path"><CoarTextInput size="s" :model-value="node.props.source" @update:model-value="(v) => patchProps({ source: v })" /></CoarFormField>
  <CoarFormField label="Stable key item path"><CoarTextInput size="s" :model-value="node.props.keyPath" @update:model-value="(v) => patchProps({ keyPath: v })" /></CoarFormField>
  <CoarFormField label="Empty text"><CoarTextInput size="s" :model-value="node.props.emptyText ?? ''" @update:model-value="(v) => patchProps({ emptyText: v || undefined })" /></CoarFormField>
  <CoarFormField label="Selection output field"><CoarTextInput size="s" :model-value="selection?.name ?? ''" @update:model-value="(v) => patchSelection({ name: v })" /></CoarFormField>
  <CoarFormField label="Selection value item path"><CoarTextInput size="s" :model-value="selection?.valuePath ?? ''" @update:model-value="(v) => patchSelection({ valuePath: v })" /></CoarFormField>
  <CoarFormField label="Required item path"><CoarTextInput size="s" :model-value="selection?.requiredPath ?? ''" @update:model-value="(v) => patchSelection({ requiredPath: v || undefined })" /></CoarFormField>
  <CoarCheckbox size="s" :model-value="selection?.defaultSelected ?? false" label="Select new items by default" @update:model-value="(v) => patchSelection({ defaultSelected: v })" />
</template>
