import { onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  createPageCodeDrafts,
  elementActionDefinitionId,
  elementActionRuntimeSource,
  elementBindingId,
  elementCodeHasClickAction,
  elementClickActionId,
  elementComputeRuntimeSource,
  normalizePageCodeOutput,
  pageRootBindingId,
  pageRootComputeRuntimeSource,
  pageStateRuntimeSource,
  type PageCodeRuntimeInput,
  type PageCodeRuntimeValues,
} from '../pageCode'
import type { ActionValues } from '../context'
import type { ElementNode, PageNode, PageRootNode } from '../schema'
import {
  definePageRuntimeHost,
  type PageRuntimeHost,
  type PageRuntimeSession,
} from './PageRuntimeHost'
import type {
  RuntimeDefinition,
  RuntimeReactiveUpdate,
  RuntimeStatePatch,
  RuntimeValue,
} from './runtimeProtocol'

type ReadonlyValue<T> = Readonly<Ref<T>> | ComputedRef<T>

export interface PageCodeRuntimeOptions {
  pageId: ReadonlyValue<string>
  schema: ReadonlyValue<PageNode>
  context: ReadonlyValue<Record<string, unknown>>
  viewport: ReadonlyValue<{ width: number; breakpoint: string }>
  locale?: ReadonlyValue<string | undefined>
  enabled?: ReadonlyValue<boolean>
  tenantId?: string
  /** Application-owned host. Create once and reuse it for every renderer session. */
  runtimeHost?: PageRuntimeHost
}

const defaultPageRuntimeHost = definePageRuntimeHost({})

/**
 * Owns one isolated SES session for the current page and returns data-only
 * normalized patches. Applications that expose host capabilities pass a shared
 * `runtimeHost`; the default host deliberately exposes none.
 */
