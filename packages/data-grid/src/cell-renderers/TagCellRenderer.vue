<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarTag } from '@cocoar/vue-ui';
import type { TagVariant, TagSize } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { TagCellRendererConfig } from './tag-cell-renderer.models';

interface TagItem {
  label: string;
  variant: TagVariant;
}

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { t } = useI18n();

const config = computed<TagCellRendererConfig>(() => props.params.colDef?.cellRendererParams?.config ?? {});
const size = computed<TagSize>(() => config.value.size ?? 's');

const tags = computed<TagItem[]>(() => {
  const cfg = config.value;
  const rawLabels = extractLabels(props.params.value, cfg);
  const displayLabels = extractLabels(
    resolveValueForLabels(props.params.value, props.params.valueFormatted),
    cfg,
  );
  return rawLabels.map((rawLabel, i) => ({
    label: translateLabel(displayLabels[i] ?? rawLabel, cfg),
    variant: resolveVariant(rawLabel, cfg),
  }));
});

function resolveValueForLabels(value: unknown, valueFormatted: string | null | undefined): unknown {
  if (valueFormatted == null) return value;
  if (Array.isArray(value)) return value;
  if (value != null && typeof value === 'object') return value;
  return valueFormatted;
}

function extractLabels(value: unknown, cfg: TagCellRendererConfig): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => labelFromItem(item, cfg));
  }
  if (typeof value === 'string') {
    const separator = cfg.separator ?? ',';
    return value.split(separator).map((s) => s.trim()).filter(Boolean);
  }
  return [String(value)];
}

function labelFromItem(item: unknown, cfg: TagCellRendererConfig): string {
  if (item != null && typeof item === 'object' && cfg.labelProperty) {
    return String((item as Record<string, unknown>)[cfg.labelProperty] ?? '');
  }
  return String(item ?? '');
}

function translateLabel(label: string, cfg: TagCellRendererConfig): string {
  if (cfg.i18nPrefix) {
    return t(cfg.i18nPrefix + label);
  }
  return label;
}

function resolveVariant(label: string, cfg: TagCellRendererConfig): TagVariant {
  return cfg.variantMap?.[label] ?? cfg.variant ?? 'neutral';
}
</script>

<template>
  <div class="coar-tag-cell-renderer">
    <CoarTag
      v-for="tag in tags"
      :key="tag.label"
      :variant="tag.variant"
      :size="size"
    >
      {{ tag.label }}
    </CoarTag>
  </div>
</template>

<style>
.coar-tag-cell-renderer {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs, 4px);
  flex-wrap: wrap;
  height: 100%;
}
</style>
