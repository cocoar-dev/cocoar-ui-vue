<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue'
import { CoarButton, CoarIcon, CoarTextInput } from '@cocoar/vue-ui'
import { BUILDER_API, BUILDER_COMPOSITIONS } from './builderContext'

defineOptions({ name: 'BuilderCompositionsPanel' })

const builder = inject(BUILDER_API)!
const compositions = inject(BUILDER_COMPOSITIONS)!
const newName = ref('')
const selectedVersions = reactive<Record<string, string>>({})

const canCreate = computed(() => {
  const path = builder.selectedPath.value
  return !!path && path.length > 0 && builder.selectedNode.value?.type !== 'page'
})

const selectedLabel = computed(() => {
  const node = builder.selectedNode.value
  if (!node) return 'Nothing selected'
  if (node.type === 'page') return 'Page root'
  return (node as { name?: string }).name ?? node.type
})

const insertLabel = computed(() => {
  const target = compositions.insertTarget.value
  if (!target) return 'Select a node first'
  return target.index === undefined ? 'Insert as child' : 'Insert after selection'
})

async function createComposition() {
  if (await compositions.createFromSelection(newName.value)) newName.value = ''
}

function selectedVersion(id: string, latest: string): string {
  return selectedVersions[id] || latest
}
</script>

<template>
  <div class="pb-compositions">
    <header class="pb-compositions__header">
      <div>
        <h3>Reusable compositions</h3>
        <p>Store any selected subtree once and reuse a versioned, linked instance on other pages.</p>
      </div>
      <CoarButton size="s" variant="secondary" :disabled="compositions.busy.value" @click="compositions.reload()">Refresh</CoarButton>
    </header>

    <p v-if="compositions.error.value" class="pb-compositions__error" role="alert">{{ compositions.error.value }}</p>

    <section v-if="compositions.selectedLink.value" class="pb-compositions__section pb-compositions__linked">
      <div class="pb-compositions__section-heading">
        <div>
          <span class="pb-compositions__eyebrow">Linked selection</span>
          <h4>{{ compositions.selectedLink.value.reference.id }}@{{ compositions.selectedLink.value.reference.version }}</h4>
        </div>
        <CoarIcon name="copy" size="m" />
      </div>
      <p v-if="compositions.management.value === 'inline'">The selected node is inside this composition instance. Local edits remain on this page until you publish a new version.</p>
      <p v-else>This page uses an immutable composition version. Update it explicitly or detach it for page-local changes.</p>
      <div class="pb-compositions__actions">
        <CoarButton size="s" :disabled="compositions.busy.value || compositions.selectedIsLatest.value" @click="compositions.update()">
          {{ compositions.selectedIsLatest.value ? 'Up to date' : 'Update to latest' }}
        </CoarButton>
        <CoarButton v-if="compositions.management.value === 'inline'" size="s" variant="secondary" :disabled="compositions.busy.value" @click="compositions.publish()">Publish new version</CoarButton>
        <CoarButton size="s" variant="secondary" :disabled="compositions.busy.value" @click="compositions.detach()">Detach</CoarButton>
      </div>
    </section>

    <section v-if="compositions.issues.value.length" class="pb-compositions__section pb-compositions__issues" role="alert">
      <span class="pb-compositions__eyebrow">Reference problems</span>
      <p v-for="issue in compositions.issues.value" :key="issue.message">{{ issue.message }}</p>
    </section>

    <section v-if="compositions.management.value === 'inline'" class="pb-compositions__section">
      <span class="pb-compositions__eyebrow">Create from selected subtree</span>
      <h4>{{ selectedLabel }}</h4>
      <div class="pb-compositions__create">
        <CoarTextInput size="s" :model-value="newName" placeholder="e.g. Brand panel" :disabled="!canCreate || compositions.busy.value" @update:model-value="(value) => newName = value" @keydown.enter="createComposition" />
        <CoarButton size="s" :disabled="!canCreate || !newName.trim() || compositions.busy.value" @click="createComposition">Save composition</CoarButton>
      </div>
      <p v-if="!canCreate" class="pb-compositions__hint">Select any element or container below the page root.</p>
    </section>

    <section class="pb-compositions__section pb-compositions__library">
      <div class="pb-compositions__section-heading">
        <div>
          <span class="pb-compositions__eyebrow">Library</span>
          <h4>{{ compositions.summaries.value.length }} compositions</h4>
        </div>
        <span class="pb-compositions__target">{{ insertLabel }}</span>
      </div>
      <p v-if="compositions.summaries.value.length === 0" class="pb-compositions__empty">The host repository is empty. Save the selected subtree above to create the first reusable composition.</p>
      <article v-for="summary in compositions.summaries.value" :key="summary.id" class="pb-compositions__item">
        <div class="pb-compositions__item-copy">
          <strong>{{ summary.name }}</strong>
          <code>{{ summary.id }}</code>
        </div>
        <label v-if="summary.versions?.length" class="pb-compositions__version">
          Version
          <select :value="selectedVersion(summary.id, summary.latestVersion)" @change="selectedVersions[summary.id] = ($event.target as HTMLSelectElement).value">
            <option v-for="version in summary.versions" :key="version" :value="version">{{ version }}</option>
          </select>
        </label>
        <CoarButton size="s" variant="secondary" :disabled="!compositions.insertTarget.value || compositions.busy.value" @click="compositions.insert(summary.id, selectedVersion(summary.id, summary.latestVersion))">Insert</CoarButton>
      </article>
    </section>
  </div>