export function usePageCodeRuntime(options: PageCodeRuntimeOptions) {
  const pageCodeValues = ref<PageCodeRuntimeValues>()
  const rendererScope = ref<Pick<PageCodeRuntimeInput, 'fields' | 'form'>>({
    fields: {},
    form: { valid: false, dirty: false, validating: false, submitting: false },
  })

  let pageState: Record<string, unknown> = {}
  let session: PageRuntimeSession | undefined
  let restartTimer: ReturnType<typeof setTimeout> | undefined
  let computeTimer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let queue: Promise<void> = Promise.resolve()
  let drafts = createPageCodeDrafts(options.schema.value)
  let elementActions = new Map<string, { definitionId: string }>()
  let bindingNodeIds = new Map<string, string>()

  const runtimeScope = () => ({
    state: pageState,
    elements: drafts.elements,
    fields: rendererScope.value.fields,
    form: rendererScope.value.form,
    context: options.context.value,
    viewport: options.viewport.value,
    locale: options.locale?.value,
  })

  function collectDefinitions(schema: PageNode): RuntimeDefinition[] {
    const definitions: RuntimeDefinition[] = []
    elementActions = new Map()
    bindingNodeIds = new Map()
    const stateCode = schema.type === 'page'
      ? (schema as PageRootNode).stateCode ?? 'definePageState({})'
      : 'definePageState({})'
    definitions.push({ id: 'page-state', source: pageStateRuntimeSource(stateCode) })

    const root = schema.type === 'page' ? schema as PageRootNode : undefined
    if (root?.rootCode) {
      const id = pageRootBindingId(root.id)
      definitions.push({
        id,
        kind: 'binding',
        source: pageRootComputeRuntimeSource(root.rootCode),
      })
      bindingNodeIds.set(id, root.id)
    }

    const walk = (node: PageNode) => {
      if (node.type !== 'page') {
        const element = node as ElementNode
        if (element.elementCode && element.name) {
          const actionId = elementClickActionId(element.id)
          const actionDefinition = elementActionDefinitionId(element.id)
          definitions.push({
            id: elementBindingId(element.id),
            kind: 'binding',
            source: elementComputeRuntimeSource(element.elementCode, element.name, actionId),
          })
          bindingNodeIds.set(elementBindingId(element.id), element.id)
          if (elementCodeHasClickAction(element.elementCode)) {
            definitions.push({
              id: actionDefinition,
              source: elementActionRuntimeSource(element.elementCode, element.name),
            })
            elementActions.set(actionId, { definitionId: actionDefinition })
          }
        }
      }
      if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk)
    }
    walk(schema)
    return definitions
  }

  function applyElementUpdate(update: RuntimeReactiveUpdate) {
    if (update.kind !== 'binding') return
    const nodeId = bindingNodeIds.get(update.id) ?? ''
    const alias = Object.entries(drafts.nodeIds).find(([, id]) => id === nodeId)?.[0]
    if (!alias) return
    const normalized = normalizePageCodeOutput({
      elements: { [alias]: update.value },
      state: pageState,
    }, drafts)
    pageCodeValues.value = {
      nodes: { ...(pageCodeValues.value?.nodes ?? {}), ...normalized.nodes },
      state: { ...pageState },
      actionIds: [...elementActions.keys()],
    }
  }

  function runtimePatches(previous: unknown, next: unknown, path: string[]): RuntimeStatePatch[] {
    if (Object.is(previous, next)) return []
    if (
      !previous || !next || typeof previous !== 'object' || typeof next !== 'object'
      || Array.isArray(previous) || Array.isArray(next)
    ) return [{ op: 'set', path, value: next as RuntimeValue }]
    const left = previous as Record<string, unknown>
    const right = next as Record<string, unknown>
    const patches: RuntimeStatePatch[] = []
    for (const key of Object.keys(left)) {
      if (!(key in right)) patches.push({ op: 'delete', path: [...path, key] })
    }
    for (const [key, value] of Object.entries(right)) {
      if (!(key in left)) patches.push({ op: 'set', path: [...path, key], value: value as RuntimeValue })
      else patches.push(...runtimePatches(left[key], value, [...path, key]))
    }
    return patches
  }

  async function restart() {
    const currentGeneration = ++generation
    session?.dispose('Page State, Element Code, or structure changed.')
    session = undefined
    pageCodeValues.value = undefined
    pageState = {}
    queue = Promise.resolve()
    drafts = createPageCodeDrafts(options.schema.value)

    if (options.enabled?.value === false || typeof Worker === 'undefined') return

    try {
      const nextSession = (options.runtimeHost ?? defaultPageRuntimeHost).createSession({
        pageId: options.pageId.value,
        tenantId: options.tenantId,
        definitions: collectDefinitions(options.schema.value),
      })
      session = nextSession
      nextSession.subscribe(applyElementUpdate)
      await nextSession.initialize()
      if (currentGeneration !== generation) return
      const initialState = await nextSession.invoke('page-state', {})
      if (currentGeneration !== generation || nextSession !== session) return
      if (!initialState.value || typeof initialState.value !== 'object' || Array.isArray(initialState.value)) {
        throw new Error('Page State must return a plain object.')
      }
      pageState = { ...(initialState.value as Record<string, unknown>) }
      pageCodeValues.value = {
        nodes: {},
        state: { ...pageState },
        actionIds: [...elementActions.keys()],
      }
      await nextSession.setState(runtimeScope())
    } catch (error) {
      if (currentGeneration === generation) {
        console.warn('[PageBuilder runtime] Script preview failed; static fallbacks remain active.', error)
        session?.dispose('Page runtime initialization failed.')
        session = undefined
      }
    }
  }

  function scheduleRestart() {
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = setTimeout(() => { void restart() }, 100)
  }

  function enqueuePatches(patches: RuntimeStatePatch[]) {
    const currentSession = session
    if (!currentSession || patches.length === 0) return
    const operation = queue.then(() => currentSession.patchState(patches))
    queue = operation.then(() => undefined, () => undefined)
    void operation.catch((error) => {
      console.warn('[PageBuilder runtime] Reactive Element Code update failed.', error)
      // A normal tenant exception leaves the SES session usable. A timeout or
      // worker crash terminates it; rebuild exactly once from the persisted
      // definitions so a transient failure does not permanently disable the
      // page. If initialization fails again, restart() keeps static fallbacks
      // and waits for a document edit instead of entering a retry loop.
      if (currentSession === session && !currentSession.isAvailable) scheduleRestart()
    })
  }

  function onRuntimeChange(scope: Pick<PageCodeRuntimeInput, 'fields' | 'form'>) {
    const previous = rendererScope.value
    rendererScope.value = scope
    if (computeTimer) clearTimeout(computeTimer)
    computeTimer = setTimeout(() => enqueuePatches([
      ...runtimePatches(previous.fields, scope.fields, ['fields']),
      ...runtimePatches(previous.form, scope.form, ['form']),
    ]), 0)
  }

  async function runPageAction(id: string, payload: ActionValues): Promise<boolean> {
    const currentSession = session
    const action = elementActions.get(id)
    if (!currentSession || !action) return false
    const operation = queue.then(async () => {
      const result = await currentSession.invoke(action.definitionId, {
        ...runtimeScope(),
        actionName: 'click',
        payload,
      })
      const value = result.value as { state?: unknown } | undefined
      if (!value?.state || typeof value.state !== 'object' || Array.isArray(value.state)) {
        throw new Error('Element action returned invalid Page State.')
      }
      const nextState = value.state as Record<string, unknown>
      const patches = runtimePatches(pageState, nextState, ['state'])
      pageState = { ...nextState }
      pageCodeValues.value = pageCodeValues.value && {
        ...pageCodeValues.value,
        state: { ...pageState },
      }
      if (patches.length > 0) await currentSession.patchState(patches)
    })
    queue = operation.then(() => undefined, () => undefined)
    try {
      await operation
    } catch (error) {
      if (currentSession === session && !currentSession.isAvailable) scheduleRestart()
      throw error
    }
    return true
  }

  watch([options.schema, options.pageId], scheduleRestart, { immediate: true, deep: true })
  if (options.enabled) watch(options.enabled, scheduleRestart)
  watch([options.context, options.viewport], ([nextContext, nextViewport], [previousContext, previousViewport]) => {
    enqueuePatches([
      ...runtimePatches(previousContext, nextContext, ['context']),
      ...runtimePatches(previousViewport, nextViewport, ['viewport']),
    ])
  }, { deep: true })
  if (options.locale) {
    watch(options.locale, (next, previous) => {
      enqueuePatches(runtimePatches(previous, next, ['locale']))
    })
  }

  onBeforeUnmount(() => {
    if (restartTimer) clearTimeout(restartTimer)
    if (computeTimer) clearTimeout(computeTimer)
    session?.dispose()
  })

  return { pageCodeValues, onRuntimeChange, runPageAction }
}
