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

  it('rejects non-JSON action values at the activation boundary', () => {
    const schema = {
      id: 'root', type: 'page', children: [{
        id: 'action', type: 'button', name: 'action',
        props: {
          label: 'Run', action: 'run',
          actionValues: [] as unknown as Record<string, unknown>,
          actionValueField: 'constructor',
          actionValue: Number.POSITIVE_INFINITY,
        },
      }],
    } as PageNode
    const result = validatePageDocument(schema, { allowedElements: ['button'] })
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      'props.actionValues', 'props.actionValueField', 'props.actionValue',
    ]))
  })

  it('validates new direct-binding sources at activation', () => {
    const schema = {
      id: 'root', type: 'page', children: [
        { id: 'email', type: 'text-input', name: 'email', props: {} },
        {
          id: 'repeat', type: 'repeat', name: 'repeat',
          props: {
            source: 'items', keyPath: 'id',
            selection: { name: 'selectedIds', valuePath: 'id' },
          },
          children: [{
            id: 'inside', type: 'heading', name: 'inside', props: { text: 'Item' },
            bindings: { text: { source: 'item', path: 'id' } },
          }],
        },
        {
          id: 'action', type: 'button', name: 'action', props: { label: 'Run', action: 'run' },
          bindings: {
            'actionValues.email': { source: 'field', path: 'email' },
            'actionValues.selectedIds': { source: 'selection', path: 'selectedIds' },
          },
        },
      ],
    } as PageNode
    const result = validatePageDocument(schema, {
      allowedElements: ['text-input', 'repeat', 'heading', 'button'],
      contextFields: [{ path: 'items', type: 'array', itemFields: [{ path: 'id', type: 'string' }] }],
    })
    expect(result).toEqual({ valid: true, issues: [] })

    const invalid = {
      id: 'root', type: 'page', children: [{
        id: 'action', type: 'button', name: 'action', props: { label: 'Run' },
        bindings: {
          title: { source: 'index' },
          label: { source: 'selection', path: 'missing' },
        },
      }],
    } as PageNode
    const invalidResult = validatePageDocument(invalid, { allowedElements: ['button'] })
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.issues.map((issue) => issue.field)).toContain('bindings')
  })
})