</template>

<style scoped>
.pb-compositions { padding: 20px; overflow: auto; display: grid; gap: 16px; align-content: start; color: var(--coar-text-neutral-primary, #17171a); }
.pb-compositions__header, .pb-compositions__section-heading, .pb-compositions__actions, .pb-compositions__create, .pb-compositions__item { display: flex; align-items: center; gap: 10px; }
.pb-compositions__header { justify-content: space-between; }
.pb-compositions h3, .pb-compositions h4, .pb-compositions p { margin: 0; }
.pb-compositions h3 { font-size: 17px; }
.pb-compositions h4 { font-size: 14px; }
.pb-compositions__header p, .pb-compositions__section p { margin-top: 4px; color: var(--coar-text-neutral-secondary, #666); font-size: 12px; line-height: 1.45; }
.pb-compositions__section { border: 1px solid var(--coar-border-neutral, #dedee3); border-radius: 8px; padding: 14px; background: var(--coar-background-neutral-primary, #fff); }
.pb-compositions__linked { border-color: var(--coar-border-accent-primary, #4b7fd1); background: var(--coar-surface-accent-secondary, #f3f7fd); }
.pb-compositions__section-heading { justify-content: space-between; }
.pb-compositions__eyebrow { display: block; color: var(--coar-text-neutral-tertiary, #777); font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 3px; }
.pb-compositions__actions, .pb-compositions__create { margin-top: 12px; flex-wrap: wrap; }
.pb-compositions__create > :first-child { flex: 1; min-width: 180px; }
.pb-compositions__hint, .pb-compositions__empty { margin-top: 8px !important; }
.pb-compositions__error { padding: 10px 12px; border-radius: 6px; color: var(--coar-text-semantic-error-bold, #a32b20); background: var(--coar-background-semantic-error-subtle, #fde8e4); font-size: 12px; }
.pb-compositions__issues { border-color: var(--coar-border-semantic-warning, #d69e2e); background: var(--coar-background-semantic-warning-subtle, #fff8df); }
.pb-compositions__target { font-size: 11px; color: var(--coar-text-neutral-secondary, #666); }
.pb-compositions__item { padding: 10px 0; border-top: 1px solid var(--coar-border-neutral, #e5e5e8); }
.pb-compositions__item:first-of-type { margin-top: 10px; }
.pb-compositions__item-copy { display: grid; gap: 2px; flex: 1; min-width: 0; }
.pb-compositions__item-copy strong { font-size: 13px; }
.pb-compositions__item-copy code { overflow: hidden; text-overflow: ellipsis; color: var(--coar-text-neutral-tertiary, #777); font-size: 11px; }
.pb-compositions__version { display: grid; gap: 2px; font-size: 10px; color: var(--coar-text-neutral-secondary, #666); }
.pb-compositions__version select { min-width: 72px; border: 1px solid var(--coar-border-neutral, #ccc); border-radius: 4px; background: white; padding: 3px 5px; font: inherit; }
</style>
