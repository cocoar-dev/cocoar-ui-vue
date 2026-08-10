import type { VisibleWhen } from './schema'

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => sameValue(value, b[index]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as object)
    const bk = Object.keys(b as object)
    return ak.length === bk.length && ak.every((key) => sameValue(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ))
  }
  return false
}

export interface ConditionSources {
  field: (path: string) => unknown
  context: (path: string) => unknown
  item?: (path: string) => unknown
}

export function evaluateCondition(condition: VisibleWhen, sources: ConditionSources, depth = 0): boolean {
  if (!condition || typeof condition !== 'object' || depth > 4) return true
  if (Array.isArray(condition.all)) {
    if (condition.all.length > 20) return false
    return condition.all.every((child) => evaluateCondition(child, sources, depth + 1))
  }
  if (Array.isArray(condition.any)) {
    if (condition.any.length > 20) return false
    return condition.any.some((child) => evaluateCondition(child, sources, depth + 1))
  }

  // Backward-compatible field grammar.
  if (!condition.source && typeof condition.field === 'string' && condition.field) {
    const current = sources.field(condition.field)
    if ('equals' in condition) return sameValue(current, condition.equals)
    if (Array.isArray(condition.in)) return condition.in.some((value) => sameValue(current, value))
    return true
  }

  const source = condition.source
  if (!source) return true
  const path = condition.path ?? ''
  const current = source === 'item' ? sources.item?.(path) : sources[source](path)
  const operator = condition.operator ?? 'equals'
  const expected = condition.value
  if (operator === 'equals') return sameValue(current, expected)
  if (operator === 'notEquals') return !sameValue(current, expected)
  if (operator === 'in') return Array.isArray(expected) && expected.some((value) => sameValue(current, value))
  if (operator === 'notIn') return Array.isArray(expected) && !expected.some((value) => sameValue(current, value))
  if (operator === 'exists') return current !== undefined && current !== null
  if (operator === 'isEmpty') return Array.isArray(current) ? current.length === 0 : current === '' || current == null
  if (operator === 'isNotEmpty') return Array.isArray(current) ? current.length > 0 : current !== '' && current != null
  return true
}
