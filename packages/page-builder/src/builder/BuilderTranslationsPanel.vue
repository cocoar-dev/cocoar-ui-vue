<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { CoarButton, CoarFormField, CoarIcon, CoarSelect, CoarTextInput, type CoarSelectOption } from '@cocoar/vue-ui'
import type { ElementNode, PageNode, PageRootNode, PageTranslations } from '../schema'
import { BUILDER_API, BUILDER_CONFIG, BUILDER_LOCALE } from './builderContext'
import { isTranslationBinding } from '../translations'
import { readElementQuickProperties } from '../pageCode'

const props = defineProps<{ focusKey?: string }>()
const builder = inject(BUILDER_API)!
const config = inject(BUILDER_CONFIG)
const localeContext = inject(BUILDER_LOCALE)
const search = ref('')
const newKey = ref('')

const root = computed(() => builder.schema.value.type === 'page'
  ? builder.schema.value as PageRootNode
  : undefined)
const translations = computed(() => root.value?.translations ?? {})
const locales = computed(() => {
  const configured = config?.value?.locales ?? []
  const seen = new Set(configured.map((entry) => entry.id))
  return [
    ...configured,
    ...Object.keys(translations.value)
      .filter((id) => !seen.has(id))
      .map((id) => ({ id, label: id })),
  ]
})
const localeOptions = computed<CoarSelectOption<string>[]>(() => locales.value.map((locale) => ({
  value: locale.id,
  label: locale.label,
})))
const activeLocale = computed(() => localeContext?.active.value
  ?? config?.value?.defaultLocale
  ?? locales.value[0]?.id
  ?? 'en')

function setLocale(value: string | null) {
  if (value) localeContext?.setActive(value)
}

function allTranslationKeys(): string[] {
  const keys = new Set<string>()
  for (const messages of Object.values(translations.value)) {
    for (const key of Object.keys(messages)) keys.add(key)
  }
  return [...keys].sort()
}

const usages = computed(() => {
  const references = new Map<string, Set<string>>()
  const count = (value: unknown, usage: string) => {
    if (!isTranslationBinding(value)) return
    const entries = references.get(value.key) ?? new Set<string>()
    entries.add(usage)
    references.set(value.key, entries)
  }
  const walk = (node: PageNode) => {
    if (node.type !== 'page') {
      const element = node as ElementNode
      for (const [property, value] of Object.entries(element.props ?? {})) count(value, `${node.id}:props.${property}`)
      for (const [target, value] of Object.entries(element.bindings ?? {})) {
        count(value, `${node.id}:props.${target}`)
        if (value && typeof value === 'object' && 'template' in value) count(value.template, `${node.id}:props.${target}`)
      }
      for (const [path, value] of Object.entries(readElementQuickProperties(element.elementCode))) count(value, `${node.id}:${path}`)
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk)
  }
  walk(builder.schema.value)
  return new Map([...references].map(([key, entries]) => [key, entries.size]))
})

const rows = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase()
  return allTranslationKeys().filter((key) => !needle || key.toLocaleLowerCase().includes(needle))
})

watch(() => props.focusKey, (key) => {
  if (key) search.value = key
}, { immediate: true })

function updateMessage(locale: string, key: string, value: string) {
  if (!root.value) return
  const next: PageTranslations = {
    ...translations.value,
    [locale]: { ...(translations.value[locale] ?? {}), [key]: value },
  }
  builder.patch([], { translations: next })
}

function addTranslationKey() {
  const key = newKey.value.trim()
  if (!key || !root.value) return
  updateMessage(activeLocale.value, key, '')
  search.value = key
  newKey.value = ''
}

function removeTranslationKey(key: string) {
  if (!root.value || (usages.value.get(key) ?? 0) > 0) return
  const next: PageTranslations = {}
  for (const [locale, messages] of Object.entries(translations.value)) {
    const localeMessages = { ...messages }
    delete localeMessages[key]
    next[locale] = localeMessages
  }
  builder.patch([], { translations: next })
  if (search.value === key) search.value = ''
}
</script>

