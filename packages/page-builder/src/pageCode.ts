import type {
  ElementNode,
  ElementProps,
  FieldValidation,
  NodeStyle,
  PageNode,
  PageRootNode,
  ResponsiveNodeStyles,
  PropertyBinding,
  VisibleWhen,
} from './schema'

export const DEFAULT_PAGE_CODE = `definePage({
  state: {},

  compute({ elements, fields, form, state, context, resources, viewport }) {
    // Configure existing elements here. Structure stays in the visual builder.
  },

  actions: {},
})`

export const DEFAULT_PAGE_STATE_CODE = `definePageState({ // @locked @slot:state
  counter: 0,
}) // @locked`

export const DEFAULT_PAGE_ROOT_CODE = `definePageRoot({ // @locked
  compute(page, runtime) { // @locked @slot:compute
    // Configure the existing page root. Structure stays in the visual builder.
  }, // @locked
}) // @locked`

export const DEFAULT_ELEMENT_CODE = `defineElement({ // @locked
  compute(element, page) { // @locked
    // Properties Panel values // @locked @quick:start
    // Custom code (overrides values above) // @locked @quick:end @slot:compute
    // Configure this element. Page inputs live on page.*.
  }, // @locked
  actions: { // @locked
    async click(element, page, action) { // @locked @slot:click

    }, // @locked
  }, // @locked
}) // @locked`

export const elementBindingId = (nodeId: string) => `element-binding:${nodeId}`
export const pageRootBindingId = (nodeId: string) => `page-root-binding:${nodeId}`
export const elementActionDefinitionId = (nodeId: string) => `element-action:${nodeId}`
export const elementClickActionId = (nodeId: string) => `__element:${nodeId}:click`

export interface PageCodeElementDraft {
  /** Informational only. Runtime application never trusts these fields. */
  readonly id: string
  readonly type: string
  readonly name: string
  props: ElementProps
  style: NodeStyle
  responsive: ResponsiveNodeStyles
  validation: FieldValidation | null
  visibleWhen: VisibleWhen | null
  bindings: Record<string, PropertyBinding>
  defaultValue?: unknown
  enterSubmits?: boolean
}

export interface PageCodeDraftSet {
  elements: Record<string, PageCodeElementDraft>
  /** Stable mapping retained outside the sandbox; authored code cannot change it. */
  nodeIds: Record<string, string>
}

export interface PageCodeRuntimeValues {
  nodes: Readonly<Record<string, Partial<PageCodeElementDraft>>>
  state: Readonly<Record<string, unknown>>
  actionIds: readonly string[]
}

export interface PageCodeRuntimeInput {
  kind: 'compute' | 'action'
  elements: Record<string, PageCodeElementDraft>
  state?: Record<string, unknown>
  fields: Record<string, unknown>
  form: {
    valid: boolean
    dirty: boolean
    validating: boolean
    submitting: boolean
  }
  context?: Record<string, unknown>
  resources?: Record<string, unknown>
  viewport?: { width: number; breakpoint: string }
  viewState?: string
  locale?: string
  actionId?: string
  payload?: Record<string, unknown>
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function cloneJsonValue<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((entry) => cloneJsonValue(entry)) as T
  const result: Record<string, unknown> = Object.create(null)
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!FORBIDDEN_KEYS.has(key)) result[key] = cloneJsonValue(entry)
  }
  return result as T
}

function identifierAlias(value: string): string {
  const words = value.split(/[^A-Za-z0-9_$]+/).filter(Boolean)
  const joined = words.map((word, index) => index === 0
    ? word
    : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('') || 'element'
  const safe = joined.replace(/^[^A-Za-z_$]/, (match) => `_${match}`)
  return /^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)$/.test(safe)
    ? `_${safe}`
    : safe
}

