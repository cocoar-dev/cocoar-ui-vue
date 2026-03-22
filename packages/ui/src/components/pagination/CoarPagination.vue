<script setup lang="ts">
import { computed } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';

export type PaginationPageItem = { type: 'page'; page: number } | { type: 'ellipsis' };

const props = withDefaults(
  defineProps<{
    /** Total number of items */
    totalItems: number;
    /** Items per page */
    pageSize?: number;
    /** Maximum visible page buttons (excluding first/last nav) */
    maxVisiblePages?: number;
    /** Show first/last page nav buttons */
    showFirstLast?: boolean;
    /** Disabled state */
    disabled?: boolean;
  }>(),
  {
    pageSize: 10,
    maxVisiblePages: 5,
    showFirstLast: true,
    disabled: false,
  },
);

const currentPage = defineModel<number>({ default: 1 });

const emit = defineEmits<{
  (e: 'pageChanged', page: number): void;
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));
const canGoPrev = computed(() => currentPage.value > 1);
const canGoNext = computed(() => currentPage.value < totalPages.value);

const visiblePages = computed<PaginationPageItem[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const maxVisible = props.maxVisiblePages;

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => ({ type: 'page' as const, page: i + 1 }));
  }

  const items: PaginationPageItem[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  let startPage = Math.max(2, current - halfVisible);
  let endPage = Math.min(total - 1, current + halfVisible);

  if (current <= halfVisible + 1) {
    endPage = Math.min(total - 1, maxVisible - 1);
  }
  if (current >= total - halfVisible) {
    startPage = Math.max(2, total - maxVisible + 2);
  }

  items.push({ type: 'page', page: 1 });

  if (startPage > 2) {
    items.push({ type: 'ellipsis' });
  }

  for (let i = startPage; i <= endPage; i++) {
    items.push({ type: 'page', page: i });
  }

  if (endPage < total - 1) {
    items.push({ type: 'ellipsis' });
  }

  if (total > 1) {
    items.push({ type: 'page', page: total });
  }

  return items;
});

function goToPage(page: number): void {
  if (props.disabled || page < 1 || page > totalPages.value || page === currentPage.value) {
    return;
  }
  currentPage.value = page;
  emit('pageChanged', page);
}

function trackByItem(index: number, item: PaginationPageItem): string {
  return item.type === 'page' ? `page-${item.page}` : `ellipsis-${index}`;
}
</script>

<template>
  <nav
    class="coar-pagination"
    :class="{ 'coar-pagination--disabled': disabled }"
    aria-label="Pagination"
  >
    <div class="coar-pagination-nav">
      <button
        v-if="showFirstLast"
        type="button"
        class="coar-pagination-button coar-pagination-button--nav"
        :disabled="disabled || !canGoPrev"
        aria-label="Go to first page"
        @click="goToPage(1)"
      >
        <CoarIcon name="chevrons-left" size="s" />
      </button>

      <button
        type="button"
        class="coar-pagination-button coar-pagination-button--nav"
        :disabled="disabled || !canGoPrev"
        aria-label="Go to previous page"
        @click="goToPage(currentPage - 1)"
      >
        <CoarIcon name="chevron-left" size="s" />
      </button>

      <template v-for="(item, index) in visiblePages" :key="trackByItem(index, item)">
        <span v-if="item.type === 'ellipsis'" class="coar-pagination-ellipsis">...</span>
        <button
          v-else
          type="button"
          class="coar-pagination-button coar-pagination-button--page"
          :class="{ 'coar-pagination-button--active': item.page === currentPage }"
          :disabled="disabled"
          :aria-current="item.page === currentPage ? 'page' : undefined"
          :aria-label="'Go to page ' + item.page"
          @click="goToPage(item.page)"
        >
          {{ item.page }}
        </button>
      </template>

      <button
        type="button"
        class="coar-pagination-button coar-pagination-button--nav"
        :disabled="disabled || !canGoNext"
        aria-label="Go to next page"
        @click="goToPage(currentPage + 1)"
      >
        <CoarIcon name="chevron-right" size="s" />
      </button>

      <button
        v-if="showFirstLast"
        type="button"
        class="coar-pagination-button coar-pagination-button--nav"
        :disabled="disabled || !canGoNext"
        aria-label="Go to last page"
        @click="goToPage(totalPages)"
      >
        <CoarIcon name="chevrons-right" size="s" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.coar-pagination {
  display: block;
}

.coar-pagination-nav {
  display: flex;
  align-items: center;
  gap: var(--coar-pagination-gap);
}

.coar-pagination-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--coar-pagination-button-size);
  height: var(--coar-pagination-button-size);
  padding: 0 var(--coar-spacing-xs);
  font-size: var(--coar-pagination-font-size);
  font-family: inherit;
  line-height: var(--coar-line-height-none);
  border: 1px solid transparent;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .coar-pagination-button {
    transition: none;
  }
}

.coar-pagination-button:hover:not(:disabled) {
  background: var(--coar-pagination-hover-background);
}

.coar-pagination-button:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: 1px;
}

.coar-pagination-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.coar-pagination-button--active {
  background: var(--coar-pagination-active-background);
  color: var(--coar-pagination-active-color);
  font-weight: var(--coar-font-weight-semi-bold);
}

.coar-pagination-button--active:hover:not(:disabled) {
  background: var(--coar-pagination-active-background);
}

.coar-pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--coar-pagination-button-size);
  height: var(--coar-pagination-button-size);
  font-size: var(--coar-pagination-font-size);
  color: var(--coar-text-neutral-tertiary);
  user-select: none;
}

.coar-pagination--disabled {
  pointer-events: none;
  opacity: 0.5;
}
</style>
