<script setup lang="ts">
/**
 * CoarNavbar: A horizontal navigation bar with three slots.
 *
 * - #start: Left section (logo, brand)
 * - #center: Center section (navigation links)
 * - #end: Right section (actions, user menu)
 *
 * Spacers between sections auto-distribute available space.
 */
withDefaults(
  defineProps<{
    /** Show subtle box-shadow elevation */
    elevated?: boolean;
    /** Show bottom border instead of shadow */
    bordered?: boolean;
  }>(),
  {
    elevated: true,
    bordered: false,
  },
);
</script>

<template>
  <header
    class="coar-navbar"
    :class="{
      'coar-navbar--elevated': elevated,
      'coar-navbar--bordered': bordered,
    }"
    role="banner"
  >
    <div v-if="$slots.start" class="coar-navbar__start">
      <slot name="start" />
    </div>
    <div class="coar-navbar__spacer" />
    <div v-if="$slots.center" class="coar-navbar__center">
      <slot name="center" />
    </div>
    <div class="coar-navbar__spacer" />
    <div v-if="$slots.end" class="coar-navbar__end">
      <slot name="end" />
    </div>
  </header>
</template>

<style scoped>
.coar-navbar {
  display: flex;
  align-items: center;
  height: var(--coar-navbar-height);
  padding: 0 var(--coar-navbar-padding-x);
  background: var(--coar-navbar-background);
}

.coar-navbar--elevated {
  box-shadow: var(--coar-elevation-low);
}

.coar-navbar--bordered {
  border-bottom: 1px solid var(--coar-navbar-border-color);
}

.coar-navbar__spacer {
  flex: 1 1 auto;
}

.coar-navbar__start {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.coar-navbar__center {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--coar-spacing-s);
}

.coar-navbar__end {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}
</style>
