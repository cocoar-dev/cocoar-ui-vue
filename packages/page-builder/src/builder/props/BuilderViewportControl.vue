<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import type { PageBreakpoint } from '../../schema';

/**
 * Viewport picker shared by the editor and the preview. The selection is one
 * piece of state for both views, so a page set up as "Phone" stays Phone when
 * switching tabs — they show the same document, and a width that only applied
 * to one of them would be a trap.
 */
export type BuilderViewportWidth = PageBreakpoint | 'fluid';

defineProps<{ value: BuilderViewportWidth }>();
const emit = defineEmits<{ select: [value: BuilderViewportWidth] }>();

const { t } = useI18n();

const OPTIONS: { id: BuilderViewportWidth; label: string; title: string }[] = [
  { id: 'compact', label: 'Compact · 320', title: '320 × 568' },
  { id: 'phone', label: 'Phone · 390', title: '390 × 844' },
  { id: 'tablet', label: 'Tablet · 768', title: '768 × 1024' },
  { id: 'desktop', label: 'Desktop · 1280', title: '1280 × 800' },
  { id: 'fluid', label: 'Fluid', title: 'Host container' },
];
</script>

<template>
  <div
    class="pb-viewport"
    role="radiogroup"
    :aria-label="t('coar.pageBuilder.chrome.previewWidth', undefined, 'Preview width')"
  >
    <button
      v-for="option in OPTIONS"
      :key="option.id"
      type="button"
      class="pb-viewport__btn"
      :class="{ 'pb-viewport__btn--active': value === option.id }"
      role="radio"
      :aria-checked="value === option.id"
      :title="option.title"
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
