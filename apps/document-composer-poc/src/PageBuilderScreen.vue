<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarPageBuilder, type PageNode } from '@cocoar/vue-page-builder';
import { pageById, publishPage } from './page-store';
import { pageConfig } from './page-config';

const props = defineProps<{ pageId: string }>();
defineEmits<{ back: [] }>();

const record = computed(() => pageById(props.pageId));
const draft = computed<PageNode>({
  get: () => record.value!.draft,
  set: (value) => { if (record.value) record.value.draft = value; },
});
const published = ref<string | null>(null);

function publish(): void {
  published.value = publishPage(props.pageId) ?? null;
  window.setTimeout(() => { published.value = null; }, 2800);
}
</script>

<template>
  <section v-if="record" class="builder-screen">
    <header class="builder-header">
      <button type="button" class="back-button" @click="$emit('back')">← Pages</button>
      <div>
        <span>Page draft</span>
        <strong>{{ record.name }}</strong>
      </div>
      <div class="builder-header__actions">
        <small>Latest published: v{{ record.versions.at(-1)?.version }}</small>
        <button type="button" class="primary-button" @click="publish">Publish new version</button>
      </div>
    </header>
    <div v-if="published" class="publish-toast">Published version {{ published }}. Existing embeds remain pinned.</div>
    <div class="builder-host">
      <CoarPageBuilder v-model="draft" :config="pageConfig" authoring-mode="properties" />
    </div>
  </section>
</template>
