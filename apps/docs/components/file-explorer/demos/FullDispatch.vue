<template>
  <ClientOnly>
    <component :is="Demo" v-if="Demo" />
    <div v-else class="fe-loading">Loading demo…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue';
const Demo = shallowRef<Component | null>(null);
onMounted(async () => {
  const [editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new tsWorkerMod.default();
      if (label === 'json') return new jsonWorkerMod.default();
      return new editorWorkerMod.default();
    },
  };
  const mod = await import('./_internal/FullDispatchImpl.vue');
  Demo.value = mod.default;
});
</script>

<style scoped>
.fe-loading {
  height: 560px;
  display: flex; align-items: center; justify-content: center;
  color: var(--coar-text-neutral-tertiary, #6b7280); font-size: 13px;
}
</style>
