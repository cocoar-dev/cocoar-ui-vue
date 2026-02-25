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
