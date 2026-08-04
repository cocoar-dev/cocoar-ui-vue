import { describe, expect, it } from 'vitest'
import { validatePageDocument } from './documentValidation'
import type { PageConfig, PageNode } from './schema'

const config: PageConfig = {
  allowedElements: ['heading', 'repeat', 'checkbox'],
  contextFields: [{ path: 'items', type: 'array', itemFields: [{ path: 'id', type: 'string' }] }],
  requiredNodes: [{ id: 'warning', type: 'heading' }],
}

describe('runtime document activation', () => {
  it('accepts a contracted document', () => {
    const schema = { id: 'root', type: 'page', children: [{ id: 'warning', type: 'heading', name: 'warning', props: { text: 'Warning' } }] } as PageNode
    expect(validatePageDocument(schema, config)).toEqual({ valid: true, issues: [] })
  })

  it('rejects missing required nodes and unknown repeat paths', () => {
    const schema = { id: 'root', type: 'page', children: [{ id: 'r', type: 'repeat', name: 'items', props: { source: 'secret', keyPath: 'id' }, children: [] }] } as PageNode
    const result = validatePageDocument(schema, config)
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.field)).toContain('props.source')
    expect(result.issues.map((issue) => issue.field)).toContain('requiredNodes')
  })
})
