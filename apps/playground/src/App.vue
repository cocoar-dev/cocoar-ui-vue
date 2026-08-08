<script setup lang="ts">
import { CoarOverlayHost } from '@cocoar/vue-ui';
import CoarThemeEditor from '@cocoar/vue-ui/theme-editor';
</script>

<template>
  <div class="app">
    <nav class="app-nav">
      <router-link to="/">Home</router-link>
      <router-link to="/todos">Todos</router-link>
      <router-link to="/flex-debug">Flex Debug</router-link>
      <router-link to="/script-editor">Script Editor</router-link>
      <router-link to="/constrained-editor">Constrained Editor</router-link>
      <router-link to="/editor-in-modal">Editor in Modal</router-link>
      <router-link to="/page-builder">Page Builder</router-link>
      <router-link to="/auth-customization-lab">Auth Lab</router-link>
      <router-link to="/page-builder-scripting-spike">Scripting Spike</router-link>
      <router-link to="/file-explorer-poc">File Explorer POC</router-link>
      <router-link to="/panel-layout">Panel Layout</router-link>
    </nav>
    <main class="app-main">
      <router-view />
    </main>
    <CoarOverlayHost />
    <CoarThemeEditor />
  </div>
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: 100vh;
  /* Inherit the body font (Poppins) from `@cocoar/vue-ui/styles`. The
     previous `var(--coar-font-family, sans-serif)` referenced a token that
     doesn't exist in the design system, so it always fell back to the bare
     `sans-serif` and broke Poppins inheritance for everything inside the
     app — including the markdown editor's body text. */
  font-family: var(--coar-body-base-family);
}

.app-nav {
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--coar-border-neutral, #e0e0e0);
  background: var(--coar-surface-default, #fff);
  white-space: nowrap;
}

.app-nav a {
  color: var(--coar-text-accent, #0066cc);
  text-decoration: none;
}

.app-nav a.router-link-active {
  font-weight: 600;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 24px;
  overflow: auto;
}
</style>
