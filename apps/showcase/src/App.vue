<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CoarSidebar,
  CoarMenu,
  CoarMenuItem,
  CoarSubExpand,
  CoarButton,
  CoarOverlayHost,
} from '@cocoar/vue-ui';
import { NAV } from './router';

const route = useRoute();
const router = useRouter();
const darkMode = ref(false);

// Track open state per section; start all closed, open the active section on route change
const openSections = ref<Record<string, boolean>>(
  Object.fromEntries(NAV.filter(item => 'children' in item).map(item => [item.label, false])),
);

watch(
  () => route.path,
  (path) => {
    for (const item of NAV) {
      if ('children' in item) {
        if (item.children.some(c => c.path === path)) {
          openSections.value[item.label] = true;
        }
      }
    }
  },
  { immediate: true },
);

function toggleDark() {
  darkMode.value = !darkMode.value;
  document.documentElement.classList.toggle('dark-mode', darkMode.value);
}
</script>

<template>
  <div class="app-layout">
    <CoarSidebar class="app-sidebar">
      <!-- Logo -->
      <template #header>
        <RouterLink to="/" class="sidebar-header">
          <img
            src="https://cocoar-dev.github.io/cocoar-ui/logo-light.svg"
            alt="Cocoar Design System"
            class="sidebar-logo-img"
          />
        </RouterLink>
      </template>

      <!-- Navigation -->
      <CoarMenu borderless :showIcons="false">
        <template v-for="item in NAV" :key="item.label">
          <!-- Top-level link -->
          <template v-if="'path' in item">
            <CoarMenuItem
              :label="item.label"
              :class="{ 'nav-item--active': route.path === item.path }"
              @clicked="router.push(item.path)"
            />
          </template>

          <!-- Collapsible section with children -->
          <template v-else>
            <CoarSubExpand :label="item.label" v-model:open="openSections[item.label]">
              <CoarMenuItem
                v-for="child in item.children"
                :key="child.path"
                :label="child.label"
                :class="{ 'nav-item--active': route.path === child.path }"
                @clicked="router.push(child.path)"
              />
            </CoarSubExpand>
          </template>
        </template>
      </CoarMenu>

      <!-- Footer -->
      <template #footer>
        <div class="sidebar-footer">
          <CoarButton variant="ghost" size="s" :fullWidth="true" @clicked="toggleDark">
            {{ darkMode ? '☀️ Light' : '🌙 Dark' }}
          </CoarButton>
        </div>
      </template>
    </CoarSidebar>

    <!-- Main content -->
    <div class="main-wrapper">
      <main class="app-main">
        <RouterView />
      </main>
    </div>

    <CoarOverlayHost />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--coar-body-base-family), sans-serif;
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-base-weight);
  line-height: 1.6;
  color: var(--coar-text-neutral-primary);
  background: var(--coar-background-neutral-primary);
  -webkit-font-smoothing: antialiased;
}

#app { height: 100%; }

a { text-decoration: none; color: inherit; }

/* Active nav item — targets CoarMenuItem's root div via class fallthrough */
.nav-item--active {
  background: var(--coar-background-accent-tertiary) !important;
  color: var(--coar-text-accent-primary) !important;
}

.nav-item--active .coar-menu-item__label {
  color: var(--coar-text-accent-primary) !important;
  font-weight: var(--coar-body-base-bold-weight) !important;
}
</style>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

/* Override sidebar background to neutral-secondary and add right shadow */
.app-sidebar {
  width: 260px;
  min-width: 260px;
  height: 100vh;
  --coar-sidebar-background: var(--coar-background-neutral-secondary);
  --coar-sidebar-border: none;
  box-shadow: var(--coar-shadow-right);
  position: relative;
  z-index: 10;
}

.sidebar-header {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}

.sidebar-header:hover {
  background: var(--coar-background-neutral-tertiary);
}

.sidebar-logo-img {
  height: 52px;
  width: auto;
  display: block;
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Main content area — white background, scrollable */
.main-wrapper {
  flex: 1;
  background: var(--coar-background-neutral-primary);
  height: 100vh;
  overflow-y: auto;
}

.app-main {
  padding: 0 var(--coar-spacing-xl);
}
</style>
