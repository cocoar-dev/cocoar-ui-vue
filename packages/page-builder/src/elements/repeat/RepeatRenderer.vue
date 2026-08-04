<script setup lang="ts">
import { computed, watch } from 'vue'
import type { RepeatNode } from '../../schema'
import { safeReadPath } from '../../runtimeBindings'
import { usePageElement } from '../usePageElement'

const props = defineProps<{ node: RepeatNode }>()
const ctx = usePageElement()
const contract = computed(() => ctx.config?.contextFields?.find((field) => field.path === props.node.props.source && field.type === 'array'))
function collectItemPaths(value: unknown, prefix = '', result = new Set<string>(), depth = 0): Set<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 8) return result
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    const path = prefix ? `${prefix}.${key}` : key
    result.add(path)
    collectItemPaths(entry, path, result, depth + 1)
  }
  return result
}
const allowedItemPaths = computed(() => {
  if (Array.isArray(props.node.props.items)) {
    const result = new Set<string>()
    for (const item of props.node.props.items.slice(0, 500)) collectItemPaths(item, '', result)
    return result
  }
  return new Set(contract.value?.itemFields?.map((field) => field.path) ?? [])
})
const source = computed<unknown[]>(() => {
  if (Array.isArray(props.node.props.items)) return props.node.props.items.slice(0, 500)
  if (!contract.value || !props.node.props.source) return []
  const value = ctx.resolveBinding({ source: 'context', path: props.node.props.source, fallback: [] })
  if (!Array.isArray(value)) return []
  const limit = Math.min(Math.max(Number(props.node.props.maxItems) || 100, 1), 500)
  return value.slice(0, limit)
})
const items = computed(() => source.value.map((item, index) => ({
  item,
  index,
  key: String((props.node.props.keyPath && safeReadPath(item, props.node.props.keyPath)) ?? index),
})))
let selectionIdentity = ''
let seenSelectionValues = new Set<string>()

watch([source, () => props.node.props.selection], ([current, selection]) => {
  if (!selection?.name || !allowedItemPaths.value.has(selection.valuePath)) return
  const nextIdentity = `${selection.name}\u0000${selection.valuePath}`
  if (selectionIdentity !== nextIdentity) {
    selectionIdentity = nextIdentity
    seenSelectionValues = new Set()
  }
  const previous = ctx.getValue(selection.name)
  const selected = new Set(Array.isArray(previous) ? previous.filter((value): value is string => typeof value === 'string') : [])
  for (const item of current) {
    const value = safeReadPath(item, selection.valuePath)
    if (typeof value !== 'string') continue
    const required = selection.requiredPath && allowedItemPaths.value.has(selection.requiredPath)
      ? safeReadPath(item, selection.requiredPath) === true
      : false
    if (required || (!seenSelectionValues.has(value) && selection.defaultSelected)) selected.add(value)
    seenSelectionValues.add(value)
  }
  const valid = new Set(current.map((item) => safeReadPath(item, selection.valuePath)).filter((value): value is string => typeof value === 'string'))
  ctx.setValue(selection.name, [...selected].filter((value) => valid.has(value)))
}, { immediate: true, deep: true })
</script>

<template>
  <div class="pb-repeat">
    <template v-if="items.length">
      <slot
        v-for="entry in items"
        :key="entry.key"
        :item="entry.item"
        :index="entry.index"
        :item-key="entry.key"
        :allowed-item-paths="allowedItemPaths"
        :selection="node.props.selection"
      />
    </template>
    <p v-else-if="node.props.emptyText" class="pb-repeat__empty">{{ node.props.emptyText }}</p>
  </div>
</template>

<style scoped>
.pb-repeat { display: flex; flex-direction: column; min-width: 0; gap: inherit; }
.pb-repeat__empty { margin: 0; color: var(--coar-text-neutral-secondary, #666); }
</style>
