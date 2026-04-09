<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Height of the spacer (CSS value) */
    height?: string;
    /** If true, spacer grows to fill available space (flex: 1) */
    grow?: boolean;
  }>(),
  { height: undefined, grow: false },
);
</script>

<template>
  <div
    class="coar-sidebar-spacer"
    :class="{ 'coar-sidebar-spacer--grow': props.grow }"
    :style="props.height ? { height: props.height } : undefined"
    aria-hidden="true"
  />
</template>

<style scoped>
.coar-sidebar-spacer {
  flex-shrink: 0;
  height: var(--coar-spacing-m);
}

.coar-sidebar-spacer--grow {
  flex: 1;
  height: auto;
}
</style>