function matchingBrace(source: string, openIndex: number): number {
  let depth = 0
  let quote: "'" | '"' | '`' | null = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openIndex; index < source.length; index++) {
    const current = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (current === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (current === '*' && next === '/') { blockComment = false; index++ }
      continue
    }
    if (quote) {
      if (escaped) { escaped = false; continue }
      if (current === '\\') { escaped = true; continue }
      if (current === quote) quote = null
      continue
    }
    if (current === '/' && next === '/') { lineComment = true; index++; continue }
    if (current === '/' && next === '*') { blockComment = true; index++; continue }
    if (current === "'" || current === '"' || current === '`') { quote = current; continue }
    if (current === '{') depth++
    else if (current === '}' && --depth === 0) return index
  }
  return -1
}

function normalizeBody(body: string, indentation: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines.at(-1)?.trim()) lines.pop()
  const nonEmpty = lines.filter((line) => line.trim())
  const common = nonEmpty.length
    ? Math.min(...nonEmpty.map((line) => line.match(/^\s*/)?.[0].length ?? 0))
    : 0
  return lines.map((line) => `${indentation}${line.slice(common)}`).join('\n')
}

function methodBody(source: string, method: string): string {
  const match = new RegExp(`\\b(?:async\\s+)?${method}\\s*\\([^)]*\\)\\s*\\{`).exec(source)
  if (!match) return ''
  const open = source.indexOf('{', match.index + match[0].lastIndexOf('{'))
  const close = matchingBrace(source, open)
  return close < 0 ? '' : source.slice(open + 1, close)
}

function namedSlot(source: string, name: string): string | undefined {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((line) => new RegExp(`//\\s*@locked\\b[^\\n]*?@slot:${name}\\b`).test(line))
  if (start < 0) return undefined
  let end = start + 1
  while (end < lines.length && !/\/\/\s*@locked\b/.test(lines[end])) end++
  return lines.slice(start + 1, end).join('\n')
}

const QUICK_PROPERTY_PATH = /^(props|style|validation)\.([A-Za-z_$][\w$]*)$/

function quickPropertyMetadata(path: string, value: unknown): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new TypeError(`Quick Property "${path}" must be JSON-safe.`)
  return `@quick:${encodeURIComponent(path)} @value:${encodeURIComponent(serialized)}`
}

function quickPropertyLine(path: string, value: unknown): string {
  const match = QUICK_PROPERTY_PATH.exec(path)
  if (!match) throw new TypeError(`Unsupported Quick Property path "${path}".`)
  const [, root, property] = match
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new TypeError(`Quick Property "${path}" must be JSON-safe.`)
  const candidate = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
  const expression = candidate?.source === 'translation' && typeof candidate.key === 'string'
    ? `i18n.text(${JSON.stringify(candidate.key)}, ${candidate.params === undefined ? 'undefined' : JSON.stringify(candidate.params)}, ${candidate.fallback === undefined ? 'undefined' : JSON.stringify(candidate.fallback)})`
    : serialized
  const assignment = root === 'validation'
    ? `element.validation = { ...(element.validation || {}), ${property}: ${expression} };`
    : `element.${root}.${property} = ${expression};`
  return `    ${assignment} // @locked ${quickPropertyMetadata(path, value)}`
}

function quickPropertyLines(source: string): string[] {
  return source.replace(/\r\n/g, '\n').split('\n').filter((line) =>
    /\/\/\s*@locked\b[^\n]*@quick:[^\s]+\s+@value:[^\s]+/.test(line),
  )
}

/** Reads only deterministic Properties-Panel assignments, never arbitrary customer code. */
export function readElementQuickProperties(source?: string): Record<string, unknown> {
  const values: Record<string, unknown> = Object.create(null)
  for (const line of quickPropertyLines(source ?? '')) {
    const match = /@quick:([^\s]+)\s+@value:([^\s]+)/.exec(line)
    if (!match) continue
    try {
      const path = decodeURIComponent(match[1])
      if (!QUICK_PROPERTY_PATH.test(path)) continue
      values[path] = JSON.parse(decodeURIComponent(match[2]))
    } catch {
      // Ignore damaged metadata. Constrained Mode still protects the executable line.
    }
  }
  return values
}

