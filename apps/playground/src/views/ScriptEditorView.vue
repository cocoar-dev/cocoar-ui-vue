<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import {
  CoarScriptEditor,
  type CoarScriptEditorExtraLib,
  type CoarScriptEditorLanguage,
} from '@cocoar/vue-script-editor';

const code = ref(`// Try autocompleting \`ctx.\` — the types below are injected via extraLibs.
function greet(ctx: AppContext) {
  return \`Hello, \${ctx.user.name}\`;
}
`);

const language = ref<CoarScriptEditorLanguage>('typescript');
const readonly = ref(false);

// Simulate an app-level dark-mode switcher by toggling `.dark-mode` on <html>. The editor's
// `theme="auto"` will pick it up reactively via MutationObserver.
const appDark = ref(false);
watch(appDark, (v) => {
  document.documentElement.classList.toggle('dark-mode', v);
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove('dark-mode');
});

const extraLibs: CoarScriptEditorExtraLib[] = [
  {
    content: `declare interface AppContext {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string };
}
`,
    filePath: 'file:///types/app-context.d.ts',
  },
];
</script>

<template>
  <div class="script-editor-view">
    <div class="toolbar">
      <label>
        Language:
        <select v-model="language">
          <option value="typescript">TypeScript</option>
          <option value="javascript">JavaScript</option>
          <option value="json">JSON</option>
        </select>
      </label>
      <label>
        <input v-model="readonly" type="checkbox" />
        Read-only
      </label>
      <label>
        <input v-model="appDark" type="checkbox" />
        App dark-mode (toggles <code>.dark-mode</code> on &lt;html&gt;)
      </label>
    </div>

    <div class="editor-wrap">
      <CoarScriptEditor
        v-model="code"
        :language="language"
        :readonly="readonly"
        :extra-libs="extraLibs"
      />
    </div>

    <details>
      <summary>Current value</summary>
      <pre>{{ code }}</pre>
    </details>
  </div>
</template>

<style scoped>
.script-editor-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.editor-wrap {
  flex: 1;
  min-height: 400px;
}

pre {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
