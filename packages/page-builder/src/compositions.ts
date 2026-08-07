import type { ElementNode, PageCompositionOrigin, PageCompositionReference, PageNode } from './schema'
import { collectElementNames, isValidElementName, uniqueElementName, uid } from './builder/nodeDefaults'

export type MaybePromise<T> = T | Promise<T>

export interface PageCompositionDefinition {
  id: string
  name: string
  /** Immutable, repository-defined version token. */
  version: string
  /** Stable template tree. A page root is deliberately not reusable. */
  root: ElementNode
}

export interface PageCompositionSummary {
  id: string
  name: string
  latestVersion: string
  /** Optional immutable versions, newest first. */
  versions?: readonly string[]
}

export interface CreatePageCompositionInput {
  name: string
  root: ElementNode
}

export interface PublishPageCompositionInput {
  id: string
  /** Version the editor started from; repositories may use it for optimistic concurrency. */
  baseVersion: string
  root: ElementNode
}

/**
 * Host-owned persistence boundary. The package does not prescribe REST,
 * IndexedDB or an in-memory store; every operation may be sync or async.
 */
export interface PageCompositionRepository {
  list(): MaybePromise<readonly PageCompositionSummary[]>
  get(id: string, version?: string): MaybePromise<PageCompositionDefinition | null>
  create(input: CreatePageCompositionInput): MaybePromise<PageCompositionDefinition>
  publish(input: PublishPageCompositionInput): MaybePromise<PageCompositionDefinition>
}

export interface PageCompositionIssue {
  kind: 'invalid-reference' | 'missing' | 'cycle'
  compositionId?: string
  version?: string
  nodeId?: string
  message: string
}

function childrenOf(node: PageNode): PageNode[] {
  return 'children' in node && Array.isArray(node.children) ? node.children : []
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function isPageCompositionReference(value: unknown): value is PageCompositionReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const ref = value as Record<string, unknown>
  return typeof ref.id === 'string' && ref.id.trim().length > 0
    && typeof ref.version === 'string' && ref.version.trim().length > 0
}

export function compositionReference(node: PageNode): PageCompositionReference | undefined {
  return isPageCompositionReference(node.composition) ? node.composition : undefined
}

export function collectCompositionReferences(root: PageNode): Array<{ node: PageNode; reference: PageCompositionReference }> {
  const result: Array<{ node: PageNode; reference: PageCompositionReference }> = []
  const walk = (node: PageNode) => {
    const reference = compositionReference(node)
    if (reference) result.push({ node, reference })
    childrenOf(node).forEach(walk)
  }
  walk(root)
  return result
}

function subtreeNames(root: PageNode): Set<string> {
  return collectElementNames(root)
}

/**
 * Converts an edited instance back into a stable repository template. Instance
 * ids become their original template ids; newly added nodes keep their ids and
 * thereby gain a stable source identity in the next version.
 */
export function compositionTemplateFromInstance(instance: ElementNode): ElementNode {
  const ownerId = compositionReference(instance)?.id
  const walk = (node: PageNode, isRoot: boolean): PageNode => {
    const clone = cloneJson(node) as PageNode
    const origin = ownerId ? node.compositionOrigins?.find((entry) => entry.id === ownerId) : undefined
    clone.id = origin?.sourceNodeId || node.id
    const remainingOrigins = node.compositionOrigins?.filter((entry) => entry.id !== ownerId)
    if (remainingOrigins?.length) clone.compositionOrigins = cloneJson(remainingOrigins)
    else delete clone.compositionOrigins
    if (isRoot) delete clone.composition
    if ('children' in clone && Array.isArray(clone.children)) {
      clone.children = clone.children.map((child) => walk(child, false))
    }
    return clone
  }
  return walk(instance, true) as ElementNode
}

/** Marks an existing subtree as the first linked instance without changing ids or names. */
export function linkExistingCompositionInstance(
  instance: ElementNode,
  definition: PageCompositionDefinition,
): ElementNode {
  const walk = (node: PageNode, isRoot: boolean): PageNode => {
    const clone = cloneJson(node) as PageNode
    clone.compositionOrigins = [
      ...(node.compositionOrigins ?? []).filter((entry) => entry.id !== definition.id),
      { id: definition.id, sourceNodeId: node.id },
    ]
    if (isRoot) clone.composition = { id: definition.id, version: definition.version }
    if ('children' in clone && Array.isArray(clone.children)) {
      clone.children = clone.children.map((child) => walk(child, false))
    }
    return clone
  }
  return walk(instance, true) as ElementNode
}

