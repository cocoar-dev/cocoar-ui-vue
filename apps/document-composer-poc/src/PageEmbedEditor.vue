<script setup lang="ts">
import { computed } from 'vue';
import type { EmbedEditorProps } from '@cocoar/vue-markdown';
import {
  latestVersion,
  pageById,
  pageVersion,
  requestPageReference,
  requestedBuilderPageId,
} from './page-store';

type PageEmbedAttrs = { id: string; page: string; version: string };
const props = defineProps<EmbedEditorProps<PageEmbedAttrs>>();

const record = computed(() => pageById(props.controller.props.page));
const version = computed(() => pageVersion(props.controller.props.page, props.controller.props.version));
const latest = computed(() => latestVersion(props.controller.props.page));

function countFields(): number {
  let count = 0;
  const walk = (node: { type?: string; children?: unknown[] }) => {
    if (node.type === 'cocoar-markdown-field') count += 1;
    node.children?.forEach((child) => walk(child as { type?: string; children?: unknown[] }));
  };
  if (version.value) walk(version.value.schema);
  return count;
}

async function replaceReference(): Promise<void> {
  const next = await requestPageReference(props.controller.props.id);
  if (next) props.controller.update(next as PageEmbedAttrs);
}
</script>

<template>
  <article class="page-reference" :class="{ 'page-reference--missing': !record || !version }">
    <div class="page-reference__mark" aria-hidden="true">P</div>
    <div class="page-reference__copy">
      <div class="page-reference__eyebrow">Page reference · {{ controller.props.id }}</div>
      <strong>{{ record?.name ?? 'Missing page' }}</strong>
      <span v-if="version">Version {{ version.version }} · {{ countFields() }} Markdown fields</span>
      <span v-else>Die referenzierte Version ist nicht verfügbar.</span>
    </div>
    <div class="page-reference__actions">
      <button type="button" @click="replaceReference">Replace</button>
      <button v-if="record" type="button" @click="requestedBuilderPageId = record.id">Open page</button>
      <button
        v-if="latest && latest.version !== controller.props.version"
        type="button"
        class="page-reference__update"
        @click="controller.patch({ version: latest.version })"
      >
        Update to v{{ latest.version }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.page-reference {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid #b9c9bc;
  border-left: 4px solid #55705a;
  border-radius: 8px;
  background: #f2f6f1;
  color: #202522;
}

.page-reference--missing { border-color: #d2a36d; background: #fff8ef; }
.page-reference__mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 7px; background: #55705a; color: white; font-weight: 700; }
.page-reference__copy { display: grid; gap: 2px; min-width: 0; }
.page-reference__copy span { color: #627069; font-size: 12px; }
.page-reference__eyebrow { color: #55705a; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.page-reference__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.page-reference button { padding: 6px 9px; border: 1px solid #bdc7bf; border-radius: 6px; background: white; color: #334139; font: inherit; font-size: 12px; cursor: pointer; }
.page-reference button:hover { border-color: #55705a; }
.page-reference__update { color: #47697a !important; }
@media (max-width: 700px) { .page-reference { grid-template-columns: 40px 1fr; } .page-reference__actions { grid-column: 1 / -1; justify-content: flex-start; } }
</style>
