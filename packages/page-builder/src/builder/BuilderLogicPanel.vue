<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { CoarButton } from '@cocoar/vue-ui'
import { CoarScriptEditor } from '@cocoar/vue-script-editor'
import { constrainPageStateCode } from '../pageCode'
import type { PageNode, PageRootNode } from '../schema'
import { BUILDER_API, BUILDER_CONFIG, BUILDER_PAGE_CODE_LIBS } from './builderContext'
import { pageStateTypeLibrary } from './pageCodeAuthoring'

const builder = inject(BUILDER_API)!
const config = inject(BUILDER_CONFIG)!
const hostLibs = inject(BUILDER_PAGE_CODE_LIBS)
const source = computed(() => constrainPageStateCode((builder.schema.value as PageRootNode).stateCode))
const draft = ref(source.value)
const dirty = computed(() => draft.value !== source.value)
const libs = computed(() => [
  ...pageStateTypeLibrary(config.value),
  ...(hostLibs?.value ?? []),
])

watch(source, (next) => {
  if (!dirty.value) draft.value = next
})

function apply() {
  builder.patch([], { stateCode: draft.value } as Partial<PageNode>)
}

function revert() {
  draft.value = source.value
}
</script>

<template>
  <section class="pb-page-code">
    <header class="pb-page-code__toolbar">
      <div>
        <strong>Page State</strong>
        <span>Customer-authored shared state for this page and all of its element scripts.</span>
      </div>
      <div class="pb-page-code__actions">
        <span v-if="dirty" class="pb-page-code__dirty">Unsaved changes</span>
        <CoarButton size="s" variant="secondary" :disabled="!dirty" @click="revert">Revert</CoarButton>
        <CoarButton size="s" :disabled="!dirty" @click="apply">Apply state</CoarButton>
      </div>
    </header>
    <div class="pb-page-code__editor">
      <CoarScriptEditor
        v-model="draft"
        language="javascript"
        :script-mode="true"
        :extra-libs="libs"
        height="100%"
        placeholder="definePageState({ ... })"
      />
    </div>
    <footer>
      <span>The locked <code>definePageState</code> frame belongs to the Builder; only its object body is editable.</span>
      <span>Element actions may mutate <code>state</code>; dependent element scripts update reactively.</span>
    </footer>
  </section>
</template>

<style scoped>
.pb-page-code { display: flex; flex: 1; min-width: 0; min-height: 0; flex-direction: column; }
.pb-page-code__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 14px; border-bottom: 1px solid var(--coar-border-neutral, #ddd); }
.pb-page-code__toolbar > div:first-child { display: flex; flex-direction: column; gap: 2px; }
.pb-page-code__toolbar span, .pb-page-code footer { color: var(--coar-text-neutral-secondary, #666); font-size: 11px; }
.pb-page-code__actions { display: flex; align-items: center; gap: 8px; }
.pb-page-code__dirty { color: var(--coar-text-semantic-warning-bold, #946200) !important; }
.pb-page-code__editor { flex: 1; min-height: 360px; overflow: hidden; }
.pb-page-code__editor :deep(.coar-script-editor) {
  --coar-script-editor-marker-display: none;
  --coar-script-editor-locked-line-bg: transparent;
  --coar-script-editor-locked-line-opacity: 0.42;
}
.pb-page-code footer { display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 8px 14px; border-top: 1px solid var(--coar-border-neutral, #ddd); }
</style>
