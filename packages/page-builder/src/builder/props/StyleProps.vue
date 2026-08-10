<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  CoarCheckbox,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { ElementNode, PageBreakpoint, PageNode, NodeStyle } from '../../schema';
import { localNodeStyle, resolveNodeStyle } from '../../responsive';
import { BUILDER_BREAKPOINT } from '../builderContext';
import BuilderFxButton from '../BuilderFxButton.vue';

const props = defineProps<{
  node: PageNode;
  patchStyle: (update: Partial<NodeStyle>) => void;
  patchNode: (update: Partial<PageNode>) => void;
  /** Container-ness comes from the element registry (page or `def.container`), not the node shape. */
  container?: boolean;
}>();

const { t } = useI18n();
const activeBreakpoint = inject(BUILDER_BREAKPOINT)!;

const style = computed<NodeStyle>(() => resolveNodeStyle(props.node, activeBreakpoint.value));
const localStyle = computed<Partial<NodeStyle>>(() => localNodeStyle(props.node, activeBreakpoint.value));
const isStack = computed(() => props.node.type === 'stack');
const localKeys = computed(() => Object.keys(localStyle.value) as (keyof NodeStyle)[]);
const breakpointOptions: CoarSelectOption<string>[] = [
  { value: 'compact', label: 'Compact · base / 320' },
  { value: 'phone', label: 'Phone · 390' },
  { value: 'tablet', label: 'Tablet · 768' },
  { value: 'desktop', label: 'Desktop · 1280' },
];
const options = (values: readonly string[]): CoarSelectOption<string>[] => [
  { value: '', label: '— inherit / default' },
  ...values.map((value) => ({ value, label: value })),
];

function setBreakpoint(value: string | null) {
  if (value) activeBreakpoint.value = value as PageBreakpoint;
}

function resetProperty(key: keyof NodeStyle) {
  props.patchStyle({ [key]: undefined });
}

// A width set without an explicit `size` is treated as a fixed width, so legacy
// schemas surface as 'Fixed width' with their value still visible/editable.
const sizeValue = computed<string>(() => style.value.size ?? (style.value.width ? 'fixed' : ''));
const showWidth = computed(() => props.node.type === 'page' || sizeValue.value === 'fixed');

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
  { value: 'fit', label: t('coar.pageBuilder.props.sizeFit', undefined, 'Fit content') },
  { value: 'fill', label: t('coar.pageBuilder.props.sizeFill', undefined, 'Fill') },
  { value: 'grow', label: t('coar.pageBuilder.props.sizeGrow', undefined, 'Grow (both directions)') },
  { value: 'fixed', label: t('coar.pageBuilder.props.sizeFixedWidth', undefined, 'Fixed width') },
]);

function setSize(v: string) {
  if (v === 'fill') props.patchStyle({ size: 'fill', width: undefined });
  else if (v === 'grow') props.patchStyle({ size: 'grow', width: undefined });
  else if (v === 'fit') props.patchStyle({ size: 'fit', width: undefined });
  else if (v === 'fixed') props.patchStyle({ size: 'fixed' });
  else props.patchStyle({ size: undefined, width: undefined });
}
</script>

<template>
  <CoarFormField label="Authoring breakpoint">
    <CoarSelect
size="s"
      :model-value="activeBreakpoint"
      :options="breakpointOptions"
      @update:model-value="setBreakpoint"
    />
  </CoarFormField>
  <div v-if="activeBreakpoint !== 'compact'" class="pb-responsive-status">
    <span v-if="localKeys.length === 0">All values are inherited.</span>
    <template v-else>
      <span>Local overrides:</span>
      <button v-for="key in localKeys" :key="key" type="button" @click="resetProperty(key)">
        {{ key }} ×
      </button>
    </template>
  </div>

  <template v-if="isStack">
    <CoarFormField label="Stack direction">
      <CoarSelect
size="s"
        :model-value="style.direction ?? ((node as any).props?.direction ?? 'column')"
        :options="[
          { value: 'column', label: 'Column' },
          { value: 'row', label: 'Row' },
        ]"
        @update:model-value="(v) => props.patchStyle({ direction: v as NodeStyle['direction'] })"
      />
    </CoarFormField>
    <CoarCheckbox
