<script setup lang="ts">
// Markdown editor states that only exist inside a live editor, profile-neutral (profile
// class from an ancestor): the frontmatter NodeView, a code block NodeView (render mode;
// edit mode when the caret enters it), a registered `:::metric` embed NodeView, a GFM
// table (hover → TableHandles, grip → action menu), an author color span, the floating
// toolbar (on a text selection) and the image-upload spinner.
//
// Upload: `uploadImage` is the editor's real callback; this local one only waits on a
// promise that the "Upload abschließen" button resolves with an inline SVG data URL. No
// network. A paste or drop of an image file into the editor shows the spinner.
// The `metric` embed viewer is consumer content (the registry is the consumer's), kept
// to tokens so it reads in both profiles.
import { defineComponent, h, ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import { CoarMarkdownEditor, type EmbedRegistry } from '@cocoar/vue-markdown-editor';

const MetricEmbed = defineComponent({
  name: 'SceneMetricEmbed',
  props: { label: { type: String, default: '' }, value: { type: String, default: '' } },
  setup(props) {
    return () => h('div', {
      'data-scene-part': 'metric',
      style: 'display: inline-flex; gap: 8px; align-items: baseline; padding: 8px 12px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 6px; background: var(--coar-background-neutral-secondary)',
    }, [
      h('span', { style: 'color: var(--coar-text-neutral-secondary)' }, props.label),
      h('strong', props.value),
    ]);
  },
});
const embeds: EmbedRegistry = { metric: { viewer: MetricEmbed } };

const text = ref(`---
owner: Ada Lovelace
status: Draft
---

Absatz mit <span style="color: #2563eb">blauer Autorenfarbe</span> und **fettem** Text.

\`\`\`typescript
const total = items.reduce((sum, item) => sum + item.amount, 0);
\`\`\`

:::metric{label="Offen" value="12"}

Absatz nach dem Embed.

| Name | Status |
| --- | --- |
| Alpha | Offen |
| Beta | Erledigt |

Letzter Absatz für Einfügen und Auswahl.
`);

const pending: Array<() => void> = [];
const pendingCount = ref(0);
const IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24"><rect width="40" height="24" fill="#64748b"/></svg>',
)}`;
function uploadImage(file: File) {
  return new Promise<{ url: string; alt?: string }>((resolve) => {
    pending.push(() => resolve({ url: IMAGE, alt: file.name.replace(/\.[^.]+$/, '') }));
    pendingCount.value = pending.length;
  });
}
function finishUploads() {
  for (const resolve of pending.splice(0)) resolve();
  pendingCount.value = 0;
}
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Editor NodeViews, floating toolbar, table handles, upload</h2>
    <div data-scene-part="editor" style="height: 520px; border: 1px solid var(--coar-border-neutral)">
      <CoarMarkdownEditor v-model="text" flavor="cocoar" :embeds="embeds" :upload-image="uploadImage" />
    </div>
    <div class="vs-row" style="margin-top: 12px">
      <CoarButton data-scene-part="finish-upload" size="s" :disabled="pendingCount === 0" @click="finishUploads">
        Upload abschließen
      </CoarButton>
      <span data-scene-part="upload-pending">{{ pendingCount }} Upload(s) offen</span>
    </div>
  </section>
</template>