/** Adds, replaces, or removes one machine-owned assignment without parsing custom code. */
export function setElementQuickProperty(source: string | undefined, path: string, value: unknown): string {
  if (!QUICK_PROPERTY_PATH.test(path)) throw new TypeError(`Unsupported Quick Property path "${path}".`)
  const constrained = constrainElementCode(source)
  const lines = constrained.replace(/\r\n/g, '\n').split('\n')
  const encodedPath = encodeURIComponent(path)
  const existing = lines.findIndex((line) => line.includes(`@quick:${encodedPath} `))
  if (existing >= 0) lines.splice(existing, 1)
  if (value !== undefined) {
    const end = lines.findIndex((line) => /@quick:end\b/.test(line))
    if (end < 0) throw new Error('Element Code is missing its Quick Properties boundary.')
    lines.splice(end, 0, quickPropertyLine(path, value))
  }
  const start = lines.findIndex((line) => /@quick:start\b/.test(line))
  const end = lines.findIndex((line) => /@quick:end\b/.test(line))
  if (start >= 0 && end > start) {
    const assignments = lines.slice(start + 1, end).sort((left, right) => {
      const leftPath = /@quick:([^\s]+)/.exec(left)?.[1] ?? ''
      const rightPath = /@quick:([^\s]+)/.exec(right)?.[1] ?? ''
      return leftPath.localeCompare(rightPath)
    })
    lines.splice(start + 1, end - start - 1, ...assignments)
  }
  return lines.join('\n')
}

function migrateLegacyElementBody(body: string, action: boolean): string {
  let migrated = body.replace(/\bself\./g, 'element.')
  migrated = migrated
    .replace(/\belement\.state\b/g, 'page.state')
    .replace(/\belement\.fields\b/g, 'page.fields')
    .replace(/\belement\.form\b/g, 'page.form')
    .replace(/\belement\.context\b/g, 'page.context')
    .replace(/\belement\.resources\b/g, 'page.resources')
    .replace(/\belement\.viewport\b/g, 'page.viewport')
  if (action) migrated = migrated.replace(/\belement\.payload\b/g, 'action.payload')
  const candidates = [
    'state', 'fields', 'form', 'context', 'resources', 'viewport',
  ]
  const used = candidates.filter((name) => new RegExp(`\\b${name}\\b`).test(migrated))
  const declarations: string[] = []
  if (used.length > 0) declarations.push(`const { ${used.join(', ')} } = page;`)
  if (action && /\bpayload\b/.test(migrated)) declarations.push('const { payload } = action;')
  return declarations.length > 0 ? `${declarations.join('\n')}\n${migrated}` : migrated
}

function migrateElementContextAccess(body: string, action: boolean): string {
  let migrated = body
    .replace(/\belement\.state\b/g, 'page.state')
    .replace(/\belement\.fields\b/g, 'page.fields')
    .replace(/\belement\.form\b/g, 'page.form')
    .replace(/\belement\.context\b/g, 'page.context')
    .replace(/\belement\.resources\b/g, 'page.resources')
    .replace(/\belement\.viewport\b/g, 'page.viewport')
  if (action) migrated = migrated.replace(/\belement\.payload\b/g, 'action.payload')
  return migrated
}

/** Converts legacy free-form state source into the constrained persisted template. */
export function constrainPageStateCode(source?: string): string {
  const current = source?.trim() || DEFAULT_PAGE_STATE_CODE
  if (/\/\/\s*@locked\b/.test(current)) return current
  const call = current.indexOf('definePageState')
  const open = current.indexOf('{', Math.max(0, call))
  const close = open >= 0 ? matchingBrace(current, open) : -1
  const body = open >= 0 && close > open ? current.slice(open + 1, close) : ''
  return `definePageState({ // @locked @slot:state\n${normalizeBody(body, '  ')}\n}) // @locked`
}

