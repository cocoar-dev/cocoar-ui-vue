import { describe, expect, it } from 'vitest'
import { evaluateCondition } from './conditions'

const sources = {
  field: (path: string) => ({ plan: 'pro' } as Record<string, unknown>)[path],
  context: (path: string) => ({ enabled: true, items: [1] } as Record<string, unknown>)[path],
  item: (path: string) => ({ required: false } as Record<string, unknown>)[path],
  state: () => 'prompt',
}

describe('bounded conditions', () => {
  it('supports legacy and host sources', () => {
    expect(evaluateCondition({ field: 'plan', equals: 'pro' }, sources)).toBe(true)
    expect(evaluateCondition({ source: 'state', operator: 'equals', value: 'prompt' }, sources)).toBe(true)
    expect(evaluateCondition({ source: 'context', path: 'items', operator: 'isNotEmpty' }, sources)).toBe(true)
    expect(evaluateCondition({ source: 'item', path: 'required', operator: 'equals', value: true }, sources)).toBe(false)
  })

  it('supports bounded all/any composition', () => {
    expect(evaluateCondition({ all: [
      { source: 'context', path: 'enabled', operator: 'equals', value: true },
      { any: [{ source: 'state', operator: 'equals', value: 'error' }, { field: 'plan', equals: 'pro' }] },
    ] }, sources)).toBe(true)
  })
})
