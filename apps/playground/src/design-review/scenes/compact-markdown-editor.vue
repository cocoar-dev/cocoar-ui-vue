<script setup lang="ts">
// Markdown editor chrome, profile-neutral (the design-review gallery or a
// story wrapper puts `.coar-compact` / `.coar-mobile` on an ancestor): fixed
// toolbar, external toolbar of an editor group, empty-state placeholder.
// Fixed content, nothing focused.
import { ref } from 'vue';
import {
  CoarMarkdownEditor,
  CoarMarkdownEditorGroup,
  CoarMarkdownToolbar,
} from '@cocoar/vue-markdown-editor';

const content = `## Notes

Some **bold** text, \`code\` and a list:

- One
- Two

| Key | Value |
| --- | --- |
| A | 1 |
`;
const text = ref(content);
const group = ref('First editor of the group.');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Fixed toolbar (top)</h2>
    <div data-scene-part="fixed-editor" style="height: 300px; border: 1px solid var(--coar-border-neutral)">
      <CoarMarkdownEditor v-model="text" toolbar-mode="fixed" toolbar-position="top" flavor="gfm" />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Editor group with external toolbar, and the empty placeholder</h2>
    <div class="vs-stack" style="align-items: stretch">
      <CoarMarkdownEditorGroup>
        <CoarMarkdownToolbar position="top" />
        <div style="height: 80px; border: 1px solid var(--coar-border-neutral)">
          <CoarMarkdownEditor v-model="group" toolbar-mode="external" />
        </div>
      </CoarMarkdownEditorGroup>
      <div data-scene-part="empty-editor" style="height: 80px; border: 1px solid var(--coar-border-neutral)">
        <CoarMarkdownEditor model-value="" placeholder="Write **notes** here …" />
      </div>
    </div>
  </section>
</template>
