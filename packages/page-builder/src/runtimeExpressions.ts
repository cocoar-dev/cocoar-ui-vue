import type { ElementNode, PageNode, RuntimeExpressionBinding } from './schema'
import { isExpressionBinding, isExpressionBindingEnabled, runtimeExpressionKey } from './runtimeBindings'

export interface PageRuntimeExpressionDefinition {
  id: string
  nodeId: string
  target: string
  expression: string
}

/** Collects persisted expressions without compiling or evaluating tenant code. */
export function collectPageRuntimeExpressions(schema: PageNode): PageRuntimeExpressionDefinition[] {
  const result: PageRuntimeExpressionDefinition[] = []
  const walk = (node: PageNode) => {
    if (node.type !== 'page') {
      for (const [target, binding] of Object.entries((node as ElementNode).bindings ?? {})) {
        if (!isExpressionBinding(binding) || !isExpressionBindingEnabled(binding)) continue
        result.push({
          id: runtimeExpressionKey(node.id, target),
          nodeId: node.id,
          target,
          expression: binding.expression,
        })
      }
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk)
  }
  walk(schema)
  return result
}

/**
 * Wraps one authored JavaScript expression in the pure binding function shape
 * consumed by the SES runtime. The newline prevents a trailing line comment
 * in user source from swallowing the closing parenthesis.
 */
export function pageRuntimeExpressionSource(binding: Pick<RuntimeExpressionBinding, 'expression'>): string {
  return `({ fields, form, context, resources, viewport }) => (\n${binding.expression}\n)`
}
