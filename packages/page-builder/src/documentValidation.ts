import type { ActionProps, ElementNode, PageConfig, PageNode, PageRootNode, RepeatNode, RuntimeBinding, VisibleWhen } from './schema'
import { isElementAllowed } from './schema'
import { isValidElementName } from './builder/nodeDefaults'
import { isJsonSafeActionValue, isJsonSafeActionValues, isSafeActionValueField } from './actionValues'
import { BUILTIN_ELEMENTS } from './elements/builtins'

export interface PageDocumentIssue {
  nodeId?: string
  field: string
  message: string
}

export interface PageDocumentValidationResult {
  valid: boolean
  issues: PageDocumentIssue[]
}

function directBindings(node: ElementNode): RuntimeBinding[] {
  const result: RuntimeBinding[] = []
  for (const binding of Object.values(node.bindings ?? {})) {
    if ('source' in binding) {
      if (binding.source !== 'expression' && binding.source !== 'translation') result.push(binding)
    } else if ('placeholders' in binding) {
      result.push(...Object.values(binding.placeholders))
    }
  }
  return result
}

function containsElementCode(node: PageNode): boolean {
  if (node.type !== 'page' && !!(node as ElementNode).elementCode?.trim()) return true
  return 'children' in node && Array.isArray(node.children) && node.children.some(containsElementCode)
}

