<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
  CoarScriptEditor,
  getEditableSegments,
  type CoarScriptEditorExtraLib,
  type CoarScriptEditorRejectReason,
} from '@cocoar/vue-script-editor';

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

const extraLibs: CoarScriptEditorExtraLib[] = [
  {
    content: `declare interface Order {
  id: string;
  total: number;
  customer: { id: string; name: string };
}`,
    filePath: 'file:///types/order.d.ts',
  },
];

const rejections = ref<Array<{ at: number; reason: CoarScriptEditorRejectReason }>>([]);
const segments = computed(() => getEditableSegments(code.value));

function onReject(event: { reason: CoarScriptEditorRejectReason }) {
  rejections.value = [{ at: Date.now(), reason: event.reason }, ...rejections.value].slice(0, 5);
}

// --- E2E test hooks -----------------------------------------------------------------
// Playground-only helpers so Playwright can read + drive state without reaching into
// Monaco's internals. Attached on mount, removed on unmount. Not a production concern —
// playground is a dev tool.
const editorRef = useTemplateRef<InstanceType<typeof CoarScriptEditor>>('editor');

interface PlaygroundHooks {
  getValue: () => string;
  setValue: (value: string) => void;
  getRejections: () => ReadonlyArray<{ reason: CoarScriptEditorRejectReason }>;
  clearRejections: () => void;
  setAuthoring: (u: boolean) => void;
  getCursor: () => { lineNumber: number; column: number } | null;
  setCursor: (lineNumber: number, column: number) => void;
  focusEditor: () => void;
  /** Inject an edit directly via Monaco, bypassing keyboard + cursor guard. */
  executeEdit: (startLine: number, startCol: number, endLine: number, endCol: number, text: string) => void;
}

onMounted(() => {
  (window as unknown as { __playground?: PlaygroundHooks }).__playground = {
    getValue: () => code.value,
    setValue: (value) => {
      code.value = value;
    },
    getRejections: () => rejections.value.map((r) => ({ reason: r.reason })),
    clearRejections: () => {
      rejections.value = [];
    },
    setAuthoring: (u) => {
      authoring.value = u;
    },
    getCursor: () => {
      const ed = editorRef.value?.getEditor();
      const pos = ed?.getPosition();
      if (!pos) return null;
      return { lineNumber: pos.lineNumber, column: pos.column };
    },
    setCursor: (lineNumber, column) => {
      const ed = editorRef.value?.getEditor();
      ed?.setPosition({ lineNumber, column });
      ed?.focus();
    },
    focusEditor: () => {
      editorRef.value?.getEditor()?.focus();
    },
    executeEdit: (startLine, startCol, endLine, endCol, text) => {
      const ed = editorRef.value?.getEditor();
      if (!ed) return;
      ed.executeEdits('playground-test', [
        {
          range: {
            startLineNumber: startLine,
            startColumn: startCol,
            endLineNumber: endLine,
            endColumn: endCol,
          },
          text,
          forceMoveMarkers: false,
        },
      ]);
    },
  };
});

onBeforeUnmount(() => {
  delete (window as unknown as { __playground?: PlaygroundHooks }).__playground;
});
</script>

<template>
  <div class="constrained-view">
    <div class="main">
      <div class="toolbar">
        <label>
          <input v-model="authoring" type="checkbox" data-testid="authoring-toggle" />
          <strong>Authoring mode</strong> — lock enforcement {{ authoring ? 'OFF' : 'ON' }}
        </label>
      </div>

      <div class="editor-wrap" data-testid="editor-wrap">
        <CoarScriptEditor
          ref="editor"
          v-model="code"
          :authoring="authoring"
          language="typescript"
          :extra-libs="extraLibs"
          @reject="onReject"
        />
      </div>
    </div>

    <aside class="side">
      <section>
        <h3>
          <code>v-model</code> — persisted as-is
        </h3>
        <pre data-testid="value-display">{{ code }}</pre>
      </section>
      <section>
        <h3>Editable segments (between locked lines)</h3>
        <ol>
          <li v-for="(seg, i) in segments" :key="i">
            <code>{{ JSON.stringify(seg) }}</code>
          </li>
        </ol>
      </section>
      <section v-if="rejections.length">
        <h3>Rejected edits</h3>
        <ul data-testid="rejections">
          <li v-for="r in rejections" :key="r.at">{{ r.reason }}</li>
        </ul>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.constrained-view {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 16px;
  height: 100%;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  padding: 8px 12px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  border-radius: 4px;
  font-size: 13px;
}

.toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.editor-wrap {
  flex: 1;
  min-height: 400px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
}

.side section {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 12px;
  border-radius: 4px;
}

.side h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.side pre {
  margin: 0;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
}

.side ul,
.side ol {
  margin: 0;
  padding-left: 20px;
  font-size: 11px;
}

.side li {
  margin-bottom: 4px;
  word-break: break-word;
}
</style>