v-if="(style.direction ?? (node as any).props?.direction) === 'row'"
      size="s"
      :model-value="style.wrap ?? ((node as any).props?.wrap ?? false)"
      label="Wrap children"
      @update:model-value="(v) => props.patchStyle({ wrap: v })"
    />
  </template>

  <CoarFormField label="Surface">
    <CoarSelect size="s" :model-value="style.surface ?? ''" :options="options(['default','subtle','raised','accent','success','warning','error'])" @update:model-value="(v) => props.patchStyle({ surface: (v || undefined) as NodeStyle['surface'] })" />
  </CoarFormField>
  <CoarFormField label="Text colour">
    <CoarSelect size="s" :model-value="style.foreground ?? ''" :options="options(['primary','secondary','tertiary','inverse','accent','success','warning','error'])" @update:model-value="(v) => props.patchStyle({ foreground: (v || undefined) as NodeStyle['foreground'] })" />
  </CoarFormField>
  <CoarFormField label="Border tone">
    <CoarSelect size="s" :model-value="style.borderTone ?? ''" :options="options(['neutral','accent','success','warning','error'])" @update:model-value="(v) => props.patchStyle({ borderTone: (v || undefined) as NodeStyle['borderTone'] })" />
  </CoarFormField>
  <CoarFormField label="Border width">
    <CoarSelect size="s" :model-value="style.borderWidth ?? ''" :options="options(['0','1px','2px'])" @update:model-value="(v) => props.patchStyle({ borderWidth: (v || undefined) as NodeStyle['borderWidth'] })" />
  </CoarFormField>
  <CoarFormField label="Radius">
    <CoarSelect size="s" :model-value="style.radius ?? ''" :options="options(['none','small','medium','large','full'])" @update:model-value="(v) => props.patchStyle({ radius: (v || undefined) as NodeStyle['radius'] })" />
  </CoarFormField>
  <CoarFormField label="Elevation">
    <CoarSelect size="s" :model-value="style.elevation ?? ''" :options="options(['none','small','medium','large'])" @update:model-value="(v) => props.patchStyle({ elevation: (v || undefined) as NodeStyle['elevation'] })" />
  </CoarFormField>
  <CoarFormField label="Font family">
    <CoarSelect size="s" :model-value="style.fontFamily ?? ''" :options="options(['body','heading','mono'])" @update:model-value="(v) => props.patchStyle({ fontFamily: (v || undefined) as NodeStyle['fontFamily'] })" />
  </CoarFormField>
  <CoarFormField label="Font size">
    <CoarSelect size="s" :model-value="style.fontSize ?? ''" :options="options(['caption','small','base','large','xlarge','display'])" @update:model-value="(v) => props.patchStyle({ fontSize: (v || undefined) as NodeStyle['fontSize'] })" />
  </CoarFormField>
  <CoarFormField label="Font weight">
    <CoarSelect size="s" :model-value="style.fontWeight ?? ''" :options="options(['regular','medium','semibold','bold'])" @update:model-value="(v) => props.patchStyle({ fontWeight: (v || undefined) as NodeStyle['fontWeight'] })" />
  </CoarFormField>
  <CoarFormField label="Font style">
    <CoarSelect size="s" :model-value="style.fontStyle ?? ''" :options="options(['normal','italic','oblique'])" @update:model-value="(v) => props.patchStyle({ fontStyle: (v || undefined) as NodeStyle['fontStyle'] })" />
  </CoarFormField>
  <CoarFormField label="Variable font axes">
    <CoarTextInput size="s" :model-value="style.fontVariationSettings ?? ''" placeholder='e.g. "wght" 650, "opsz" 32' @update:model-value="(v) => props.patchStyle({ fontVariationSettings: v || undefined })" />
  </CoarFormField>
  <CoarFormField label="Line height">
    <CoarSelect size="s" :model-value="style.lineHeight ?? ''" :options="options(['tight','normal','relaxed'])" @update:model-value="(v) => props.patchStyle({ lineHeight: (v || undefined) as NodeStyle['lineHeight'] })" />
  </CoarFormField>
  <CoarFormField label="Letter spacing">
    <CoarSelect size="s" :model-value="style.letterSpacing ?? ''" :options="options(['tight','normal','wide'])" @update:model-value="(v) => props.patchStyle({ letterSpacing: (v || undefined) as NodeStyle['letterSpacing'] })" />
  </CoarFormField>
  <CoarFormField label="Text alignment">
    <CoarSelect size="s" :model-value="style.textAlign ?? ''" :options="options(['start','center','end'])" @update:model-value="(v) => props.patchStyle({ textAlign: (v || undefined) as NodeStyle['textAlign'] })" />
  </CoarFormField>
  <CoarFormField label="Text decoration">
    <CoarSelect size="s" :model-value="style.textDecoration ?? ''" :options="options(['none','underline','line-through'])" @update:model-value="(v) => props.patchStyle({ textDecoration: (v || undefined) as NodeStyle['textDecoration'] })" />
  </CoarFormField>

  <!-- ── Container: how children are arranged ──────────────────────────────── -->
  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.gap', undefined, 'Gap')">
    <CoarTextInput
size="s"
      :model-value="style.gap ?? ''"
      placeholder="e.g. 8px"
      @update:model-value="(v) => props.patchStyle({ gap: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.justify', undefined, 'Justify (main axis)')">
    <CoarSelect
