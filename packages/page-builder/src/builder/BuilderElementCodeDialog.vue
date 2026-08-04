<script setup lang="ts">
import { computed, ref } from 'vue'
import { CoarButton } from '@cocoar/vue-ui'
import { CoarScriptEditor, type CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor'
import { constrainElementCode, constrainPageStateCode } from '../pageCode'
import type { ElementNode, PageConfig, PageNode } from '../schema'
import { elementCodePreamble, elementCodeTypeLibrary } from './pageCodeAuthoring'

const props = defineProps<{
  schema: PageNode
  node: ElementNode
  source?: string
  stateCode?: string
  config?: PageConfig
  hostLibs?: readonly CoarScriptEditorExtraLib[]
  close: (result?: string) => void
}>()

const draft = ref(constrainElementCode(props.source))
const preamble = computed(() => elementCodePreamble(constrainPageStateCode(props.stateCode), props.node))
const libs = computed(() => [
  ...elementCodeTypeLibrary(props.schema, props.node, props.config),
  ...(props.hostLibs ?? []),
])
</script>

<template>
  <div class="pb-element-code-dialog">
    <div class="pb-element-code-dialog__meta">
      <div><span>Element</span><strong>{{ node.name }} · {{ node.type }}</strong></div>
      <div><span>Mutable target</span><code>element</code></div>
    </div>
    <div class="pb-element-code-dialog__editor">
      <CoarScriptEditor
        v-model="draft"
        language="javascript"
        :script-mode="true"
        :preamble="preamble"
        :extra-libs="libs"
        height="clamp(360px, 58vh, 620px)"
        placeholder="defineElement({ compute, actions })"
      />
    </div>
    <p class="pb-element-code-dialog__hint">
      Locked lines belong to the PageBuilder and cannot be renamed or deleted. Edit only the
      <code>compute</code> and <code>click</code> bodies between them. Configuration and runtime
      inputs are separated: <code>element.*</code> is only this element, shared inputs live on
      <code>page.*</code>, and the event payload lives on <code>action.payload</code>.
    </p>
    <footer>
      <CoarButton variant="secondary" @click="close()">Cancel</CoarButton>
      <CoarButton @click="close(draft)">Apply element code</CoarButton>
    </footer>
  </div>
</template>

<style scoped>
.pb-element-code-dialog { display: flex; flex-direction: column; gap: 12px; }
.pb-element-code-dialog__meta { display: flex; justify-content: space-between; gap: 24px; }
.pb-element-code-dialog__meta div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pb-element-code-dialog__meta span, .pb-element-code-dialog__hint { color: var(--coar-text-neutral-secondary, #666); font-size: 12px; }
.pb-element-code-dialog__meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-element-code-dialog__editor { flex: none; border: 1px solid var(--coar-border-neutral, #ddd); border-radius: 6px; overflow: hidden; }
.pb-element-code-dialog__editor :deep(.coar-script-editor) {
  --coar-script-editor-marker-display: none;
  --coar-script-editor-locked-line-bg: transparent;
  --coar-script-editor-locked-line-opacity: 0.42;
}
.pb-element-code-dialog__hint { margin: 0; }
.pb-element-code-dialog footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
