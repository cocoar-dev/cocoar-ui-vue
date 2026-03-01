<script setup lang="ts">
import { computed } from 'vue';

export type CoarTableVariant = 'default' | 'plain' | 'bordered';

export interface CoarTableProps {
  /** Visual variant: default (zebra), plain (no stripes), bordered (cell borders). */
  variant?: CoarTableVariant;
  /** Whether to use compact padding. */
  compact?: boolean;
  /** Whether rows should highlight on hover. */
  hover?: boolean;
}

const props = withDefaults(defineProps<CoarTableProps>(), {
  variant: 'default',
  compact: false,
  hover: true,
});

const hostClasses = computed(() => [
  'coar-table-host',
  {
    'coar-table--plain': props.variant === 'plain',
    'coar-table--bordered': props.variant === 'bordered',
    'coar-table--compact': props.compact,
    'coar-table--hover': props.hover,
  },
]);
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-table-wrapper">
      <table class="coar-table">
        <slot />
      </table>
    </div>
  </div>
</template>

<style scoped>
.coar-table-host {
  display: block;
}

.coar-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-primary);
}

.coar-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-small-base-size, 0.875rem);
  line-height: 1.5;
}

/* Header */
.coar-table :deep(thead) {
  background: var(--coar-background-neutral-secondary);
}

.coar-table :deep(th) {
  padding: 0.75rem var(--coar-spacing-m, 1rem);
  text-align: left;
  font-weight: var(--coar-font-weight-semi-bold, 600);
  font-size: var(--coar-component-s-font-size, 0.8125rem);
  color: var(--coar-text-neutral-primary);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Body — zebra stripes (default) */
.coar-table :deep(tbody tr:nth-child(odd)) {
  background: var(--coar-background-neutral-primary);
}

.coar-table :deep(tbody tr:nth-child(even)) {
  background: var(--coar-background-neutral-secondary);
}

.coar-table :deep(td) {
  padding: 0.75rem var(--coar-spacing-m, 1rem);
  text-align: left;
  color: var(--coar-text-neutral-secondary);
  vertical-align: top;
}

/* Code within table */
.coar-table :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--coar-component-s-font-size, 0.8125rem);
  color: var(--coar-text-accent-secondary);
  white-space: nowrap;
}

/* Plain variant */
.coar-table--plain .coar-table :deep(tbody tr:nth-child(odd)),
.coar-table--plain .coar-table :deep(tbody tr:nth-child(even)) {
  background: var(--coar-background-neutral-primary);
}

.coar-table--plain .coar-table :deep(td) {
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-table--plain .coar-table :deep(tbody tr:last-child td) {
  border-bottom: none;
}

/* Bordered variant */
.coar-table--bordered .coar-table-wrapper {
  border: none;
}

.coar-table--bordered .coar-table :deep(th),
.coar-table--bordered .coar-table :deep(td) {
  border: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-table--bordered .coar-table :deep(tbody tr:nth-child(odd)),
.coar-table--bordered .coar-table :deep(tbody tr:nth-child(even)) {
  background: var(--coar-background-neutral-primary);
}

/* Compact */
.coar-table--compact .coar-table :deep(th),
.coar-table--compact .coar-table :deep(td) {
  padding: var(--coar-spacing-s, 0.5rem) 0.75rem;
  font-size: var(--coar-component-s-font-size, 0.8125rem);
}

/* Hover */
.coar-table--hover .coar-table :deep(tbody tr:hover) {
  background: var(--coar-background-neutral-secondary);
}

/* Utility classes */
.coar-table :deep(.text-right) { text-align: right; }
.coar-table :deep(.text-center) { text-align: center; }
.coar-table :deep(.nowrap) { white-space: nowrap; }

.coar-table :deep(.prop-name code) {
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-font-weight-medium, 500);
}

.coar-table :deep(.type) { color: var(--coar-text-neutral-tertiary); }
.coar-table :deep(.default) { color: var(--coar-text-neutral-tertiary); }

.coar-table :deep(.required-badge) {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  font-size: var(--coar-body-footnote-size, 0.625rem);
  font-weight: var(--coar-font-weight-semi-bold, 600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--coar-text-semantic-warning-bold);
  background: var(--coar-background-semantic-warning-subtle);
  border-radius: var(--coar-radius-xxs);
  vertical-align: middle;
}
</style>