size="s"
      :model-value="style.justify ?? ''"
      :options="justifyOptions"
      @update:model-value="(v) => props.patchStyle({ justify: (v || undefined) as NodeStyle['justify'] })"
    />
  </CoarFormField>

  <CoarFormField v-if="props.container" :label="t('coar.pageBuilder.props.alignItems', undefined, 'Align items (cross axis)')">
    <CoarSelect
size="s"
      :model-value="style.align ?? ''"
      :options="alignOptions"
      @update:model-value="(v) => props.patchStyle({ align: (v || undefined) as NodeStyle['align'] })"
    />
  </CoarFormField>

  <!-- ── Self: how this node sits in its parent ────────────────────────────── -->
  <CoarFormField :label="t('coar.pageBuilder.props.alignSelf', undefined, 'Align self')">
    <CoarSelect
size="s"
      :model-value="style.alignSelf ?? ''"
      :options="alignOptions"
      @update:model-value="(v) => props.patchStyle({ alignSelf: (v || undefined) as NodeStyle['alignSelf'] })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.size', undefined, 'Size')">
    <CoarSelect
size="s"
      :model-value="sizeValue"
      :options="sizeOptions"
      @update:model-value="(v) => setSize(v as string)"
    />
  </CoarFormField>

  <BuilderFxButton
    v-if="showWidth && node.type !== 'page'"
    :node="node as ElementNode"
    target="style.width"
    :label="t('coar.pageBuilder.props.width', undefined, 'Width')"
    :static-value="style.width"
    :patch="patchNode"
  >
    <CoarTextInput
size="s"
      :model-value="style.width ?? ''"
      placeholder="e.g. 380px, 50%"
      @update:model-value="(v) => props.patchStyle({ width: v || undefined })"
    />
  </BuilderFxButton>

  <CoarFormField v-else-if="showWidth" :label="t('coar.pageBuilder.props.width', undefined, 'Width')">
    <CoarTextInput
size="s"
      :model-value="style.width ?? ''"
      placeholder="e.g. 380px, 50%"
      @update:model-value="(v) => props.patchStyle({ width: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField label="Min width">
    <CoarTextInput size="s" :model-value="style.minWidth ?? ''" placeholder="e.g. 0, 240px" @update:model-value="(v) => props.patchStyle({ minWidth: v || undefined })" />
  </CoarFormField>

  <CoarFormField label="Max width">
    <CoarTextInput size="s" :model-value="style.maxWidth ?? ''" placeholder="e.g. 448px, 100%" @update:model-value="(v) => props.patchStyle({ maxWidth: v || undefined })" />
  </CoarFormField>

  <CoarFormField label="Height">
    <CoarTextInput size="s" :model-value="style.height ?? ''" placeholder="e.g. auto, 100%" @update:model-value="(v) => props.patchStyle({ height: v || undefined })" />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.minHeight', undefined, 'Min height')">
    <CoarTextInput
size="s"
      :model-value="style.minHeight ?? ''"
      placeholder="e.g. 100vh, 400px"
      @update:model-value="(v) => props.patchStyle({ minHeight: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.maxHeight', undefined, 'Max height')">
    <CoarTextInput
      size="s"
      :model-value="style.maxHeight ?? ''"
      placeholder="e.g. 100dvh, 800px"
      @update:model-value="(v) => props.patchStyle({ maxHeight: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.aspectRatio', undefined, 'Aspect ratio')">
    <CoarTextInput
      size="s"
      :model-value="style.aspectRatio ?? ''"
      placeholder="e.g. 16 / 9"
      @update:model-value="(v) => props.patchStyle({ aspectRatio: v || undefined })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.overflow', undefined, 'Overflow')">
    <CoarSelect
      size="s"
      :model-value="style.overflow ?? ''"
      :options="options(['visible', 'hidden', 'clip', 'auto', 'scroll'])"
      @update:model-value="(v) => props.patchStyle({ overflow: (v || undefined) as NodeStyle['overflow'] })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.padding', undefined, 'Padding')">
    <CoarTextInput
size="s"
      :model-value="style.padding ?? ''"
      placeholder="e.g. 16px"
      @update:model-value="(v) => props.patchStyle({ padding: v || undefined })"
    />
  </CoarFormField>

  <CoarCheckbox
size="s"
    :model-value="!style.hidden"
    label="Visible at this breakpoint"
    @update:model-value="(v) => props.patchStyle({ hidden: v ? false : true })"
  />
</template>

<style scoped>
.pb-responsive-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding: 7px 8px;
  border-radius: 5px;
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  color: var(--coar-text-neutral-secondary, #666);
  font-size: 11px;
}
.pb-responsive-status button {
  border: 1px solid var(--coar-border-neutral, #d0d0d5);
  border-radius: 999px;
  background: var(--coar-background-neutral-primary, #fff);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.pb-style-bindable { display: flex; flex-direction: column; }
</style>