<template>
  <div class="pb-translations">
    <header class="pb-translations__header">
      <div>
        <h3>Translations</h3>
        <p>Page-owned text is stored once by key. Element properties only reference these keys.</p>
      </div>
      <CoarFormField label="Editing language" class="pb-translations__locale">
        <CoarSelect
          size="s"
          :model-value="activeLocale"
          :options="localeOptions"
          sort-options="none"
          @update:model-value="setLocale"
        />
      </CoarFormField>
    </header>

    <div class="pb-translations__toolbar">
      <CoarTextInput v-model="search" size="s" placeholder="Search translation keys…" />
      <div class="pb-translations__add">
        <CoarTextInput v-model="newKey" size="s" placeholder="page.element.property" @keydown.enter="addTranslationKey" />
        <CoarButton size="s" variant="secondary" :disabled="!newKey.trim()" @click="addTranslationKey">
          Add key
        </CoarButton>
      </div>
    </div>

    <div v-if="rows.length" class="pb-translations__table-wrap">
      <table class="pb-translations__table">
        <thead>
          <tr>
            <th>Key</th>
            <th v-for="locale in locales" :key="locale.id">{{ locale.label }}</th>
            <th>Usage</th>
            <th><span class="pb-translations__sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in rows" :key="key">
            <th scope="row"><code>{{ key }}</code></th>
            <td v-for="locale in locales" :key="locale.id">
              <CoarTextInput
                size="s"
                :model-value="translations[locale.id]?.[key] ?? ''"
                :placeholder="locale.id === config?.defaultLocale ? 'Required' : 'Missing translation'"
                @update:model-value="(value) => updateMessage(locale.id, key, value)"
              />
            </td>
            <td>
              <span v-if="usages.get(key)" class="pb-translations__usage">{{ usages.get(key) }}</span>
              <span v-else class="pb-translations__unused" title="No element currently references this key">Unused</span>
            </td>
            <td class="pb-translations__actions">
              <button
                type="button"
                class="pb-translations__delete"
                :disabled="(usages.get(key) ?? 0) > 0"
                :title="usages.get(key) ? `Used by ${usages.get(key)} property reference(s)` : 'Delete unused key'"
                @click="removeTranslationKey(key)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="pb-translations__empty">
      <CoarIcon name="globe" size="l" />
      <strong>{{ search ? 'No matching translation keys' : 'No page translations yet' }}</strong>
      <span>Editing a localizable Quick Property creates its stable key automatically.</span>
    </div>
  </div>
</template>

<style scoped>
.pb-translations { height: 100%; overflow: auto; padding: 20px; background: var(--coar-background-neutral-primary, #fff); }
.pb-translations__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
.pb-translations__header h3 { margin: 0 0 4px; font-size: 18px; }
.pb-translations__header p { margin: 0; color: var(--coar-text-neutral-secondary, #666); font-size: 13px; }
.pb-translations__locale { width: 180px; flex: none; }
.pb-translations__toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(340px, 1fr); gap: 12px; margin-bottom: 14px; }
.pb-translations__add { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.pb-translations__table-wrap { overflow: auto; border: 1px solid var(--coar-border-neutral, #ddd); border-radius: 7px; }
.pb-translations__table { width: 100%; min-width: 760px; border-collapse: collapse; }
.pb-translations__table th, .pb-translations__table td { padding: 9px; border-bottom: 1px solid var(--coar-border-neutral, #e5e5e8); text-align: left; vertical-align: middle; }
.pb-translations__table thead th { position: sticky; top: 0; z-index: 1; background: var(--coar-background-neutral-secondary, #f7f7f8); font-size: 12px; }
.pb-translations__table tbody th { width: 30%; font-weight: 500; }
.pb-translations__table tbody tr:last-child > * { border-bottom: 0; }
.pb-translations__table code { font-size: 12px; overflow-wrap: anywhere; }
.pb-translations__usage, .pb-translations__unused { font-size: 11px; white-space: nowrap; }
.pb-translations__usage { display: inline-flex; min-width: 22px; justify-content: center; padding: 2px 6px; border-radius: 999px; background: var(--coar-surface-accent-secondary, #e8f1ff); color: var(--coar-text-accent-primary, #1666cc); }
.pb-translations__unused { color: var(--coar-text-neutral-tertiary, #888); }
.pb-translations__actions { width: 1%; white-space: nowrap; }
.pb-translations__delete { padding: 3px 5px; border: 0; background: transparent; color: var(--coar-text-semantic-error-bold, #b42318); font: inherit; font-size: 11px; cursor: pointer; }
.pb-translations__delete:disabled { color: var(--coar-text-neutral-disabled, #aaa); cursor: not-allowed; }
.pb-translations__sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
.pb-translations__empty { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--coar-text-neutral-secondary, #666); text-align: center; }
@media (max-width: 820px) {
  .pb-translations__header { flex-direction: column; }
  .pb-translations__locale { width: 100%; }
  .pb-translations__toolbar { grid-template-columns: 1fr; }
}
</style>
