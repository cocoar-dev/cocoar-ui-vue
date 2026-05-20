<script setup lang="ts">
/**
 * Right-rail panel listing every annotation in the document.
 *
 * Acrobat- / PowerPoint-style "Comments" pane: a scrollable list of all
 * annotations, with filter-by-type, full-text search, and a sort toggle
 * between page-grouped and chronological. Clicking an entry selects the
 * annotation (the consumer wires this to scroll + open the edit popover);
 * the inline 3-dot menu deletes.
 *
 * The panel is purely presentational over `props.annotations`. Consumer
 * still owns the annotations array — every action goes back out via the
 * `select` / `delete` emits.
 */
import { computed, ref } from 'vue';
import {
  CoarIcon,
  CoarMenu,
  CoarMenuItem,
  CoarPopover,
  CoarSegmentedControl,
} from '@cocoar/vue-ui';
import type { CoarPdfAnnotation, CoarPdfAnnotationType } from '../types';
import type { DocumentInfo } from '../source-types';
import type { CoarDocumentViewerLabels } from "../CoarDocumentViewer.vue";
import DocumentInfoSection from './DocumentInfoSection.vue';

const props = defineProps<{
  annotations: readonly CoarPdfAnnotation[];
  selectedId: string | null;
  /** Source-level metadata for the optional Info section. Null suppresses the section entirely. */
  info?: DocumentInfo | null;
  /** Current page's intrinsic dimensions, for the per-page row in the Info section. */
  currentPageInfo?: { index: number; width: number; height: number } | null;
  labels: Required<CoarDocumentViewerLabels>;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'close'): void;
}>();

type SortMode = 'page' | 'chronological';
const sortMode = ref<SortMode>('page');
const search = ref('');

/** Set of annotation types currently visible; toggled via the filter chips. */
const enabledTypes = ref<Set<CoarPdfAnnotationType>>(
  new Set<CoarPdfAnnotationType>(['marker', 'comment', 'ink', 'freetext']),
);

/** Icon used for both the filter chip and the list-item leading badge. */
const ICON_BY_TYPE: Readonly<Record<CoarPdfAnnotationType, string>> = {
  marker: 'highlighter',
  comment: 'message-square',
  ink: 'pencil',
  freetext: 'type',
};

const ALL_TYPES: readonly CoarPdfAnnotationType[] = [
  'marker',
  'comment',
  'ink',
  'freetext',
];

function previewText(a: CoarPdfAnnotation): string {
  // Freetext annotations carry their visible text in `text`; all others
  // expose an optional side `comment`.
  if (a.type === 'freetext') return a.text || '';
  return a.comment || '';
}

const filtered = computed<CoarPdfAnnotation[]>(() => {
  const q = search.value.trim().toLowerCase();
  return props.annotations.filter((a) => {
    if (!enabledTypes.value.has(a.type)) return false;
    if (!q) return true;
    return previewText(a).toLowerCase().includes(q);
  });
});

interface Group {
  /** Page index for grouped mode; -1 indicates the chronological "all-in-one" bucket. */
  pageIndex: number;
  items: CoarPdfAnnotation[];
}

const grouped = computed<Group[]>(() => {
  if (sortMode.value === 'chronological') {
    const sorted = [...filtered.value].sort((a, b) =>
      // String compare on ISO timestamps gives ascending chronological order.
      (a.createdAt || '').localeCompare(b.createdAt || ''),
    );
    return [{ pageIndex: -1, items: sorted }];
  }
  const map = new Map<number, CoarPdfAnnotation[]>();
  for (const a of filtered.value) {
    const list = map.get(a.pageIndex);
    if (list) list.push(a);
    else map.set(a.pageIndex, [a]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pageIndex, items]) => ({ pageIndex, items }));
});

function toggleType(t: CoarPdfAnnotationType): void {
  // Replace the Set wholesale so the computed downstream re-runs.
  const next = new Set(enabledTypes.value);
  if (next.has(t)) next.delete(t);
  else next.add(t);
  enabledTypes.value = next;
}

/**
 * Tiny relative-time formatter. Locale-independent and good enough for a
 * sidebar label — consumers wanting full-fidelity i18n can replace this when
 * the panel adopts the cocoar localization package.
 */
function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return props.labels.justNow;
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  return `${d}d`;
}

const sortOptions = computed(() => [
  { value: 'page' as const, label: props.labels.sortByPage, icon: 'file-text' },
  { value: 'chronological' as const, label: props.labels.sortChronological, icon: 'clock' },
]);
</script>

