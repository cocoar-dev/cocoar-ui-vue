<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        toolbar-mode="both"
        :upload-image="uploadImage"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Click the <strong>Insert Image</strong> button in the sidebar to add one by URL,
      or <strong>paste / drag &amp; drop</strong> an image file straight into the editor.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Images

Markdown images round-trip as \`![alt](url)\`:

![A scenic placeholder](https://picsum.photos/seed/cocoar/640/360 "Hover title")

Try inserting your own below.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});

/**
 * Demo uploader: reads the file as a base64 data URL so the demo works fully
 * offline with no backend. A real app would POST the file to its asset service
 * and return the hosted URL instead.
 */
function uploadImage(file: File): Promise<{ url: string; alt?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string, alt: file.name });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.md-frame {
  height: 420px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