interface MaterializeOptions {
  /** Entire page, used to keep public names unique. */
  page?: PageNode
  /** Existing instance, used to preserve node ids/names while updating. */
  existing?: ElementNode
}

/** Materializes a normal renderable subtree from one immutable definition. */
export function materializePageComposition(
  definition: PageCompositionDefinition,
  options: MaterializeOptions = {},
): ElementNode {
  if (!definition || typeof definition.id !== 'string' || !definition.id.trim()
    || typeof definition.version !== 'string' || !definition.version.trim()
    || !definition.root || definition.root.type === 'page') {
    throw new Error('Invalid page composition definition.')
  }

  const templateIds = new Set<string>()
  const validateTemplate = (node: PageNode) => {
    if (!node.id || templateIds.has(node.id)) {
      throw new Error(`Composition ${definition.id}@${definition.version} contains ${node.id ? `duplicate node id "${node.id}"` : 'a node without an id'}.`)
    }
    templateIds.add(node.id)
    childrenOf(node).forEach(validateTemplate)
  }
  validateTemplate(definition.root)

  const existingBySource = new Map<string, PageNode>()
  if (options.existing) {
    const index = (node: PageNode) => {
      const sourceId = node.compositionOrigins?.find((entry) => entry.id === definition.id)?.sourceNodeId
      existingBySource.set(sourceId || node.id, node)
      childrenOf(node).forEach(index)
    }
    index(options.existing)
  }

  const usedNames = options.page ? collectElementNames(options.page) : new Set<string>()
  if (options.existing) {
    for (const name of subtreeNames(options.existing)) usedNames.delete(name)
  }

  const walk = (template: PageNode, isRoot: boolean): PageNode => {
    const sourceId = template.id
    const previous = existingBySource.get(sourceId)
    const clone = cloneJson(template) as PageNode
    clone.id = previous?.id || uid()
    const origins = new Map<string, PageCompositionOrigin>()
    for (const origin of template.compositionOrigins ?? []) {
      if (origin.id !== definition.id) origins.set(origin.id, cloneJson(origin))
    }
    for (const origin of previous?.compositionOrigins ?? []) {
      if (origin.id !== definition.id) origins.set(origin.id, cloneJson(origin))
    }
    origins.set(definition.id, { id: definition.id, sourceNodeId: sourceId })
    clone.compositionOrigins = [...origins.values()]
    if (clone.type !== 'page') {
      const element = clone as ElementNode
      const oldName = previous && previous.type !== 'page' ? (previous as ElementNode).name : undefined
      const preferred = isValidElementName(oldName)
        ? oldName
        : (isValidElementName(element.name) ? element.name : element.type)
      element.name = uniqueElementName(preferred, usedNames)
      usedNames.add(element.name)
    }
    if (isRoot) clone.composition = { id: definition.id, version: definition.version }
    if ('children' in clone && Array.isArray(clone.children)) {
      clone.children = clone.children.map((child) => walk(child, false))
    }
    return clone
  }
  return walk(definition.root, true) as ElementNode
}

/** Removes only the link metadata; the visible, editable subtree stays intact. */
export function detachPageComposition(instance: ElementNode, compositionId = compositionReference(instance)?.id): ElementNode {
  const walk = (node: PageNode): PageNode => {
    const clone = cloneJson(node) as PageNode
    if (compositionId && clone.composition?.id === compositionId) delete clone.composition
    const remainingOrigins = clone.compositionOrigins?.filter((entry) => entry.id !== compositionId)
    if (remainingOrigins?.length) clone.compositionOrigins = remainingOrigins
    else delete clone.compositionOrigins
    if ('children' in clone && Array.isArray(clone.children)) {
      clone.children = clone.children.map(walk)
    }
    return clone
  }
  return walk(instance) as ElementNode
}

/**
 * Runtime publish compiler. Output contains ordinary page elements only — no
 * repository references or builder bookkeeping — and needs no repository.
 */
