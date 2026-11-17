<script setup lang="ts">
// The markdown editor's internal panels, mounted inline with fixed data (they
// are normally opened through the overlay service or the dialog service, or
// appear only while the caret is in a code block): table size picker, color
// picker, image dialog body and the code-block shell in edit mode.
// Profile-neutral: the profile class comes from an ancestor (gallery or story
// wrapper). A real editor sits above them: the panels only ever exist while one
// is mounted, and it brings the editor stylesheet the panels' roles are defined in.
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import TableSizePicker from '../../../../../packages/markdown-editor/src/table/TableSizePicker.vue';
import ColorPickerPanel from '../../../../../packages/markdown-editor/src/text-color/ColorPickerPanel.vue';
import ImageInsertDialog from '../../../../../packages/markdown-editor/src/image/ImageInsertDialog.vue';
import CodeBlockShell from '../../../../../packages/markdown-editor/src/code-block-view/CodeBlockShell.vue';

const pre = document.createElement('pre');
const code = document.createElement('code');
code.textContent = 'const answer = 42;\nconsole.log(answer);';
pre.appendChild(code);
const noop = () => {};
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Editor panels (inline, fixed data)</h2>
    <div class="vs-stack">
      <div style="width: 100%; height: 48px; border: 1px solid var(--coar-border-neutral)">
        <CoarMarkdownEditor model-value="Host editor" readonly />
      </div>
      <div data-scene-part="table-picker" style="border: 1px solid var(--coar-border-neutral)">
        <TableSizePicker :pick="noop" />
      </div>
      <div data-scene-part="color-picker">
        <ColorPickerPanel current-color="#2563eb" :pick="noop" />
      </div>
      <div data-scene-part="image-dialog" style="width: 100%; border: 1px solid var(--coar-border-neutral); padding: 12px; box-sizing: border-box">
        <ImageInsertDialog :close="noop" initial-url="https://example.com/a.png" initial-alt="Chart" />
      </div>
      <div data-scene-part="code-block" style="width: 100%">
        <CodeBlockShell text="const answer = 42;" language="typescript" :editing="true" :contentDOM="pre" />
      </div>
    </div>
  </section>
</template>