<template>
  <aside class="coar-pdf-anno-panel" :aria-label="labels.annotationsPanel">
    <DocumentInfoSection
      :info="info ?? null"
      :current-page="currentPageInfo ?? null"
      :labels="labels"
    />

    <div class="coar-pdf-anno-panel__header">
      <span class="coar-pdf-anno-panel__title">{{ labels.annotationsPanel }}</span>
      <span class="coar-pdf-anno-panel__count" :title="`${filtered.length} / ${annotations.length}`">
        {{ filtered.length }}/{{ annotations.length }}
      </span>
      <button
        type="button"
        class="coar-pdf-anno-panel__close"
        title="Close"
        aria-label="Close"
        @click="emit('close')"
      >
        <CoarIcon name="x" size="s" />
      </button>
    </div>

    <div class="coar-pdf-anno-panel__controls">
      <CoarSegmentedControl
        v-model="sortMode"
        size="xs"
        full-width
        :options="sortOptions"
        :aria-label="labels.sortBy"
      />
      <div class="coar-pdf-anno-panel__search-row">
        <CoarIcon name="search" size="xs" class="coar-pdf-anno-panel__search-icon" />
        <input
          v-model="search"
          type="search"
          class="coar-pdf-anno-panel__search-input"
          :placeholder="labels.searchAnnotations"
          :aria-label="labels.searchAnnotations"
        />
      </div>
      <div class="coar-pdf-anno-panel__filters" role="group" :aria-label="labels.filterBy">
        <button
          v-for="t in ALL_TYPES"
          :key="t"
          type="button"
          class="coar-pdf-anno-panel__filter"
          :class="{ 'coar-pdf-anno-panel__filter--off': !enabledTypes.has(t) }"
          :title="t"
          :aria-label="t"
          :aria-pressed="enabledTypes.has(t)"
          @click="toggleType(t)"
        >
          <CoarIcon :name="ICON_BY_TYPE[t]" size="xs" />
        </button>
      </div>
    </div>

    <div class="coar-pdf-anno-panel__list" role="list">
      <div v-if="filtered.length === 0" class="coar-pdf-anno-panel__empty">
        {{ annotations.length === 0 ? labels.noAnnotations : labels.noMatchingAnnotations }}
      </div>
      <template v-else>
        <template v-for="group in grouped" :key="group.pageIndex">
          <div
            v-if="sortMode === 'page'"
            class="coar-pdf-anno-panel__group-header"
          >
            {{ labels.pagePrefix }} {{ group.pageIndex + 1 }}
          </div>
          <div
            v-for="a in group.items"
            :key="a.id"
            class="coar-pdf-anno-panel__item"
            :class="{ 'coar-pdf-anno-panel__item--selected': a.id === selectedId }"
            role="listitem"
            tabindex="0"
            :aria-current="a.id === selectedId ? 'true' : undefined"
            @click="emit('select', a.id)"
            @keydown.enter.prevent="emit('select', a.id)"
            @keydown.space.prevent="emit('select', a.id)"
          >
            <span class="coar-pdf-anno-panel__item-icon" :style="{ color: a.color }">
              <CoarIcon :name="ICON_BY_TYPE[a.type]" size="s" />
            </span>
            <span class="coar-pdf-anno-panel__item-body">
              <span class="coar-pdf-anno-panel__item-text">
                {{ previewText(a) || `(${a.type})` }}
              </span>
              <span class="coar-pdf-anno-panel__item-meta">
                <template v-if="a.createdBy">{{ a.createdBy }}</template>
                <template v-if="a.createdBy && (sortMode === 'chronological' || a.createdAt)"> · </template>
                <template v-if="sortMode === 'chronological'">{{ labels.pagePrefix }} {{ a.pageIndex + 1 }} · </template>
                {{ relativeTime(a.createdAt) }}
              </span>
            </span>
            <!-- Nested in a span with @click.stop so the popover trigger does
                 not double as a row click. The popover itself uses mode="click"
                 so the menu appears as a floating panel on click. -->
            <span class="coar-pdf-anno-panel__item-menu-wrap" @click.stop @keydown.stop>
              <CoarPopover mode="click" :offset="4">
                <template #default>
                  <button
                    type="button"
                    class="coar-pdf-anno-panel__item-menu"
                    :title="labels.moreActions"
                    :aria-label="labels.moreActions"
                  >
                    <CoarIcon name="more-vertical" size="xs" />
                  </button>
                </template>
                <template #content>
                  <CoarMenu>
                    <CoarMenuItem icon="trash-2" @click="emit('delete', a.id)">
                      {{ labels.annotationDelete }}
                    </CoarMenuItem>
                  </CoarMenu>
                </template>
              </CoarPopover>
            </span>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.coar-pdf-anno-panel {
  display: flex;
  flex-direction: column;
  width: 260px;
  flex: 0 0 260px;
  background: var(--coar-color-surface-2, #f6f7f8);
  border-left: 1px solid var(--coar-color-border, #e5e7eb);
  font-size: 12px;
  overflow: hidden;
}

.coar-pdf-anno-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--coar-color-border, #e5e7eb);
  flex-shrink: 0;
}

.coar-pdf-anno-panel__title {
  font-weight: 600;
  color: var(--coar-color-fg, #1a1a1a);
}

.coar-pdf-anno-panel__count {
  margin-left: auto;
  color: var(--coar-color-fg-muted, #6b7280);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

.coar-pdf-anno-panel__close {
  appearance: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
}
.coar-pdf-anno-panel__close:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.06));
}

.coar-pdf-anno-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--coar-color-border, #e5e7eb);
  flex-shrink: 0;
}

