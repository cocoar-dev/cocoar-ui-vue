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

const tableClasses = computed(() => [
  'coar-table',
  {
    'coar-table--plain': props.variant === 'plain',
    'coar-table--bordered': props.variant === 'bordered',
    'coar-table--compact': props.compact,
    'coar-table--hover': props.hover,
  },
]);
</script>

<template>
  <table :class="tableClasses">
    <slot />
  </table>
</template>

<style scoped>
.coar-table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-small-base-size);
  line-height: var(--coar-line-height-relaxed);
}

/* Header */
.coar-table :deep(thead) {
  background: var(--coar-background-neutral-secondary);
}

.coar-table :deep(th) {
  padding: 0.75rem var(--coar-spacing-m);
  text-align: left;
  font-weight: var(--coar-font-weight-semi-bold);
  font-size: var(--coar-component-s-font-size);
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
  padding: 0.75rem var(--coar-spacing-m);
  text-align: left;
  color: var(--coar-text-neutral-secondary);
  vertical-align: top;
}

/* Code within table */
.coar-table :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--coar-component-s-font-size);
  color: var(--coar-text-accent-secondary);
  white-space: nowrap;
}

/* Plain variant */
.coar-table--plain :deep(tbody tr:nth-child(odd)),
.coar-table--plain :deep(tbody tr:nth-child(even)) {
  background: var(--coar-background-neutral-primary);
}

.coar-table--plain :deep(td) {
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-table--plain :deep(tbody tr:last-child td) {
  border-bottom: none;
}

/* Bordered variant */
.coar-table--bordered :deep(th),
.coar-table--bordered :deep(td) {
  border: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-table--bordered :deep(tbody tr:nth-child(odd)),
.coar-table--bordered :deep(tbody tr:nth-child(even)) {
  background: var(--coar-background-neutral-primary);
}

/* Compact */
.coar-table--compact :deep(th),
.coar-table--compact :deep(td) {
  padding: var(--coar-spacing-s) 0.75rem;
  font-size: var(--coar-component-s-font-size);
}

/* Hover */
.coar-table--hover :deep(tbody tr:hover) {
  background: var(--coar-background-neutral-secondary);
}

/* Utility classes */
.coar-table :deep(.text-right) { text-align: right; }
.coar-table :deep(.text-center) { text-align: center; }
.coar-table :deep(.nowrap) { white-space: nowrap; }

.coar-table :deep(.prop-name code) {
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-font-weight-medium);
}

.coar-table :deep(.type) { color: var(--coar-text-neutral-tertiary); }
.coar-table :deep(.default) { color: var(--coar-text-neutral-tertiary); }

.coar-table :deep(.required-badge) {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  font-size: var(--coar-body-footnote-size);
  font-weight: var(--coar-font-weight-semi-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--coar-text-semantic-warning-bold);
  background: var(--coar-background-semantic-warning-subtle);
  border-radius: var(--coar-radius-xxs);
  vertical-align: middle;
}
</style>
