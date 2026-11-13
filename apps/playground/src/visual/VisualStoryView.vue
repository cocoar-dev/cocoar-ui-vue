<script setup lang="ts">
/**
 * Renders one visual-baseline story alone, for `apps/playground/visual/visual.spec.ts`.
 *
 *   /visual.html#/visual/<story>?mode=default|mobile&scheme=light|dark
 *
 * The page is its own entry (visual.html, ./main.ts): nothing of the playground,
 * and the opt-ins sit on `<html>` exactly where an app puts them. Without `mode=mobile`
 * and `scheme=dark`, `<html>` is left as an app without any opt-in has it.
 */
import { markRaw, nextTick, onBeforeUnmount, ref, shallowRef, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import {
  mobileOnHtml,
  storyProblems,
  visualModes,
  visualSchemes,
  visualStories,
  type VisualMode,
  type VisualScheme,
  type VisualStory,
} from './manifest';
import './story.css';

const storyFiles = import.meta.glob<{ default: Component }>('./stories/*.vue');

const route = useRoute();
const story = shallowRef<Component | null>(null);
const rootEl = ref<HTMLElement | null>(null);
// The spec waits for `ready` or `error`; anything else means "not yet".
const state = ref<'loading' | 'ready' | 'error'>('loading');
const error = ref('');
// `page` gives the page the library's background (story.css).
const capture = ref<'root' | 'page'>('root');

const htmlClasses = { mobile: 'coar-mobile', dark: 'dark-mode' } as const;

function applyHtmlClasses(entry: VisualStory, mode: VisualMode, scheme: VisualScheme) {
  const html = document.documentElement;
  // A story with `scope: 'local'` puts `coar-mobile` on its own container.
  html.classList.toggle(htmlClasses.mobile, mobileOnHtml(entry, mode));
  html.classList.toggle(htmlClasses.dark, scheme === 'dark');
}

function fail(message: string) {
  story.value = null;
  error.value = message;
  state.value = 'error';
}

let loadId = 0;
async function load() {
  const id = ++loadId;
  state.value = 'loading';
  error.value = '';
  const name = String(route.params.story ?? '');
  const mode = String(route.query.mode ?? 'default') as VisualMode;
  const scheme = String(route.query.scheme ?? 'light') as VisualScheme;

  if (!visualModes.includes(mode))
    return fail(`unknown mode "${mode}": ${visualModes.join(' | ')}`);
  if (!visualSchemes.includes(scheme))
    return fail(`unknown scheme "${scheme}": ${visualSchemes.join(' | ')}`);
  const entry = visualStories.find((s) => s.name === name);
  if (!entry) return fail(`story "${name}" is not in stories.json`);
  const problems = storyProblems(entry);
  if (problems.length) return fail(problems.join('\n'));
  const loader = storyFiles[`./stories/${name}.vue`];
  if (!loader) return fail(`story "${name}" has no file stories/${name}.vue`);

  applyHtmlClasses(entry, mode, scheme);
  capture.value = entry.capture ?? 'root';
  const component = markRaw((await loader()).default);
  if (id !== loadId) return;
  story.value = component;

  // Mounted and painted once, so every font face the story uses has been
  // requested; then wait until those faces have loaded.
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await document.fonts.ready;
  if (id !== loadId) return;
  if (entry.scope === 'local' && !rootEl.value?.querySelector('.coar-mobile')) {
    return fail(`story "${name}" has scope "local" but no .coar-mobile container of its own`);
  }
  state.value = 'ready';
}

watch(() => route.fullPath, load, { immediate: true });

onBeforeUnmount(() => {
  document.documentElement.classList.remove(htmlClasses.mobile, htmlClasses.dark);
});
</script>

<template>
  <div
    ref="rootEl"
    class="visual-root"
    data-visual-root
    :data-visual-story="route.params.story"
    :data-visual-state="state"
    :data-visual-capture="capture"
  >
    <component :is="story" v-if="story" />
    <p v-else-if="error" class="visual-error">{{ error }}</p>
  </div>
</template>

<style scoped>
/* A fixed box, so an element screenshot has the same size on every machine. */
.visual-root {
  box-sizing: border-box;
  width: 760px;
  padding: 24px;
  display: flow-root;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}

.visual-error {
  white-space: pre-line;
  color: var(--coar-text-semantic-error-primary, red);
  font-weight: 600;
}
</style>