export function compilePageCompositions<T extends PageNode>(page: T): T {
  const walk = (node: PageNode): PageNode => {
    const clone = cloneJson(node) as PageNode
    delete clone.composition
    delete clone.compositionOrigins
    if ('children' in clone && Array.isArray(clone.children)) clone.children = clone.children.map(walk)
    return clone
  }
  return walk(page) as T
}

/** Checks missing definitions and nested definition cycles through the host repository. */
export async function validatePageCompositionReferences(
  page: PageNode,
  repository: PageCompositionRepository,
): Promise<PageCompositionIssue[]> {
  const issues: PageCompositionIssue[] = []
  const collectInvalidReferences = (node: PageNode) => {
    if (node.composition !== undefined && !isPageCompositionReference(node.composition)) {
      issues.push({
        kind: 'invalid-reference',
        nodeId: node.id,
        message: `Element ${node.id} contains an invalid composition reference. Both id and version are required.`,
      })
    }
    childrenOf(node).forEach(collectInvalidReferences)
  }
  collectInvalidReferences(page)
  const cache = new Map<string, PageCompositionDefinition | null>()
  const keyOf = (id: string, version: string) => `${id}\u0000${version}`
  const load = async (id: string, version: string) => {
    const key = keyOf(id, version)
    if (!cache.has(key)) cache.set(key, await repository.get(id, version))
    return cache.get(key) ?? null
  }
  const visit = async (id: string, version: string, stack: string[]) => {
    const key = keyOf(id, version)
    if (stack.includes(key)) {
      issues.push({ kind: 'cycle', compositionId: id, version, message: `Composition cycle detected: ${[...stack, key].map((entry) => entry.replace('\u0000', '@')).join(' → ')}` })
      return
    }
    const definition = await load(id, version)
    if (!definition) {
      issues.push({ kind: 'missing', compositionId: id, version, message: `Composition ${id}@${version} is missing.` })
      return
    }
    for (const nested of collectCompositionReferences(definition.root)) {
      await visit(nested.reference.id, nested.reference.version, [...stack, key])
    }
  }
  for (const entry of collectCompositionReferences(page)) {
    await visit(entry.reference.id, entry.reference.version, [])
  }
  return issues.filter((issue, index, all) => all.findIndex((other) => other.message === issue.message) === index)
}

/** Minimal repository useful for previews, tests and local-first hosts. */
export function createInMemoryPageCompositionRepository(
  initial: readonly PageCompositionDefinition[] = [],
): PageCompositionRepository {
  const store = new Map<string, PageCompositionDefinition[]>()
  for (const definition of initial) {
    const versions = store.get(definition.id) ?? []
    versions.push(cloneJson(definition))
    store.set(definition.id, versions)
  }
  const latest = (id: string) => store.get(id)?.at(-1)
  return {
    list: () => [...store.entries()].map(([id, versions]) => ({
      id,
      name: versions.at(-1)?.name ?? id,
      latestVersion: versions.at(-1)?.version ?? '1',
      versions: versions.map((entry) => entry.version).reverse(),
    })),
    get: (id, version) => {
      const found = version
        ? store.get(id)?.find((entry) => entry.version === version)
        : latest(id)
      return found ? cloneJson(found) : null
    },
    create: ({ name, root }) => {
      let id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'composition'
      const base = id
      let suffix = 2
      while (store.has(id)) id = `${base}-${suffix++}`
      const definition = { id, name: name.trim() || id, version: '1', root: cloneJson(root) }
      store.set(id, [definition])
      return cloneJson(definition)
    },
    publish: ({ id, baseVersion, root }) => {
      const versions = store.get(id)
      if (!versions?.length) throw new Error(`Composition ${id} does not exist.`)
      const current = versions.at(-1)!
      if (current.version !== baseVersion) {
        throw new Error(`Composition ${id} changed from ${baseVersion} to ${current.version}; update the instance before publishing.`)
      }
      const numeric = Number(current.version)
      const version = Number.isInteger(numeric) ? String(numeric + 1) : `${current.version}.1`
      const next = { id, name: current.name, version, root: cloneJson(root) }
      versions.push(next)
      return cloneJson(next)
    },
  }
}
