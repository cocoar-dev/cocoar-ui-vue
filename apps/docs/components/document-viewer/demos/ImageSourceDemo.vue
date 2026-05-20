<template>
  <ClientOnly>
    <div style="height: 520px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden;">
      <component
        :is="Viewer"
        v-if="Viewer && source"
        :source="source"
        :show-thumbnails="true"
        :show-annotations-panel="true"
      />
      <div v-else class="dv-loading">Loading viewer…</div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, type Component } from 'vue';
import { SINGLE_IMAGE_URL } from './_shared';

const Viewer = shallowRef<Component | null>(null);
const imageSource = shallowRef<((opts: { url: string }) => unknown) | null>(null);

const source = computed(() => imageSource.value?.({ url: SINGLE_IMAGE_URL }) ?? null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-document-viewer');
  await import('@cocoar/vue-document-viewer/styles');
  imageSource.value = mod.imageSource;
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
