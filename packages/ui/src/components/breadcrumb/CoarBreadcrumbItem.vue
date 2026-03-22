<script setup lang="ts">
defineProps<{
  /** Whether this item represents the current page */
  active?: boolean;
}>();
</script>

<template>
  <li
    class="coar-breadcrumb-item"
    :class="{ 'coar-breadcrumb-item--active': active }"
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </li>
</template>

<style scoped>
.coar-breadcrumb-item {
  display: inline-flex;
  align-items: center;
}

/* CSS custom properties inherit, so --coar-breadcrumb-separator set on the
   parent <nav> is accessible here even in scoped styles. */
.coar-breadcrumb-item + .coar-breadcrumb-item::before {
  content: var(--coar-breadcrumb-separator);
  color: var(--coar-breadcrumb-separator-color);
  margin-right: var(--coar-breadcrumb-separator-gap);
  user-select: none;
}

/* :deep() because <a> is slotted content from the parent and won't carry
   this component's scoped attribute. */
:deep(a) {
  color: var(--coar-breadcrumb-link-color);
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

.coar-breadcrumb-item--active {
  color: var(--coar-breadcrumb-active-color);
  font-weight: var(--coar-font-weight-medium);
}
</style>
