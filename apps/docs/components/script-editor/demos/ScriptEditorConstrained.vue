<template>
  <ClientOnly>
    <div v-if="Editor" class="constrained-demo">
      <div class="toolbar">
        <label>
          <input v-model="authoring" type="checkbox" />
          Authoring mode — enforcement {{ authoring ? 'OFF' : 'ON' }}
        </label>
      </div>
      <component
        :is="Editor"
        v-model="code"
        :authoring="authoring"
        language="typescript"
        :extra-libs="extraLibs"
        style="height: 320px"
      />
      <details>
        <summary>Persisted value (<code>v-model</code>)</summary>
        <pre>{{ code }}</pre>
      </details>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

type ExtraLib = { content: string; filePath: string };

const code = ref(`declare interface Order {
  id: string;
  total: number;
  customer: { id: string; name: string };
}

function describeOrder(order: Order): string { // @locked
  return \`Order \${order.id} for \${order.customer.name}\`;
} // @locked

function orderTotal(orders: Order[]): number { // @locked
  return orders.reduce((sum, o) => sum + o.total, 0);
} // @locked
`);

const authoring = ref(false);

const extraLibs: ExtraLib[] = [
  {
    content: `declare interface Order {
  id: string;
  total: number;
  customer: { id: string; name: string };
}`,
    filePath: 'file:///types/order.d.ts',
  },
];

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
.constrained-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  border-radius: 4px;
}

.toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

details {
  font-size: 11px;
}

details pre {
  margin: 8px 0 0;
  padding: 8px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
