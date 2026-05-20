<script setup lang="ts">
/**
 * Floating search bar — input + prev/next + match count + close.
 *
 * Sits right under the toolbar, anchored top-right. Esc closes; Enter advances
 * to the next match. Match count uses the `searchMatchOf` label so consumers
 * can localise the "X of Y" phrasing.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import type { CoarDocumentViewerLabels } from "../CoarDocumentViewer.vue";

const props = defineProps<{
  query: string;
  matchCount: number;
  currentIndex: number;
  searching: boolean;
  labels: Required<CoarDocumentViewerLabels>;
}>();

const emit = defineEmits<{
  (e: 'update:query', value: string): void;
  (e: 'next'): void;
  (e: 'prev'): void;
  (e: 'close'): void;
}>();

const inputEl = ref<HTMLInputElement | null>(null);
const localQuery = ref(props.query);

watch(
  () => props.query,
  (q) => {
    if (q !== localQuery.value) localQuery.value = q;
  },
);

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  localQuery.value = v;
  emit('update:query', v);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) emit('prev');
    else emit('next');
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

const matchText = computed(() => {
  if (props.searching) return '…';
  if (props.matchCount === 0) return props.query ? '0' : '';
  return props.labels.searchMatchOf
    .replace('{current}', String(props.currentIndex + 1))
    .replace('{total}', String(props.matchCount));
});

// Auto-focus on mount so the user can start typing immediately.
nextTick(() => inputEl.value?.focus());
</script>

<template>
  <div class="coar-pdf-searchbar" role="search">
    <CoarIcon name="search" size="s" class="coar-pdf-searchbar__icon" />
    <input
      ref="inputEl"
      class="coar-pdf-searchbar__input"
      type="search"
      :placeholder="labels.search"
      :aria-label="labels.search"
      :value="localQuery"
      @input="onInput"
      @keydown="onKey"
    />
    <span
      class="coar-pdf-searchbar__count"
      aria-live="polite"
      :data-empty="!matchText"
    >{{ matchText }}</span>
    <button
      type="button"
      class="coar-pdf-searchbar__btn"
      :disabled="matchCount === 0"
      :title="labels.searchPrev"
      :aria-label="labels.searchPrev"
      @click="emit('prev')"
    >
      <CoarIcon name="chevron-up" size="s" />
    </button>
    <button
      type="button"
      class="coar-pdf-searchbar__btn"
      :disabled="matchCount === 0"
      :title="labels.searchNext"
      :aria-label="labels.searchNext"
      @click="emit('next')"
    >
      <CoarIcon name="chevron-down" size="s" />
    </button>
    <button
      type="button"
      class="coar-pdf-searchbar__btn"
      title="Close"
      aria-label="Close"
      @click="emit('close')"
    >
      <CoarIcon name="x" size="s" />
    </button>
  </div>
</template>

<style scoped>
.coar-pdf-searchbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--coar-pdf-toolbar-bg);
  color: var(--coar-pdf-toolbar-fg);
  border-bottom: 1px solid var(--coar-color-border, #e5e7eb);
  font-size: 13px;
}

.coar-pdf-searchbar__icon {
  color: var(--coar-color-fg-muted, #6b7280);
  flex-shrink: 0;
}

.coar-pdf-searchbar__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: inherit;
  font: inherit;
}
.coar-pdf-searchbar__input:focus {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 0;
  border-color: var(--coar-color-accent, #2563eb);
}

.coar-pdf-searchbar__count {
  font-variant-numeric: tabular-nums;
  min-width: 4em;
  text-align: center;
  color: var(--coar-color-fg-muted, #6b7280);
}
.coar-pdf-searchbar__count[data-empty='true'] {
  visibility: hidden;
}

.coar-pdf-searchbar__btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.coar-pdf-searchbar__btn:hover:not(:disabled) {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.06));
}
.coar-pdf-searchbar__btn:focus-visible {
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: 1px;
}
.coar-pdf-searchbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
