<template>
  <ClientOnly>
    <div v-if="Editor && FormField && Button" class="form-demo">
      <component :is="FormField" label="Script name" :error="nameError" required>
        <component :is="TextInput" v-model="form.name" placeholder="mytask" />
      </component>

      <component :is="FormField" label="Handler script" :error="scriptError" hint="TypeScript body. `query` is pre-declared." required>
        <component
          :is="Editor"
          v-model="form.script"
          variant="inline"
          language="typescript"
          height="180px"
          placeholder="// return query.filter(...)"
          script-mode
          preamble="declare const query: TodoQuery;"
          :extra-libs="extraLibs"
        />
      </component>

      <div class="row">
        <component :is="Button" type="primary" @clicked="onSubmit">Save</component>
        <component :is="Button" @clicked="onReset">Reset</component>
      </div>

      <pre class="preview">{{ preview }}</pre>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, type Component } from 'vue';

const form = reactive({
  name: '',
  script: '',
});

const nameError = computed(() => (form.name.length === 0 ? 'Required.' : ''));
const scriptError = computed(() =>
  form.script.trim().length === 0 ? 'Provide a handler body.' : '',
);
const preview = computed(() => JSON.stringify(form, null, 2));

function onSubmit() {
  if (nameError.value || scriptError.value) return;
  // eslint-disable-next-line no-console
  console.log('submit', form);
}

function onReset() {
  form.name = '';
  form.script = '';
}

const extraLibs = [
  {
    filePath: 'file:///types/todo-query.d.ts',
    content: `
interface Todo { id: string; title: string; done: boolean; }
interface TodoQuery {
  filter(predicate: (todo: Todo) => boolean): Todo[];
  find(predicate: (todo: Todo) => boolean): Todo | undefined;
  map<T>(mapper: (todo: Todo) => T): T[];
}
    `.trim(),
  },
];

const Editor = shallowRef<Component | null>(null);
const FormField = shallowRef<Component | null>(null);
const TextInput = shallowRef<Component | null>(null);
const Button = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, ui, editorWorkerMod, tsWorkerMod, jsonWorkerMod] = await Promise.all([
    import('@cocoar/vue-script-editor'),
    import('@cocoar/vue-ui'),
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
  FormField.value = ui.CoarFormField;
  TextInput.value = ui.CoarTextInput;
  Button.value = ui.CoarButton;
});
</script>

<style scoped>
.form-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  gap: 8px;
}

.preview {
  background: var(--coar-surface-neutral-secondary, #f9fafb);
  border: 1px solid var(--coar-border-neutral-tertiary, #e5e7eb);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #4b5563);
  overflow: auto;
  margin: 0;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
