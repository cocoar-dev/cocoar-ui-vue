<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import type { PagePreviewViewport } from '../../schema';
import { PAGE_BREAKPOINT_WIDTHS } from '../../responsive';

/**
 * Size picker shared by the editor and the preview. The selection is one piece
 * of state for both views: they show the same document, so a width that applied
 * to only one of them would be a trap.
 *
 * Entries are authoring-only. A host may replace them, but the style cascade
 * still resolves against the fixed breakpoints, derived from the chosen width —
 * so a custom size never makes a document depend on host configuration to stay
 * readable.
 */
const props = defineProps<{
  value: string;
  /** Host-provided sizes; falls back to the built-ins when unset. */
  viewports?: readonly PagePreviewViewport[];
}>();
const emit = defineEmits<{ select: [id: string] }>();

const { t } = useI18n();

const BUILT_IN: readonly PagePreviewViewport[] = [
  { id: 'compact', label: 'Compact · 320', width: PAGE_BREAKPOINT_WIDTHS.compact, height: 568 },
  { id: 'phone', label: 'Phone · 390', width: PAGE_BREAKPOINT_WIDTHS.phone, height: 844 },
  { id: 'tablet', label: 'Tablet · 768', width: PAGE_BREAKPOINT_WIDTHS.tablet, height: 1024 },
  { id: 'desktop', label: 'Desktop · 1280', width: PAGE_BREAKPOINT_WIDTHS.desktop, height: 800 },
  { id: 'fluid', label: 'Fluid' },
];

const options = computed(() => (props.viewports?.length ? props.viewports : BUILT_IN));

function title(option: PagePreviewViewport) {
  if (!option.width) return 'Host container';
  return option.height ? `${option.width} × ${option.height}` : `${option.width}px`;
}
</script>

<template>
  <div
    class="pb-viewport"
    role="radiogroup"
    :aria-label="t('coar.pageBuilder.chrome.previewWidth', undefined, 'Preview width')"
  >
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="pb-viewport__btn"
      :class="{ 'pb-viewport__btn--active': value === option.id }"
      role="radio"
      :aria-checked="value === option.id"
      :title="title(option)"
      @click="emit('select', option.id)"
    >{{ option.label }}</button>
  </div>
</template>

<style scoped>
.pb-viewport {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 1px;
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 5px;
  background: var(--coar-background-neutral-primary, #fff);
  flex-shrink: 0;
}

.pb-viewport__btn {
  border: 0;
  border-radius: 4px;
  padding: 3px 7px;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.pb-viewport__btn:hover {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-text-neutral-primary, #202124);
}

.pb-viewport__btn--active {
  background: var(--coar-surface-accent-secondary, #eef3f9);
  color: var(--coar-text-accent-primary, #315f91);
}
</style>
