import { computed, ref, watch, type ComputedRef } from 'vue'
import type { ElementNode, PageCompositionReference } from '../schema'
import {
  collectCompositionReferences,
  compositionReference,
  compositionTemplateFromInstance,
  detachPageComposition,
  linkExistingCompositionInstance,
  materializePageComposition,
  validatePageCompositionReferences,
  type PageCompositionIssue,
  type PageCompositionRepository,
  type PageCompositionSummary,
} from '../compositions'
import { getNodeAt, type NodePath } from './operations'
import type { UsePageBuilderReturn } from './usePageBuilder'

export interface LinkedCompositionSelection {
  path: NodePath
  node: ElementNode
  reference: PageCompositionReference
}

export interface UsePageCompositionsOptions {
  builder: UsePageBuilderReturn
  repository: ComputedRef<PageCompositionRepository | undefined>
  management: ComputedRef<PageCompositionManagement>
}

/** Controls whether definitions may be authored from inside a normal page. */
export type PageCompositionManagement = 'inline' | 'consume'

export function usePageCompositions({ builder, repository, management }: UsePageCompositionsOptions) {
  const summaries = ref<readonly PageCompositionSummary[]>([])
  const busy = ref(false)
  const error = ref<string>()
  const issues = ref<readonly PageCompositionIssue[]>([])
  let validationGeneration = 0

  const enabled = computed(() => !!repository.value)
  const selectedLink = computed<LinkedCompositionSelection | null>(() => {
    const selected = builder.selectedPath.value
    if (!selected) return null
    let found: LinkedCompositionSelection | null = null
    for (let depth = 0; depth <= selected.length; depth++) {
      const path = selected.slice(0, depth)
      const node = getNodeAt(builder.schema.value, path)?.node
      if (!node || node.type === 'page') continue
      const reference = compositionReference(node)
      if (reference) found = { path, node: node as ElementNode, reference }
    }
    return found
  })

  const insertTarget = computed<{ path: NodePath; index?: number } | null>(() => {
    const selected = builder.selectedPath.value
    if (!selected) return null
    const location = getNodeAt(builder.schema.value, selected)
    if (!location) return null
    if ('children' in location.node && Array.isArray(location.node.children)) return { path: selected }
    if (selected.length === 0) return null
    return { path: selected.slice(0, -1), index: selected[selected.length - 1] + 1 }
  })
  const selectedSummary = computed(() => {
    const id = selectedLink.value?.reference.id
    return id ? summaries.value.find((entry) => entry.id === id) : undefined
  })
  const selectedIsLatest = computed(() => !!selectedLink.value && !!selectedSummary.value
    && selectedLink.value.reference.version === selectedSummary.value.latestVersion)

  async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (busy.value) return undefined
    busy.value = true
    error.value = undefined
    try {
      return await operation()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      return undefined
    } finally {
      busy.value = false
    }
  }

  async function reload() {
    const repo = repository.value
    if (!repo) {
      summaries.value = []
      issues.value = []
      return
    }
    await run(async () => {
      summaries.value = await repo.list()
    })
    await validateLinks()
  }

  async function validateLinks() {
    const generation = ++validationGeneration
    const repo = repository.value
    if (!repo) {
      issues.value = []
      return
    }
    try {
      const result = await validatePageCompositionReferences(builder.schema.value, repo)
      if (generation === validationGeneration) issues.value = result
    } catch (cause) {
      if (generation === validationGeneration) {
        issues.value = [{ kind: 'missing', message: cause instanceof Error ? cause.message : String(cause) }]
      }
    }
  }

  async function createFromSelection(name: string): Promise<boolean> {
    const repo = repository.value
    const path = builder.selectedPath.value
    const node = builder.selectedNode.value
    if (!repo || !path || path.length === 0 || !node || node.type === 'page') return false
    if (!name.trim()) {
      error.value = 'Enter a composition name.'
      return false
    }
    const result = await run(async () => {
      const detached = detachPageComposition(node as ElementNode, selectedLink.value?.reference.id)
      const root = compositionTemplateFromInstance(detached)
      const definition = await repo.create({ name: name.trim(), root })
      builder.replaceAt(path, linkExistingCompositionInstance(node as ElementNode, definition))
      summaries.value = await repo.list()
      return true
    })
    return result === true
  }

  async function insert(id: string, version?: string): Promise<boolean> {
    const repo = repository.value
    const target = insertTarget.value
    if (!repo || !target) return false
    const result = await run(async () => {
      const definition = await repo.get(id, version)
      if (!definition) throw new Error(`Composition ${id}${version ? `@${version}` : ''} is missing.`)
      if (definition.id !== id || (version !== undefined && definition.version !== version)) {
        throw new Error(`Composition repository returned ${definition.id}@${definition.version} for ${id}${version ? `@${version}` : ''}.`)
      }
      const instance = materializePageComposition(definition, { page: builder.schema.value })
      builder.insertNode(target.path, instance, target.index)
      return true
    })
    return result === true
  }

  async function update(version?: string): Promise<boolean> {
    const repo = repository.value
    const link = selectedLink.value
    if (!repo || !link) return false
    const result = await run(async () => {
      const definition = await repo.get(link.reference.id, version)
      if (!definition) throw new Error(`Composition ${link.reference.id}${version ? `@${version}` : ''} is missing.`)
      if (definition.id !== link.reference.id || (version !== undefined && definition.version !== version)) {
        throw new Error(`Composition repository returned ${definition.id}@${definition.version} for ${link.reference.id}${version ? `@${version}` : ''}.`)
      }
      const instance = materializePageComposition(definition, {
        page: builder.schema.value,
        existing: link.node,
      })
      builder.replaceAt(link.path, instance)
      return true
    })
    return result === true
  }

  async function publish(): Promise<boolean> {
    const repo = repository.value
    const link = selectedLink.value
    if (!repo || !link) return false
    const result = await run(async () => {
      const root = compositionTemplateFromInstance(link.node)
      if (collectCompositionReferences(root).some((entry) => entry.reference.id === link.reference.id)) {
        throw new Error(`Composition ${link.reference.id} cannot contain itself.`)
      }
      const definition = await repo.publish({
        id: link.reference.id,
        baseVersion: link.reference.version,
        root,
      })
      const instance = materializePageComposition(definition, {
        page: builder.schema.value,
        existing: link.node,
      })
      builder.replaceAt(link.path, instance)
      summaries.value = await repo.list()
      return true
    })
    return result === true
  }

  function detach(): boolean {
    const link = selectedLink.value
    if (!link) return false
    builder.replaceAt(link.path, detachPageComposition(link.node))
    error.value = undefined
    return true
  }

  watch(repository, () => { void reload() }, { immediate: true })
  watch(builder.structuralVersion, () => { void validateLinks() })

  return {
    management,
    enabled,
    summaries,
    busy,
    error,
    issues,
    selectedLink,
    selectedSummary,
    selectedIsLatest,
    insertTarget,
    reload,
    createFromSelection,
    insert,
    update,
    publish,
    detach,
  }
}

export type UsePageCompositionsReturn = ReturnType<typeof usePageCompositions>
