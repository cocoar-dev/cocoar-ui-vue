<template>
  <ClientOnly>
    <div style="height: 520px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden;">
      <component
        :is="Viewer"
        v-if="Viewer && source"
        :source="source"
        :tools="MINIMAL_TOOLS"
      />
      <div v-else class="dv-loading">Loading viewer…</div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, type Component } from 'vue';
import { GALLERY_URLS } from './_shared';

/**
 * Order-driven `tools` prop. Leading + trailing separators are auto-trimmed
 * and consecutive separators collapse to one — see Toolbar customization.
 */
const MINIMAL_TOOLS = [
  'prev-page',
  'page-input',
  'next-page',
  'separator',
  'zoom-out',
  'zoom-reset',
  'zoom-in',
] as const;

const Viewer = shallowRef<Component | null>(null);
const galleryFactory = shallowRef<((opts: { urls: readonly string[] }) => unknown) | null>(null);

const source = computed(() => galleryFactory.value?.({ urls: GALLERY_URLS }) ?? null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-document-viewer');
  await import('@cocoar/vue-document-viewer/styles');
  galleryFactory.value = mod.imageGallerySource;
  Viewer.value = mod.CoarDocumentViewer;
});
</script>

<style scoped>
.dv-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coar-text-neutral-tertiary, #6b7280);
  font-size: 13px;
}
</style>
