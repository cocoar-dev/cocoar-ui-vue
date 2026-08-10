<script setup lang="ts">
import { computed } from 'vue'
import { CoarFormField, CoarSelect, CoarTextInput } from '@cocoar/vue-ui'
import type { RepeatNode, RepeatSelection } from '../../schema'
const props = defineProps<{ node: RepeatNode; patch: (update: Partial<RepeatNode>) => void }>()
const selection = computed(() => props.node.props.selection)
function patchProps(update: Partial<RepeatNode['props']>) { props.patch({ props: update } as Partial<RepeatNode>) }
function patchSelection(update: Partial<RepeatSelection>) {
  patchProps({ selection: { name: '', valuePath: '', ...(selection.value ?? {}), ...update } })
}
</script>
<template>
  <CoarFormField label="Context array path"><CoarTextInput size="s" :model-value="node.props.contextPath" @update:model-value="(v) => patchProps({ contextPath: v })" /></CoarFormField>
  <CoarFormField label="Stable key item path"><CoarTextInput size="s" :model-value="node.props.keyPath" @update:model-value="(v) => patchProps({ keyPath: v })" /></CoarFormField>
  <CoarFormField label="Empty text"><CoarTextInput size="s" :model-value="node.props.emptyText ?? ''" @update:model-value="(v) => patchProps({ emptyText: v || undefined })" /></CoarFormField>
  <CoarFormField label="Selection output field"><CoarTextInput size="s" :model-value="selection?.name ?? ''" @update:model-value="(v) => patchSelection({ name: v })" /></CoarFormField>
  <CoarFormField label="Selection value item path"><CoarTextInput size="s" :model-value="selection?.valuePath ?? ''" @update:model-value="(v) => patchSelection({ valuePath: v })" /></CoarFormField>
  <CoarFormField label="Required item path"><CoarTextInput size="s" :model-value="selection?.requiredPath ?? ''" @update:model-value="(v) => patchSelection({ requiredPath: v || undefined })" /></CoarFormField>
  <CoarFormField label="Default selection">
    <CoarSelect
      size="s"
      :model-value="selection?.defaultSelection ?? (selection?.defaultSelected ? 'all' : 'none')"
      :options="[
        { value: 'none', label: 'None' },
        { value: 'all', label: 'All items' },
      ]"
      @update:model-value="(v) => patchSelection({ defaultSelection: v as RepeatSelection['defaultSelection'], defaultSelected: undefined })"
    />
  </CoarFormField>
</template>
