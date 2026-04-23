<template>
  <ClientOnly>
    <div v-if="Editor && FormField && TextInput && Button" class="form-demo">
      <component :is="FormField" label="Title" :error="titleError" required>
        <component :is="TextInput" v-model="form.title" placeholder="My note" />
      </component>

      <component
        :is="FormField"
        label="Body"
        :error="bodyError"
        :disabled="locked"
        hint="Markdown — select text to format."
        required
      >
        <div class="md-frame">
          <component :is="Editor" v-model="form.body" />
        </div>
      </component>

      <div class="row">
        <component :is="Button" type="primary" @clicked="onSubmit">Save</component>
        <component :is="Button" @clicked="onReset">Reset</component>
        <label class="lock">
          <input v-model="locked" type="checkbox" /> lock (disabled)
        </label>
      </div>

      <pre class="preview">{{ preview }}</pre>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, type Component } from 'vue';

const form = reactive({
  title: '',
  body: '',
});
const locked = ref(false);

const titleError = computed(() => (form.title.length === 0 ? 'Required.' : ''));
const bodyError = computed(() =>
  form.body.trim().length === 0 ? 'Body cannot be empty.' : '',
);
const preview = computed(() => JSON.stringify(form, null, 2));

function onSubmit() {
  if (titleError.value || bodyError.value) return;
  // eslint-disable-next-line no-console
  console.log('submit', form);
}

function onReset() {
  form.title = '';
  form.body = '';
}

const Editor = shallowRef<Component | null>(null);
const FormField = shallowRef<Component | null>(null);
const TextInput = shallowRef<Component | null>(null);
const Button = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, ui] = await Promise.all([
    import('@cocoar/vue-markdown-editor'),
    import('@cocoar/vue-ui'),
  ]);
  Editor.value = mod.CoarMarkdownEditor;
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

.md-frame {
  height: 220px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  cursor: pointer;
}

.preview {
  background: var(--coar-background-neutral-secondary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  padding: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
  overflow: auto;
  margin: 0;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}
</style>
