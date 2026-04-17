<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarScriptEditor,
  type CoarScriptEditorExtraLib,
} from '@cocoar/vue-script-editor';

const code = ref(`// Place cursor after \`ctx.\` and press Ctrl+Space.
// The autocompletion popup should appear right next to the cursor —
// not offscreen, not behind the modal.

function process(ctx: AppContext) {
  const x = ctx.
}
`);

const extraLibs: CoarScriptEditorExtraLib[] = [
  {
    content: `declare interface AppContext {
  user: { id: string; name: string; email: string };
  tenant: { id: string; name: string; plan: 'free' | 'pro' | 'enterprise' };
  request: { method: string; path: string; headers: Record<string, string> };
}`,
    filePath: 'file:///types/app-context.d.ts',
  },
];
</script>

<template>
  <div class="modal-body">
    <p class="hint">
      Try: hover over <code>AppContext</code>, then place cursor after <code>ctx.</code> and
      press <kbd>Ctrl+Space</kbd>.
    </p>
    <div class="editor-wrap">
      <CoarScriptEditor
        v-model="code"
        language="typescript"
        :extra-libs="extraLibs"
      />
    </div>
  </div>
</template>

<style scoped>
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 400px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary, #4b5563);
}

.hint code {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 1px 6px;
  border-radius: 3px;
}

.editor-wrap {
  flex: 1;
  min-height: 360px;
}
</style>
