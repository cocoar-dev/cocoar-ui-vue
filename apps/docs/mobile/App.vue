<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CoarButton, CoarOverlayHost, CoarSwitch } from '@cocoar/vue-ui';
import { findDemo } from './demos';
import { embedded, scheme, setScheme } from './scheme';
import { useEmbeddedTheme } from './theme';

// An embedded demo shows the theme the docs' Theme Editor has loaded.
useEmbeddedTheme();

const route = useRoute();
const router = useRouter();

const demo = computed(() => findDemo(String(route.params.id ?? '')));
const dark = computed({
  get: () => scheme.value === 'dark',
  set: (value: boolean) => setScheme(value ? 'dark' : 'light'),
});

function back() {
  // Back in the history when the reader came from the home screen, else to it (a demo opened
  // by its address has nothing to go back to inside the app).
  if (window.history.state?.back) router.back();
  else router.push('/');
}
</script>

<template>
  <div class="m-app" :class="{ 'm-app--embedded': embedded }">
    <header v-if="!embedded" class="m-header">
      <CoarButton v-if="demo" variant="ghost" icon-start="chevron-left" @click="back">
        Back
      </CoarButton>
      <h1 class="m-header__title">{{ demo ? demo.title : 'Cocoar UI · Mobile' }}</h1>
      <div class="m-header__controls">
        <CoarSwitch v-model="dark" label="Dark" />
      </div>
    </header>
    <main class="m-main">
      <RouterView />
    </main>
  </div>
  <CoarOverlayHost />
</template>

<style>
html,
body {
  margin: 0;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}

a {
  color: var(--coar-text-accent-primary);
}
</style>

<style scoped>
.m-app {
  min-height: 100dvh;
}

.m-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: calc(env(safe-area-inset-top) + var(--coar-spacing-xs))
    calc(env(safe-area-inset-right) + var(--coar-spacing-m)) var(--coar-spacing-xs)
    calc(env(safe-area-inset-left) + var(--coar-spacing-m));
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
}

.m-header__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-header__controls {
  display: flex;
  flex: 1 0 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-s);
}

.m-main {
  padding: var(--coar-spacing-l) calc(env(safe-area-inset-right) + var(--coar-spacing-l))
    calc(env(safe-area-inset-bottom) + var(--coar-spacing-xl))
    calc(env(safe-area-inset-left) + var(--coar-spacing-l));
}
</style>
