<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  SHELL_THEME_CLASS, SHELL_THEME_EVENT, SHELL_THEME_KEY, setShellThemed, shellThemed,
} from '../../shell-theme.mjs';

// Match the server render; the head script has already set the class before the first paint.
const on = ref(false);
const sync = () => { on.value = shellThemed(); };
const onStorage = (event: StorageEvent) => {
  if (event.key !== SHELL_THEME_KEY && event.key !== null) return;
  document.documentElement.classList.toggle(SHELL_THEME_CLASS, event.newValue === 'on');
  sync();
};
onMounted(() => {
  sync();
  window.addEventListener(SHELL_THEME_EVENT, sync);
  window.addEventListener('storage', onStorage);
});
onBeforeUnmount(() => {
  window.removeEventListener(SHELL_THEME_EVENT, sync);
  window.removeEventListener('storage', onStorage);
});
</script>

<template>
  <label
    class="docs-shell-theme"
    title="The navigation, sidebar and text of these docs take the fonts and colours of the theme. The components follow the Theme Editor either way."
  >
    <input
      type="checkbox"
      :checked="on"
      @change="setShellThemed(($event.target as HTMLInputElement).checked)"
    />
    <span>Themed docs</span>
  </label>
</template>

<style scoped>
.docs-shell-theme {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.docs-shell-theme input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}
.docs-shell-theme input:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.VPNavBar .docs-shell-theme {
  margin-left: 12px;
}
.VPNavScreen .docs-shell-theme {
  display: flex;
  min-height: 44px;
  margin-top: 24px;
  font-size: 16px;
}
.VPNavScreen .docs-shell-theme input {
  width: 20px;
  height: 20px;
}
@media (max-width: 1279px) {
  .VPNavBar .docs-shell-theme {
    display: none;
  }
}
</style>
