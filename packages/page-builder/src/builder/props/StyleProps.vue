<script setup lang="ts">
import { computed } from 'vue';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import { isContainerNode, type PageNode, type NodeStyle } from '../../schema';

const props = defineProps<{
  node: PageNode;
  patchStyle: (update: Partial<NodeStyle>) => void;
}>();

const isContainer = computed(() => isContainerNode(props.node));
const style = computed<NodeStyle>(() => props.node.style ?? {});

// A width set without an explicit `size` is treated as a fixed width, so legacy
// schemas surface as 'Fixed width' with their value still visible/editable.
const sizeValue = computed<string>(() => style.value.size ?? (style.value.width ? 'fixed' : ''));
const showWidth = computed(() => sizeValue.value === 'fixed');

const JUSTIFY_OPTIONS: CoarSelectOption<string>[] = [
  { value: '', label: '— inherit' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
];

const ALIGN_OPTIONS: CoarSelectOption<string>[] = [
  { value: '', label: '— inherit' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
];

const SIZE_OPTIONS: CoarSelectOption<string>[] = [
  { value: '', label: 'Auto' },
  { value: 'fill', label: 'Fill' },
  { value: 'fixed', label: 'Fixed width' },
];

function setSize(v: string) {
  if (v === 'fill') props.patchStyle({ size: 'fill', width: undefined });
  else if (v === 'fixed') props.patchStyle({ size: 'fixed' });
  else props.patchStyle({ size: undefined, width: undefined });
}
</script>

<template>
  <!-- ── Container: how children are arranged ──────────────────────────────── -->
  <CoarFormField v-if="isContainer" label="Gap">
    <CoarTextInput
      :model-value="style.gap ?? ''"
      placeholder="e.g. 8px"
      @update:model-value="(v) => props.patchStyle({ gap: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField v-if="isContainer" label="Justify (main axis)">
    <CoarSelect
      :model-value="style.justify ?? ''"
      :options="JUSTIFY_OPTIONS"
      @update:model-value="(v) => props.patchStyle({ justify: (v || undefined) as NodeStyle['justify'] })"
    />
  </CoarFormField>

  <CoarFormField v-if="isContainer" label="Align items (cross axis)">
    <CoarSelect
      :model-value="style.align ?? ''"
      :options="ALIGN_OPTIONS"
      @update:model-value="(v) => props.patchStyle({ align: (v || undefined) as NodeStyle['align'] })"
    />
  </CoarFormField>

  <!-- ── Self: how this node sits in its parent ────────────────────────────── -->
  <CoarFormField label="Align self">
    <CoarSelect
      :model-value="style.alignSelf ?? ''"
      :options="ALIGN_OPTIONS"
      @update:model-value="(v) => props.patchStyle({ alignSelf: (v || undefined) as NodeStyle['alignSelf'] })"
    />
  </CoarFormField>

  <CoarFormField label="Size">
    <CoarSelect
      :model-value="sizeValue"
      :options="SIZE_OPTIONS"
      @update:model-value="(v) => setSize(v as string)"
    />
  </CoarFormField>

  <CoarFormField v-if="showWidth" label="Width">
    <CoarTextInput
      :model-value="style.width ?? ''"
      placeholder="e.g. 380px, 50%"
      @update:model-value="(v) => props.patchStyle({ width: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField label="Min height">
    <CoarTextInput
      :model-value="style.minHeight ?? ''"
      placeholder="e.g. 100vh, 400px"
      @update:model-value="(v) => props.patchStyle({ minHeight: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField label="Padding">
    <CoarTextInput
      :model-value="style.padding ?? ''"
      placeholder="e.g. 16px"
      @update:model-value="(v) => props.patchStyle({ padding: v || undefined })"
    />
  </CoarFormField>
</template>
