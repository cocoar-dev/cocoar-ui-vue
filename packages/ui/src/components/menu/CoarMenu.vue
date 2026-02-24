<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { MenuCascade, provideMenuCascade, useMenuCascade } from './menu-cascade';

const props = withDefaults(
  defineProps<{
    /** Reserve icon column to prevent layout shift. Default: true */
    showIconColumn?: boolean;
    /** Remove border/background/shadow for seamless embedding. */
    borderless?: boolean;
  }>(),
  { showIconColumn: true, borderless: false },
);

const parentCascade = useMenuCascade();
const cascade = new MenuCascade(parentCascade ?? null);
provideMenuCascade(cascade);

onBeforeUnmount(() => {
  cascade.destroy();
});
</script>

<template>
  <div
    role="menu"
    class="coar-menu"
    :class="{ 'coar-menu--borderless': props.borderless }"
    :style="{
      '--coar-menu-icon-slot-display': props.showIconColumn ? undefined : 'none',
      '--coar-menu-item-icon-slot-size': props.showIconColumn ? undefined : '0px',
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.coar-menu {
  display: inline-flex;
  flex-direction: column;
  min-width: var(--coar-menu-min-width, 12rem);
  max-width: var(--coar-menu-max-width, 20rem);
  gap: 0;
  background: var(--coar-background-neutral-primary, #f8f9fa);
  border: 1px solid var(--coar-border-neutral-tertiary, #d0d0d0);
  border-radius: var(--coar-radius-s, 4px);
  overflow: hidden;
  box-shadow: var(--coar-shadow-s, none);
}

.coar-menu--borderless {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-width: unset;
  max-width: unset;
}
</style>
