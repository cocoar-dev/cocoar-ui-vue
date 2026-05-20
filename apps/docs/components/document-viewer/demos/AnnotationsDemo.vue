<template>
  <ClientOnly>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 13px;">
        <span style="color: var(--vp-c-text-2);">Mode: <strong>{{ annotationMode }}</strong></span>
        <span style="color: var(--vp-c-text-2);">Annotations: <strong>{{ annotations.length }}</strong></span>
        <button
          type="button"
          :disabled="annotations.length === 0"
          style="font-size: 12px; padding: 2px 8px; border-radius: 4px; cursor: pointer;"
          @click="annotations = []"
        >Clear all</button>
      </div>
      <div style="height: 520px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden;">
        <component
          :is="Viewer"
          v-if="Viewer && source"
          :source="source"
          v-model:annotation-mode="annotationMode"
          :annotations="annotations"
          :show-annotations-panel="true"
          @annotation:create="onCreate"
          @annotation:update="onUpdate"
          @annotation:delete="onDelete"
        />
        <div v-else class="dv-loading">Loading viewer…</div>
      </div>
      <p style="font-size: 12px; color: var(--vp-c-text-2); margin: 0;">
        Pick a drawing mode (marker / note / draw / text) in the toolbar, then
        interact with the image. The consumer owns the annotations array; the
        viewer emits create/update/delete and the parent assigns IDs.
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, type Component } from 'vue';
import { SINGLE_IMAGE_URL } from './_shared';

// Loose runtime types — full types are imported at code-block level on the
// annotations.md page itself. SSR has to skip the package entirely (it pulls
// browser-only DOM APIs at module eval time).
type Anno = { id: string; type: string; pageIndex: number; color: string; createdAt: string; comment?: string } & Record<string, unknown>;
type CreatePayload = Omit<Anno, 'id' | 'createdAt'>;
type UpdatePayload = { id: string; patch: Partial<Anno> };

const Viewer = shallowRef<Component | null>(null);
const imageSource = shallowRef<((opts: { url: string }) => unknown) | null>(null);

const source = computed(() => imageSource.value?.({ url: SINGLE_IMAGE_URL }) ?? null);
const annotationMode = ref<'view' | 'select' | 'eraser' | 'marker' | 'comment' | 'ink' | 'freetext'>('view');
const annotations = ref<Anno[]>([]);

let nextId = 1;
function makeId() {
  return `demo-${Date.now()}-${nextId++}`;
}

function onCreate(payload: CreatePayload) {
  annotations.value = [
    ...annotations.value,
    { ...payload, id: makeId(), createdAt: new Date().toISOString() } as Anno,
  ];
}

function onUpdate(payload: UpdatePayload) {
  annotations.value = annotations.value.map((a) =>
    a.id === payload.id ? ({ ...a, ...payload.patch } as Anno) : a,
  );
}

function onDelete(id: string) {
  annotations.value = annotations.value.filter((a) => a.id !== id);
}

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
