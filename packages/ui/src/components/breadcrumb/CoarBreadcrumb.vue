<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Separator character between breadcrumb items */
    separator?: string;
  }>(),
  { separator: '/' },
);
</script>

<template>
  <nav
    class="coar-breadcrumb"
    aria-label="Breadcrumb"
    :style="{ '--coar-breadcrumb-separator': `'${separator}'` }"
  >
    <ol class="coar-breadcrumb-list">
      <slot />
    </ol>
  </nav>
</template>

<style scoped>
.coar-breadcrumb {
  display: block;
  font-size: var(--coar-breadcrumb-font-size, var(--coar-font-size-s, 14px));
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
}

.coar-breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--coar-breadcrumb-separator-gap, var(--coar-spacing-xs, 4px));
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>

<style>
/* Unscoped: styles for breadcrumb items (child component) */
.coar-breadcrumb-item {
  display: inline-flex;
  align-items: center;
}

.coar-breadcrumb-item + .coar-breadcrumb-item::before {
  content: var(--coar-breadcrumb-separator, '/');
  color: var(--coar-breadcrumb-separator-color, var(--coar-text-neutral-tertiary, #999));
  margin-right: var(--coar-breadcrumb-separator-gap, var(--coar-spacing-xs, 4px));
  user-select: none;
}

.coar-breadcrumb-item a {
  color: var(--coar-breadcrumb-link-color, var(--coar-text-neutral-secondary, #555));
  text-decoration: none;
}

.coar-breadcrumb-item a:hover {
  text-decoration: underline;
}

.coar-breadcrumb-item--active {
  color: var(--coar-breadcrumb-active-color, var(--coar-text-neutral-primary, #111));
  font-weight: 500;
}
</style>
