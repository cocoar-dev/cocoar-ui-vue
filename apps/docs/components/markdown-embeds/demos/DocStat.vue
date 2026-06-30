<script setup lang="ts">
/**
 * Read-only viewer for a `:::stat{...}` embed. A plain component with normal
 * props — it knows nothing about markdown. Registered as the `viewer` for the
 * `stat` key in the demo below.
 */
defineProps<{
  label?: string;
  value?: string;
  trend?: string;
  tone?: string;
}>();
</script>

<template>
  <div class="doc-stat" :class="`doc-stat--${tone || 'neutral'}`">
    <span class="doc-stat__label">{{ label || 'Metric' }}</span>
    <span class="doc-stat__value">{{ value || '—' }}</span>
    <span v-if="trend" class="doc-stat__trend">{{ trend }}</span>
  </div>
</template>

<style scoped>
.doc-stat {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  padding: 14px 18px;
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-left: 4px solid var(--tone, var(--coar-border-neutral, #e2e2e2));
  border-radius: 10px;
  background: var(--coar-background-neutral-primary, #fff);
}
.doc-stat--positive { --tone: #16a34a; }
.doc-stat--negative { --tone: #dc2626; }
.doc-stat--neutral { --tone: #6366f1; }
.doc-stat__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-secondary, #777);
}
.doc-stat__value {
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary, #111);
}
.doc-stat__trend {
  font-size: 13px;
  font-weight: 600;
  color: var(--tone);
}
</style>