/** Converts Page Root Code into one constrained reactive compute slot. */
export function constrainPageRootCode(source?: string): string {
  const current = source?.trim() || DEFAULT_PAGE_ROOT_CODE
  if (/\/\/\s*@locked\b/.test(current)
    && /\bcompute\s*\(\s*page\s*,\s*runtime\s*\)/.test(current)) return current
  const body = methodBody(current, 'compute')
  return `definePageRoot({ // @locked
  compute(page, runtime) { // @locked @slot:compute
${normalizeBody(body, '    ')}
  }, // @locked
}) // @locked`
}

/**
 * Converts the original free-form prototype into fixed compute/click slots.
 * Once markers exist, the source round-trips unchanged through Constrained Mode.
 */
export function constrainElementCode(source?: string): string {
  const current = source?.trim() || DEFAULT_ELEMENT_CODE
  const constrained = /\/\/\s*@locked\b/.test(current)
  if (constrained && /\bcompute\s*\(\s*element\s*,\s*page\s*\)/.test(current)
    && /\bclick\s*\(\s*element\s*,\s*page\s*,\s*action\s*\)/.test(current)
    && /@quick:start\b/.test(current) && /@quick:end\b/.test(current)) return current
  const legacySignature = /\bcompute\s*\(\s*\{/.test(current)
    || /\bclick\s*\(\s*\{/.test(current)
  const computeBody = constrained ? namedSlot(current, 'compute') ?? '' : methodBody(current, 'compute')
  const clickBody = constrained ? namedSlot(current, 'click') ?? '' : methodBody(current, 'click')
  const compute = normalizeBody(
    legacySignature
      ? migrateLegacyElementBody(computeBody, false)
      : migrateElementContextAccess(computeBody, false),
    '    ',
  )
  const click = normalizeBody(
    legacySignature
      ? migrateLegacyElementBody(clickBody, true)
      : migrateElementContextAccess(clickBody, true),
    '      ',
  )
  const quick = quickPropertyLines(current).join('\n')
  return `defineElement({ // @locked
  compute(element, page) { // @locked
    // Properties Panel values // @locked @quick:start
${quick ? `${quick}\n` : ''}    // Custom code (overrides values above) // @locked @quick:end @slot:compute
${compute}
  }, // @locked
  actions: { // @locked
    async click(element, page, action) { // @locked @slot:click
${click}
    }, // @locked
  }, // @locked
}) // @locked`
}

export function elementCodeHasClickAction(source: string): boolean {
  const slot = namedSlot(source, 'click')
  return slot === undefined
    ? /\bclick\s*\([^)]*\)\s*\{/.test(source)
    : slot.trim().length > 0
}

/** Creates mutable configuration drafts without exposing tree structure. */
export function createPageCodeDrafts(schema: PageNode): PageCodeDraftSet {
  const elements: Record<string, PageCodeElementDraft> = Object.create(null)
  const nodeIds: Record<string, string> = Object.create(null)
  const used = new Set<string>()

  const walk = (node: PageNode) => {
    const preferred = node.type === 'page'
      ? 'page'
      : ((node as ElementNode).name || identifierAlias(node.id))
    let alias = preferred
    let suffix = 2
    while (used.has(alias)) alias = `${preferred}${suffix++}`
    used.add(alias)
    nodeIds[alias] = node.id
    elements[alias] = node.type === 'page'
      ? {
          id: node.id,
          type: node.type,
          name: 'page',
          style: cloneJsonValue(node.style ?? {}),
          responsive: cloneJsonValue(node.responsive ?? {}),
          props: {},
          validation: null,
          visibleWhen: null,
          bindings: {},
          enterSubmits: !!(node as PageRootNode).enterSubmits,
        }
      : {
          id: node.id,
          type: node.type,
          name: (node as ElementNode).name ?? alias,
          props: cloneJsonValue((node as ElementNode).props ?? {}),
          style: cloneJsonValue(node.style ?? {}),
          responsive: cloneJsonValue(node.responsive ?? {}),
          validation: cloneJsonValue((node as ElementNode).validation ?? null),
          visibleWhen: cloneJsonValue((node as ElementNode).visibleWhen ?? null),
          bindings: cloneJsonValue((node as ElementNode).bindings ?? {}),
          defaultValue: cloneJsonValue((node as ElementNode).defaultValue),
        }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk)
  }
  walk(schema)
  return { elements, nodeIds }
}

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return cloneJsonValue(value as Record<string, unknown>)
}

/**
 * Converts untrusted sandbox output into node-id keyed configuration patches.
 * Identity and structure are selected exclusively from the host-retained map.
 */
export function normalizePageCodeOutput(
  output: unknown,
  drafts: PageCodeDraftSet,
): PageCodeRuntimeValues {
  const record = plainRecord(output) ?? {}
  const returnedElements = plainRecord(record.elements) ?? {}
  const nodes: Record<string, Partial<PageCodeElementDraft>> = Object.create(null)
  for (const [alias, nodeId] of Object.entries(drafts.nodeIds)) {
    const candidate = plainRecord(returnedElements[alias])
    if (!candidate) continue
    const patch: Partial<PageCodeElementDraft> = {}
    const props = plainRecord(candidate.props)
    const style = plainRecord(candidate.style)
    const responsive = plainRecord(candidate.responsive)
    const bindings = plainRecord(candidate.bindings)
    if (props) patch.props = props
    if (style) patch.style = style as NodeStyle
    if (responsive) patch.responsive = responsive as ResponsiveNodeStyles
    if (bindings) patch.bindings = bindings as Record<string, PropertyBinding>
    if ('defaultValue' in candidate) patch.defaultValue = cloneJsonValue(candidate.defaultValue)
    patch.validation = candidate.validation === null
      ? null
      : (plainRecord(candidate.validation) as FieldValidation | undefined)
    patch.visibleWhen = candidate.visibleWhen === null
      ? null
      : (plainRecord(candidate.visibleWhen) as VisibleWhen | undefined)
    if (typeof candidate.enterSubmits === 'boolean') patch.enterSubmits = candidate.enterSubmits
    nodes[nodeId] = patch
  }
  const state = plainRecord(record.state) ?? {}
  const actionIds = Array.isArray(record.actionIds)
    ? record.actionIds.filter((id): id is string => typeof id === 'string')
    : []
  return { nodes, state, actionIds }
}

/** Applies one already-sanitized atomic result while preserving tree identity. */
export function applyPageCodeValues(schema: PageNode, values?: PageCodeRuntimeValues): PageNode {
  if (!values) return schema
  const walk = (node: PageNode): PageNode => {
    const patch = values.nodes[node.id]
    const children = 'children' in node && Array.isArray(node.children)
      ? node.children.map(walk)
      : undefined
    if (node.type === 'page') {
      const root = node as PageRootNode
      return {
        ...root,
        ...(patch?.style ? { style: cloneJsonValue(patch.style) } : {}),
        ...(patch?.responsive ? { responsive: cloneJsonValue(patch.responsive) } : {}),
        ...(typeof patch?.enterSubmits === 'boolean' ? { enterSubmits: patch.enterSubmits } : {}),
        children: children ?? root.children,
      }
    }
    const element = node as ElementNode
    return {
      ...element,
      ...(patch?.props ? { props: cloneJsonValue(patch.props) } : {}),
      ...(patch?.style ? { style: cloneJsonValue(patch.style) } : {}),
      ...(patch?.responsive ? { responsive: cloneJsonValue(patch.responsive) } : {}),
      ...(patch && 'validation' in patch
        ? { validation: patch.validation ?? undefined }
        : {}),
      ...(patch && 'visibleWhen' in patch
        ? { visibleWhen: patch.visibleWhen ?? undefined }
        : {}),
      ...(patch?.bindings ? { bindings: cloneJsonValue(patch.bindings) } : {}),
      ...(patch && 'defaultValue' in patch
        ? { defaultValue: cloneJsonValue(patch.defaultValue) }
        : {}),
      ...(children ? { children } : {}),
    } as PageNode
  }
  return walk(schema)
}

/**
 * Host-generated SES script. Page source is a JavaScript expression returning
 * `definePage({ state, compute, actions })`; capabilities are available only
 * as properties of the scope when the host grants their endowment object.
 */
export function pageCodeRuntimeSource(source: string): string {
  return `async (input, capabilities) => {
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  const clone = (value) => {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const result = Object.create(null);
    for (const key of Object.keys(value)) {
      if (!forbidden.has(key)) result[key] = clone(value[key]);
    }
    return result;
  };
  const i18n = Object.freeze({
    text: (key, params, fallback) => ({ source: 'translation', key, ...(params ? { params } : {}), ...(fallback === undefined ? {} : { fallback }) }),
  });
  const definePage = (definition) => definition;
  const definition = (${source || DEFAULT_PAGE_CODE}\n);
  if (!definition || typeof definition !== 'object') throw new TypeError('Page Code must call definePage({...}).');
  const state = Object.assign(clone(definition.state || {}), clone(input.state || {}));
  const elements = clone(input.elements || {});
  const scope = {
    elements,
    fields: input.fields || {},
    form: input.form || {},
    state,
    context: input.context || {},
    resources: input.resources || {},
    viewport: input.viewport || {},
    payload: input.payload || {},
  };
  for (const name of Object.keys(capabilities || {})) scope[name] = capabilities[name];
  const actions = definition.actions || {};
  if (input.kind === 'action') {
    const action = actions[input.actionId];
    if (typeof action !== 'function') throw new Error('Unknown Page Code action "' + input.actionId + '".');
    await action(scope);
  }
  if (typeof definition.compute === 'function') await definition.compute(scope);
  return { elements, state, actionIds: Object.keys(actions) };
}`
}

/** Evaluates only the page-authored initial state declaration. */
export function pageStateRuntimeSource(source: string): string {
  return `(input) => {
  const definePageState = (value) => value;
  const value = (${source || DEFAULT_PAGE_STATE_CODE}\n);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Page State must call definePageState({...}).');
  }
  return value;
}`
}

/** Pure reactive binding. Property reads on the supplied scope are tracked by the Worker. */
export function elementComputeRuntimeSource(
  source: string,
  elementName: string,
  clickActionId: string,
): string {
  const hasClickAction = elementCodeHasClickAction(source)
  const legacyComputeSignature = !/\bcompute\s*\(\s*element\s*,\s*page\s*\)/.test(source)
  return `(scope) => {
  const clone = (value) => {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const result = Object.create(null);
    for (const key of Object.keys(value)) {
      if (key !== '__proto__' && key !== 'prototype' && key !== 'constructor') result[key] = clone(value[key]);
    }
    return result;
  };
  const i18n = Object.freeze({
    text: (key, params, fallback) => ({ source: 'translation', key, ...(params ? { params } : {}), ...(fallback === undefined ? {} : { fallback }) }),
  });
  const defineElement = (definition) => definition;
  const definition = (${source || DEFAULT_ELEMENT_CODE}\n);
  if (!definition || typeof definition !== 'object') throw new TypeError('Element Code must call defineElement({...}).');
  const self = clone(scope.elements[${JSON.stringify(elementName)}]);
  if (!self) throw new Error('Element ${elementName.replaceAll("'", "\\'")} is not available.');
  if (typeof definition.compute === 'function') {
    const element = Object.assign({}, self);
    const page = {
      state: scope.state || {},
      fields: scope.fields || {},
      form: scope.form || {},
      context: scope.context || {},
      resources: scope.resources || {},
      viewport: scope.viewport || {},
      viewState: scope.viewState,
      locale: scope.locale,
    };
    let computedElement = element;
    if (${JSON.stringify(legacyComputeSignature)}) {
      computedElement = Object.assign({}, element, page, { self, elements: scope.elements || {} });
      definition.compute(computedElement);
    } else {
      definition.compute(element, page);
    }
    for (const key of ['props', 'style', 'responsive', 'validation', 'visibleWhen', 'bindings', 'defaultValue']) {
      if (key in computedElement) self[key] = computedElement[key];
    }
  }
  if (${JSON.stringify(hasClickAction)} && definition.actions && typeof definition.actions.click === 'function') {
    self.props = self.props || {};
    self.props.action = ${JSON.stringify(clickActionId)};
  }
  return self;
}`
}

/** Pure reactive binding for the page root's controlled presentation draft. */
export function pageRootComputeRuntimeSource(source: string): string {
  return `(scope) => {
  const clone = (value) => {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const result = Object.create(null);
    for (const key of Object.keys(value)) {
      if (key !== '__proto__' && key !== 'prototype' && key !== 'constructor') result[key] = clone(value[key]);
    }
    return result;
  };
  const definePageRoot = (definition) => definition;
  const definition = (${source || DEFAULT_PAGE_ROOT_CODE}\n);
  if (!definition || typeof definition !== 'object') throw new TypeError('Page Root Code must call definePageRoot({...}).');
  const current = clone(scope.elements.page);
  if (!current) throw new Error('Page root is not available.');
  const page = {
    id: current.id,
    type: current.type,
    name: current.name,
    style: clone(current.style || {}),
    responsive: clone(current.responsive || {}),
    enterSubmits: !!current.enterSubmits,
  };
  const runtime = {
    state: scope.state || {},
    fields: scope.fields || {},
    form: scope.form || {},
    context: scope.context || {},
    resources: scope.resources || {},
    viewport: scope.viewport || {},
    viewState: scope.viewState,
    locale: scope.locale,
  };
  if (typeof definition.compute === 'function') definition.compute(page, runtime);
  return {
    id: current.id,
    type: current.type,
    name: current.name,
    style: page.style,
    responsive: page.responsive,
    enterSubmits: page.enterSubmits,
  };
}`
}

/** Async action wrapper. Only returned shared state crosses back to the host. */
export function elementActionRuntimeSource(source: string, elementName: string): string {
  const legacyActionSignature = !/\b(?:async\s+)?click\s*\(\s*element\s*,\s*page\s*,\s*action\s*\)/.test(source)
  return `async (input, capabilities) => {
  const clone = (value) => {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    const result = Object.create(null);
    for (const key of Object.keys(value)) {
      if (key !== '__proto__' && key !== 'prototype' && key !== 'constructor') result[key] = clone(value[key]);
    }
    return result;
  };
  const i18n = Object.freeze({
    text: (key, params, fallback) => ({ source: 'translation', key, ...(params ? { params } : {}), ...(fallback === undefined ? {} : { fallback }) }),
  });
  const defineElement = (definition) => definition;
  const definition = (${source || DEFAULT_ELEMENT_CODE}\n);
  const action = definition && definition.actions && definition.actions[input.actionName];
  if (typeof action !== 'function') throw new Error('Unknown element action "' + input.actionName + '".');
  const self = clone(input.elements[${JSON.stringify(elementName)}]);
  if (!self) throw new Error('Element ${elementName.replaceAll("'", "\\'")} is not available.');
  const element = Object.assign({}, self);
  const page = {
    state: clone(input.state || {}),
    fields: input.fields || {},
    form: input.form || {},
    context: input.context || {},
    resources: input.resources || {},
    viewport: input.viewport || {},
    viewState: input.viewState,
    locale: input.locale,
  };
  const actionContext = { payload: input.payload || {} };
  for (const name of Object.keys(capabilities || {})) page[name] = capabilities[name];
  if (${JSON.stringify(legacyActionSignature)}) {
    const legacy = Object.assign({}, element, page, actionContext, { self, elements: input.elements || {} });
    for (const name of Object.keys(capabilities || {})) legacy[name] = capabilities[name];
    await action(legacy);
  } else {
    await action(element, page, actionContext);
  }
  return { state: page.state };
}`
}
