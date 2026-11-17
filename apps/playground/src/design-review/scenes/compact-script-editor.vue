<script setup lang="ts">
/**
 * `<CoarScriptEditor>` (Monaco), profile-neutral. Monaco themes are global to the
 * page and the compact Monaco themes apply only to a compact *document*
 * (`.coar-compact` on `<html>`/`<body>`, see packages/script-editor/src/theme.ts),
 * so the gallery shows this scene in one iframe per profile, each with its profile
 * and mode on `<html>`. Covers: full editor with line numbers, a locked line and
 * extra-lib types (IntelliSense is opened by the gallery test), the inline variant in a
 * form field with a hint, the error state, readonly, and the empty placeholder.
 * Fixed text, theme `auto` (follows `.dark-mode` on `<html>`).
 */
import { ref } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import { CoarScriptEditor, type CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';

const script = ref(`// Route the visit report to the right reviewer.
function reviewer(ctx: VisitContext): string { // @locked
  if (ctx.site.region === 'north') return 'Ada Lovelace';
  return ctx.user.name;
}
`);
const rule = ref('value.length >= 3');
const broken = ref('return visits >');
const readonlyText = 'export const MAX_VISITS = 12;';
const empty = ref('');

const extraLibs: CoarScriptEditorExtraLib[] = [{
  filePath: 'file:///types/visit-context.d.ts',
  content: `declare interface VisitContext {
  user: { id: string; name: string };
  site: { id: string; region: 'north' | 'south'; visits: number };
}
`,
}];
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Editor with a locked line and typed context</h2>
    <div data-scene-part="editor">
      <CoarScriptEditor v-model="script" :extra-libs="extraLibs" :height="150" />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Inline variant in form fields</h2>
    <div class="vs-stack" style="align-items: stretch">
      <CoarFormField label="Validation rule" hint="JavaScript expression, `value` is the field value" data-scene-part="inline">
        <CoarScriptEditor v-model="rule" variant="inline" language="javascript" :height="36" />
      </CoarFormField>
      <CoarFormField label="Transform" error="Unexpected end of expression" data-scene-part="error">
        <CoarScriptEditor v-model="broken" variant="inline" language="javascript" :height="36" />
      </CoarFormField>
      <CoarFormField label="Constant (readonly)" data-scene-part="readonly">
        <CoarScriptEditor :model-value="readonlyText" readonly variant="inline" :height="36" />
      </CoarFormField>
      <CoarFormField label="Empty" data-scene-part="empty">
        <CoarScriptEditor v-model="empty" variant="inline" placeholder="return true;" :height="36" />
      </CoarFormField>
    </div>
  </section>
</template>
