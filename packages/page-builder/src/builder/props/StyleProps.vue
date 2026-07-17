<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { PageNode, NodeStyle } from '../../schema';

const props = defineProps<{
  node: PageNode;
  patchStyle: (update: Partial<NodeStyle>) => void;
  /** Container-ness comes from the element registry (page or `def.container`), not the node shape. */
  container?: boolean;
}>();

const { t } = useI18n();

const style = computed<NodeStyle>(() => props.node.style ?? {});

// A width set without an explicit `size` is treated as a fixed width, so legacy
// schemas surface as 'Fixed width' with their value still visible/editable.
const sizeValue = computed<string>(() => style.value.size ?? (style.value.width ? 'fixed' : ''));
const showWidth = computed(() => sizeValue.value === 'fixed');

const justifyOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: '', label: t('coar.pageBuilder.props.inherit', undefined, '— inherit') },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
]);

const alignOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: '', label: t('coar.pageBuilder.props.inherit', undefined, '— inherit') },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
]);

const sizeOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: '', label: t('coar.pageBuilder.props.sizeAuto', undefined, 'Auto') },
  { value: 'fill', label: t('coar.pageBuilder.props.sizeFill', undefined, 'Fill') },
  { value: 'fixed', label: t('coar.pageBuilder.props.sizeFixedWidth', undefined, 'Fixed width') },
]);

function setSize(v: string) {
  if (v === 'fill') props.patchStyle({ size: 'fill', width: undefined });
  else if (v === 'fixed') props.patchStyle({ size: 'fixed' });
  else props.patchStyle({ size: undefined, width: undefined });
}
</script>

<template>
  <!-- ── Container: how children are arranged ──────────────────────────────── -->
  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.gap', undefined, 'Gap')">
    <CoarTextInput
      :model-value="style.gap ?? ''"
      placeholder="e.g. 8px"
      @update:model-value="(v) => props.patchStyle({ gap: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.justify', undefined, 'Justify (main axis)')">
    <CoarSelect
      :model-value="style.justify ?? ''"
      :options="justifyOptions"
      @update:model-value="(v) => props.patchStyle({ justify: (v || undefined) as NodeStyle['justify'] })"
    />
  </CoarFormField>

  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.alignItems', undefined, 'Align items (cross axis)')">
    <CoarSelect
      :model-value="style.align ?? ''"
      :options="alignOptions"
      @update:model-value="(v) => props.patchStyle({ align: (v || undefined) as NodeStyle['align'] })"
    />
  </CoarFormField>

  <!-- ── Self: how this node sits in its parent ────────────────────────────── -->
  <CoarFormField :label="t('coar.pageBuilder.props.alignSelf', undefined, 'Align self')">
    <CoarSelect
      :model-value="style.alignSelf ?? ''"
      :options="alignOptions"
      @update:model-value="(v) => props.patchStyle({ alignSelf: (v || undefined) as NodeStyle['alignSelf'] })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.size', undefined, 'Size')">
    <CoarSelect
      :model-value="sizeValue"
      :options="sizeOptions"
      @update:model-value="(v) => setSize(v as string)"
    />
  </CoarFormField>

  <CoarFormField v-if="showWidth" :label="t('coar.pageBuilder.props.width', undefined, 'Width')">
    <CoarTextInput
      :model-value="style.width ?? ''"
      placeholder="e.g. 380px, 50%"
      @update:model-value="(v) => props.patchStyle({ width: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.minHeight', undefined, 'Min height')">
    <CoarTextInput
      :model-value="style.minHeight ?? ''"
      placeholder="e.g. 100vh, 400px"
      @update:model-value="(v) => props.patchStyle({ minHeight: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.padding', undefined, 'Padding')">
    <CoarTextInput
      :model-value="style.padding ?? ''"
      placeholder="e.g. 16px"
      @update:model-value="(v) => props.patchStyle({ padding: v || undefined })"
    />
  </CoarFormField>
</template>
