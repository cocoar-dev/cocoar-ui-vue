<script setup lang="ts">
import { inject, ref } from 'vue';
import { SIDEBAR_COLLAPSED_KEY } from './sidebar-context';

const props = defineProps<{
  /** Section heading text */
  label: string;
}>();

const sidebarCollapsed = inject(SIDEBAR_COLLAPSED_KEY, ref(false));
</script>

<template>
  <div
    class="coar-sidebar-heading"
    :class="{ 'coar-sidebar-heading--collapsed': sidebarCollapsed }"
    role="heading"
    aria-level="3"
  >
    <span v-if="!sidebarCollapsed" class="coar-sidebar-heading__text">
      {{ props.label }}
    </span>
  </div>
</template>

<style scoped>
.coar-sidebar-heading {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.75rem 0.25rem 0.75rem;
  cursor: default;
  user-select: none;
}

/* Spacing above headings except first */
.coar-sidebar-heading:not(:first-child) {
  margin-top: 0.25rem;
}

.coar-sidebar-heading__text {
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-font-size-xs);
  font-weight: var(--coar-font-weight-semi-bold);
  line-height: var(--coar-line-height-normal);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--coar-text-neutral-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Collapsed: becomes a small spacer with subtle divider */
.coar-sidebar-heading--collapsed {
  padding: 0.5rem 0.5rem;
}

.coar-sidebar-heading--collapsed::after {
  content: '';
  display: block;
  width: 100%;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  opacity: 0.5;
}
</style>
