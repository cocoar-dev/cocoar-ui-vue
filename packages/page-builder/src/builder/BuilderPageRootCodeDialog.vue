<script setup lang="ts">
import { computed, ref } from 'vue'
import { CoarButton } from '@cocoar/vue-ui'
import { CoarScriptEditor, type CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor'
import { constrainPageRootCode, constrainPageStateCode } from '../pageCode'
import type { PageConfig, PageNode } from '../schema'
import { pageRootCodePreamble, pageRootCodeTypeLibrary } from './pageCodeAuthoring'

const props = defineProps<{
  schema: PageNode
  source?: string
  stateCode?: string
  config?: PageConfig
  hostLibs?: readonly CoarScriptEditorExtraLib[]
  close: (result?: string) => void
}>()

const draft = ref(constrainPageRootCode(props.source))
const preamble = computed(() => pageRootCodePreamble(constrainPageStateCode(props.stateCode)))
const libs = computed(() => [
  ...pageRootCodeTypeLibrary(props.schema, props.config),
  ...(props.hostLibs ?? []),
])
</script>

<template>
  <div class="pb-page-root-code-dialog">
    <div class="pb-page-root-code-dialog__meta">
      <div><span>Element</span><strong>Page Root</strong></div>
      <div><span>Mutable target</span><code>page</code></div>
    </div>
    <div class="pb-page-root-code-dialog__editor">
      <CoarScriptEditor
        v-model="draft"
        language="javascript"
        :script-mode="true"
        :preamble="preamble"
        :extra-libs="libs"
        height="clamp(360px, 58vh, 620px)"
        placeholder="definePageRoot({ compute })"
      />
    </div>
    <p class="pb-page-root-code-dialog__hint">
      Page Root Code can configure only <code>page.style</code>,
      <code>page.responsive</code>, and <code>page.enterSubmits</code>. The tree,
      element types, names, and children remain owned by the visual builder.
      Reactive inputs are available on <code>runtime.*</code>.
    </p>
    <footer>
      <CoarButton variant="secondary" @click="close()">Cancel</CoarButton>
      <CoarButton @click="close(draft)">Apply Page Code</CoarButton>
    </footer>
  </div>
</template>

<style scoped>
.pb-page-root-code-dialog { display: flex; flex-direction: column; gap: 12px; }
.pb-page-root-code-dialog__meta { display: flex; justify-content: space-between; gap: 24px; }
.pb-page-root-code-dialog__meta div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pb-page-root-code-dialog__meta span, .pb-page-root-code-dialog__hint { color: var(--coar-text-neutral-secondary, #666); font-size: 12px; }
.pb-page-root-code-dialog__editor { flex: none; border: 1px solid var(--coar-border-neutral, #ddd); border-radius: 6px; overflow: hidden; }
.pb-page-root-code-dialog__editor :deep(.coar-script-editor) {
  --coar-script-editor-marker-display: none;
  --coar-script-editor-locked-line-bg: transparent;
  --coar-script-editor-locked-line-opacity: 0.42;
}
.pb-page-root-code-dialog__hint { margin: 0; }
.pb-page-root-code-dialog footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
