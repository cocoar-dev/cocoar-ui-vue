<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        toolbar-mode="both"
        :pick-image="openGallery"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Click <strong>Insert Image</strong> in the sidebar — instead of the built-in URL dialog,
      a custom “gallery” opens. Pick one or more; the modal stays open so you can insert several.
    </p>

    <!-- The consumer's own gallery modal — entirely app-owned. -->
    <div v-if="galleryOpen" class="gallery-backdrop" @click.self="closeGallery">
      <div class="gallery">
        <header class="gallery__head">
          <strong>Tellify gallery</strong>
          <button class="gallery__x" @click="closeGallery" aria-label="Close">✕</button>
        </header>
        <div class="gallery__grid">
          <button
            v-for="img in assets"
            :key="img.url"
            class="gallery__item"
            @click="pick(img)"
          >
            <img :src="img.url" :alt="img.alt" />
            <span>{{ img.alt }}</span>
          </button>
        </div>
        <footer class="gallery__foot">
          <label class="gallery__upload">
            Upload…
            <input type="file" accept="image/*" hidden @change="onUpload" />
          </label>
          <button class="gallery__done" @click="closeGallery">Done</button>
        </footer>
      </div>
    </div>

    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

interface Asset { url: string; alt: string }
// Stand-in for what a real gallery API would return.
const assets: Asset[] = [
  { url: 'https://picsum.photos/seed/alpha/320/200', alt: 'Alpha' },
  { url: 'https://picsum.photos/seed/bravo/320/200', alt: 'Bravo' },
  { url: 'https://picsum.photos/seed/charlie/320/200', alt: 'Charlie' },
  { url: 'https://picsum.photos/seed/delta/320/200', alt: 'Delta' },
];

const value = ref(`# Gallery picker

Click **Insert Image** to choose from the gallery.
`);

const Editor = shallowRef<Component | null>(null);
onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});

// pickImage hands us a context bound to the cursor. We stash it, open our
// modal, and call ctx.insertImage(...) for each chosen asset — the modal can
// stay open and insert several.
type PickContext = { insertImage: (img: { url: string; alt?: string }) => void; selectedText: string };
const galleryOpen = ref(false);
let ctx: PickContext | null = null;

function openGallery(c: PickContext) {
  ctx = c;
  galleryOpen.value = true;
}
function closeGallery() {
  galleryOpen.value = false;
  ctx = null;
}
function pick(img: Asset) {
  ctx?.insertImage({ url: img.url, alt: img.alt });
}
function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => ctx?.insertImage({ url: reader.result as string, alt: file.name });
  reader.readAsDataURL(file);
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
.md-frame__loading { padding: 24px; text-align: center; color: var(--coar-text-neutral-tertiary); font-size: 13px; }
.md-hint { margin-top: 10px; font-size: 13px; color: var(--coar-text-neutral-secondary); }

.gallery-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
}
.gallery {
  width: min(560px, 92vw);
  background: var(--coar-background-neutral-primary);
  border-radius: var(--coar-radius-xl);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.gallery__head, .gallery__foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
}
.gallery__head { border-bottom: 1px solid var(--coar-border-neutral); }
.gallery__foot { border-top: 1px solid var(--coar-border-neutral); }
.gallery__x { background: none; border: none; cursor: pointer; font-size: 16px; }
.gallery__grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 16px;
}
.gallery__item {
  display: flex; flex-direction: column; gap: 4px; padding: 0;
  background: none; border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-l); overflow: hidden; cursor: pointer;
  font-size: 12px;
}
.gallery__item:hover { border-color: var(--coar-border-interactive, #888); }
.gallery__item img { width: 100%; height: 100px; object-fit: cover; display: block; }
.gallery__item span { padding: 4px 8px; }
.gallery__upload { cursor: pointer; font-size: 13px; text-decoration: underline; }
.gallery__done {
  background: var(--coar-background-interactive-bold, #2563eb); color: #fff;
  border: none; border-radius: var(--coar-radius-l); padding: 6px 14px; cursor: pointer;
}

.md-output { margin-top: 12px; }
.md-output summary { cursor: pointer; font-size: 13px; font-weight: 600; }
.md-output pre {
  margin-top: 8px; padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl); font-size: 12px;
  max-height: 200px; overflow: auto; white-space: pre-wrap;
}
</style>
