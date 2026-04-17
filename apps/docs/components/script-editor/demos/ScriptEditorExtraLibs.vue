<template>
  <ClientOnly>
    <component
      :is="Editor"
      v-if="Editor"
      v-model="code"
      language="typescript"
      :extra-libs="extraLibs"
      style="height: 360px"
    />
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

type ExtraLib = { content: string; filePath: string };

const extraLibs: ExtraLib[] = [
  {
    content: `declare interface AppContext {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string; plan: 'free' | 'pro' | 'enterprise' };
}

declare function getContext(): AppContext;
`,
    filePath: 'file:///types/app-context.d.ts',
  },
];

const code = ref(`// Try typing \`ctx.\` to get autocompletion from the injected types.
const ctx = getContext();
const greeting = \`Welcome \${ctx.user.name} from \${ctx.tenant.name}\`;
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
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
  Editor.value = mod.CoarScriptEditor;
});
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