.coar-pdf-anno-panel__search-row {
  position: relative;
  display: flex;
  align-items: center;
}

.coar-pdf-anno-panel__search-icon {
  position: absolute;
  left: 6px;
  color: var(--coar-color-fg-muted, #6b7280);
  pointer-events: none;
}

.coar-pdf-anno-panel__search-input {
  appearance: none;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px 4px 24px;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  font-size: 12px;
  outline: none;
}
.coar-pdf-anno-panel__search-input:focus-visible {
  border-color: var(--coar-color-accent, #2563eb);
  box-shadow: 0 0 0 2px var(--coar-color-accent-tint, rgba(37, 99, 235, 0.2));
}

.coar-pdf-anno-panel__filters {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.coar-pdf-anno-panel__filter {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--coar-color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-color-surface, #ffffff);
  color: var(--coar-color-fg, #1a1a1a);
  cursor: pointer;
  transition: background 0.1s ease, opacity 0.1s ease;
}
.coar-pdf-anno-panel__filter:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.04));
}
.coar-pdf-anno-panel__filter--off {
  opacity: 0.35;
  background: transparent;
}

.coar-pdf-anno-panel__list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0;
}

.coar-pdf-anno-panel__empty {
  padding: 16px 12px;
  color: var(--coar-color-fg-muted, #6b7280);
  text-align: center;
  font-size: 12px;
}

.coar-pdf-anno-panel__group-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  color: var(--coar-color-fg-muted, #6b7280);
}

.coar-pdf-anno-panel__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  outline: none;
}
.coar-pdf-anno-panel__item:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.04));
}
.coar-pdf-anno-panel__item:focus-visible {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.04));
  outline: 2px solid var(--coar-color-accent, #2563eb);
  outline-offset: -2px;
}
.coar-pdf-anno-panel__item--selected {
  background: var(--coar-color-accent-tint, rgba(37, 99, 235, 0.08));
  border-left-color: var(--coar-color-accent, #2563eb);
}
.coar-pdf-anno-panel__item--selected:hover {
  background: var(--coar-color-accent-tint, rgba(37, 99, 235, 0.12));
}

.coar-pdf-anno-panel__item-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.coar-pdf-anno-panel__item-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.3;
}

.coar-pdf-anno-panel__item-text {
  font-size: 12px;
  color: var(--coar-color-fg, #1a1a1a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-pdf-anno-panel__item-meta {
  font-size: 10px;
  color: var(--coar-color-fg-muted, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-pdf-anno-panel__item-menu-wrap {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s ease;
}
.coar-pdf-anno-panel__item:hover .coar-pdf-anno-panel__item-menu-wrap,
.coar-pdf-anno-panel__item:focus-within .coar-pdf-anno-panel__item-menu-wrap,
.coar-pdf-anno-panel__item--selected .coar-pdf-anno-panel__item-menu-wrap {
  opacity: 1;
}

.coar-pdf-anno-panel__item-menu {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-color-fg-muted, #6b7280);
  cursor: pointer;
  border-radius: 4px;
}
.coar-pdf-anno-panel__item-menu:hover {
  background: var(--coar-color-surface-3, rgba(0, 0, 0, 0.06));
  color: var(--coar-color-fg, #1a1a1a);
}
</style>