export function validatePageDocument(schema: PageNode, config?: PageConfig): PageDocumentValidationResult {
  const issues: PageDocumentIssue[] = []
  if (!schema || schema.type !== 'page') return { valid: false, issues: [{ field: 'root', message: 'Document root must be a page.' }] }
  const maxNodes = Math.min(Math.max(config?.documentLimits?.maxNodes ?? 1000, 1), 10_000)
  const maxDepth = Math.min(Math.max(config?.documentLimits?.maxDepth ?? 40, 1), 100)
  const ids = new Set<string>()
  const names = new Set<string>()
  const pageCode = (schema as PageRootNode).pageCode
  const rootCode = (schema as PageRootNode).rootCode
  const stateCode = (schema as PageRootNode).stateCode
  const codeDriven = !!pageCode?.trim() || !!rootCode?.trim() || !!stateCode?.trim() || containsElementCode(schema)
  if (pageCode && pageCode.length > 50_000) issues.push({ nodeId: schema.id, field: 'pageCode', message: 'Legacy Page Code exceeds 50,000 characters.' })
  if (rootCode && rootCode.length > 50_000) issues.push({ nodeId: schema.id, field: 'rootCode', message: 'Page Root Code exceeds 50,000 characters.' })
  if (stateCode && stateCode.length > 50_000) issues.push({ nodeId: schema.id, field: 'stateCode', message: 'Page State exceeds 50,000 characters.' })
  const nodesById = new Map<string, PageNode>()
  const registry = { ...BUILTIN_ELEMENTS, ...(config?.elements ?? {}) }
  const fieldNames = new Set<string>()
  const selectionNames = new Set<string>()
  const repeatAncestor = new Map<string, RepeatNode | undefined>()
  const indexContracts = (node: PageNode, parentRepeat?: RepeatNode) => {
    repeatAncestor.set(node.id, parentRepeat)
    if (node.type !== 'page') {
      const element = node as ElementNode
      if (registry[node.type]?.value && isValidElementName(element.name) && element.name !== '$selection') {
        fieldNames.add(element.name!)
      }
      if (node.type === 'repeat') {
        const selectionName = (node as RepeatNode).props.selection?.name
        if (selectionName) selectionNames.add(selectionName)
      }
    }
    const nextRepeat = node.type === 'repeat' ? node as RepeatNode : parentRepeat
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) indexContracts(child, nextRepeat)
    }
  }
  indexContracts(schema)
  let count = 0

  const validateCondition = (node: PageNode, condition: VisibleWhen, depth: number) => {
    if (depth > 4) { issues.push({ nodeId: node.id, field: 'visibleWhen', message: 'Condition nesting exceeds 4.' }); return }
    for (const child of condition.all ?? condition.any ?? []) validateCondition(node, child, depth + 1)
    if (condition.source === 'context' && !config?.contextFields?.some((field) => field.path === condition.path)) {
      issues.push({ nodeId: node.id, field: 'visibleWhen.path', message: `Unknown context path "${String(condition.path ?? '')}".` })
    }
    if (condition.source === 'state' && condition.operator === 'equals' && config?.availableStates && !config.availableStates.some((state) => state.id === condition.value)) {
      issues.push({ nodeId: node.id, field: 'visibleWhen.value', message: `Unknown state "${String(condition.value ?? '')}".` })
    }
    if (condition.source === 'item' && !config?.contextFields?.some((field) => field.itemFields?.some((item) => item.path === condition.path))) {
      issues.push({ nodeId: node.id, field: 'visibleWhen.path', message: `Unknown item path "${String(condition.path ?? '')}".` })
    }
  }

  const walk = (node: PageNode, depth: number) => {
    count += 1
    if (count > maxNodes) return
    if (depth > maxDepth) { issues.push({ nodeId: node.id, field: 'children', message: `Document exceeds maximum depth ${maxDepth}.` }); return }
    if (!node.id || ids.has(node.id)) issues.push({ nodeId: node.id, field: 'id', message: 'Node id is missing or duplicated.' })
    ids.add(node.id)
    nodesById.set(node.id, node)
    if (!isElementAllowed(node.type, config)) issues.push({ nodeId: node.id, field: 'type', message: `Element "${node.type}" is not allowed.` })
    if (node.type !== 'page') {
      const element = node as ElementNode
      if (element.elementCode && element.elementCode.length > 50_000) {
        issues.push({ nodeId: node.id, field: 'elementCode', message: 'Element Code exceeds 50,000 characters.' })
      }
      if (!isValidElementName(element.name)) {
        issues.push({ nodeId: node.id, field: 'name', message: 'Element name is missing or is not a safe JavaScript identifier.' })
      } else if (names.has(element.name)) {
        issues.push({ nodeId: node.id, field: 'name', message: `Element name "${element.name}" is duplicated.` })
      } else {
        names.add(element.name)
      }
      for (const [target, binding] of Object.entries(element.bindings ?? {})) {
        if ('source' in binding && binding.source === 'expression') {
          const source = typeof binding.expression === 'string' ? binding.expression.trim() : ''
          if (!source) issues.push({ nodeId: node.id, field: `bindings.${target}`, message: 'Expression binding is empty.' })
          else if (source.length > 10_000) issues.push({ nodeId: node.id, field: `bindings.${target}`, message: 'Expression binding exceeds 10,000 characters.' })
        }
      }
      for (const binding of directBindings(element)) {
        if (binding.source === 'context' && !config?.contextFields?.some((field) => field.path === binding.path)) {
          issues.push({ nodeId: node.id, field: 'bindings', message: `Unknown context binding "${String(binding.path ?? '')}".` })
        }
        if (binding.source === 'state' && !binding.path) {
          issues.push({ nodeId: node.id, field: 'bindings', message: 'Page-state binding requires a path.' })
        }
        const repeat = repeatAncestor.get(node.id)
        const repeatContract = config?.contextFields?.find((field) => field.path === repeat?.props.source && field.type === 'array')
        if (binding.source === 'item' && !repeatContract?.itemFields?.some((item) => item.path === binding.path)) {
          issues.push({ nodeId: node.id, field: 'bindings', message: `Unknown item binding "${String(binding.path ?? '')}".` })
        }
        if (binding.source === 'index' && !repeat) {
          issues.push({ nodeId: node.id, field: 'bindings', message: 'Repeat-index binding is outside a Repeat.' })
        }
        if (binding.source === 'field' && (!binding.path || !fieldNames.has(binding.path))) {
          issues.push({ nodeId: node.id, field: 'bindings', message: `Unknown form-field binding "${String(binding.path ?? '')}".` })
        }
        if (binding.source === 'selection' && (!binding.path || !selectionNames.has(binding.path))) {
          issues.push({ nodeId: node.id, field: 'bindings', message: `Unknown selection binding "${String(binding.path ?? '')}".` })
        }
      }
      if (element.visibleWhen) validateCondition(node, element.visibleWhen, 0)
      const actionCapable = node.type === 'button' || node.type === 'link' || config?.elements?.[node.type]?.action
      if (actionCapable) {
        const actionProps = element.props as ActionProps
        const action = actionProps.action
        if (config?.availableActions && typeof action === 'string' && action && !config.availableActions.some((entry) => entry.id === action)) {
          issues.push({ nodeId: node.id, field: 'props.action', message: `Unknown action "${action}".` })
        }
        if (actionProps.actionValues !== undefined && !isJsonSafeActionValues(actionProps.actionValues)) {
          issues.push({ nodeId: node.id, field: 'props.actionValues', message: 'Action values must be a JSON-safe object.' })
        }
        if (actionProps.actionValueField !== undefined && !isSafeActionValueField(actionProps.actionValueField)) {
          issues.push({ nodeId: node.id, field: 'props.actionValueField', message: 'Dynamic action-value key is empty or reserved.' })
        }
        if (actionProps.actionValue !== undefined && !isJsonSafeActionValue(actionProps.actionValue)) {
          issues.push({ nodeId: node.id, field: 'props.actionValue', message: 'Dynamic action value must be JSON-safe.' })
        }
      }
    }
    if (node.type === 'repeat') {
      const repeat = node as RepeatNode
      if (Array.isArray(repeat.props.items)) {
        if (repeat.props.items.length > 500) {
          issues.push({ nodeId: node.id, field: 'props.items', message: 'Repeat runtime items exceed the maximum of 500.' })
        }
      } else if (repeat.props.source || !codeDriven) {
      const contract = config?.contextFields?.find((field) => field.path === repeat.props.source && field.type === 'array')
      if (!contract) issues.push({ nodeId: node.id, field: 'props.source', message: `Repeat source "${repeat.props.source}" is not an allowed array.` })
      else {
        const allowed = new Set(contract.itemFields?.map((field) => field.path) ?? [])
        if (repeat.props.keyPath && !allowed.has(repeat.props.keyPath)) issues.push({ nodeId: node.id, field: 'props.keyPath', message: `Repeat key "${repeat.props.keyPath}" is not allowed.` })
        const selection = repeat.props.selection
        if (selection && (!allowed.has(selection.valuePath) || (selection.requiredPath && !allowed.has(selection.requiredPath)))) {
          issues.push({ nodeId: node.id, field: 'props.selection', message: 'Repeat selection references an unknown item path.' })
        }
      }
      }
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach((child) => walk(child, depth + 1))
  }
  walk(schema, 0)
  if (count > maxNodes) issues.push({ field: 'document', message: `Document exceeds maximum node count ${maxNodes}.` })

  return { valid: issues.length === 0, issues }
}

