<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarTag } from '@cocoar/vue-ui';
import type { TagVariant, TagSize } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { TagCellRendererConfig, TagColor } from './tag-cell-renderer.models';

const TAG_VARIANTS: ReadonlySet<string> = new Set(['neutral', 'success', 'warning', 'error', 'info', 'accent']);

interface TagItem {
  label: string;
  variant: TagVariant;
  style?: Record<string, string>;
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
  return rawLabels
    .filter((rawLabel, i) => !!(displayLabels[i] ?? rawLabel))
    .map((rawLabel, i) => {
      const appearance = resolveAppearance(rawLabel, cfg);
      return {
        label: translateLabel(displayLabels[i] ?? rawLabel, cfg),
        ...appearance,
      };
    });
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

function resolveAppearance(value: string, cfg: TagCellRendererConfig): { variant: TagVariant; style?: Record<string, string> } {
  // 1. variantFn takes precedence
  const fnResult = cfg.variantFn?.(value);
  if (fnResult != null) {
    return toAppearance(fnResult);
  }
  // 2. variantMap
  const mapResult = cfg.variantMap?.[value];
  if (mapResult != null) {
    return { variant: mapResult };
  }
  // 3. default
  return { variant: cfg.variant ?? 'neutral' };
}

function toAppearance(value: TagVariant | TagColor | string): { variant: TagVariant; style?: Record<string, string> } {
  // Object → full custom colors
  if (typeof value === 'object') {
    return {
      variant: 'neutral',
      style: {
        '--coar-tag-bg': value.bg,
        '--coar-tag-border-color': value.border ?? value.bg,
        ...(value.text ? { color: value.text } : {}),
      },
    };
  }
  // Known variant name
  if (TAG_VARIANTS.has(value)) {
    return { variant: value as TagVariant };
  }
  // CSS color → text+border from color, bg auto-calculated via color-mix
  return {
    variant: 'neutral',
    style: {
      '--coar-tag-bg': `color-mix(in oklch, ${value} 15%, transparent)`,
      '--coar-tag-border-color': value,
      'color': value,
    },
  };
}
</script>

<template>
  <div class="coar-tag-cell-renderer">
    <CoarTag
      v-for="tag in tags"
      :key="tag.label"
      :variant="tag.variant"
      :size="size"
      :style="tag.style"
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
