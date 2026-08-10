import { describe, expect, it } from 'vitest'
import { enforceRequiredNodeLocks, validatePageDocument } from './documentValidation'
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

/**
 * The publication gate judges the persisted document, but Element Code patches
 * the tree afterwards. A lock that only holds until the first compute is not a
 * lock — so it is re-applied to the computed result.
 */
describe('enforceRequiredNodeLocks', () => {
  const config: PageConfig = {
    requiredNodes: [
      { id: 'legal', type: 'note', lockVisibility: true },
      { id: 'hint', type: 'note', lockStyle: true },
    ],
  }

  const computed = (patch: Record<string, unknown>, id = 'legal') => ({
    id: 'root',
    type: 'page',
    children: [
      { id, type: 'note', name: id, props: { text: 'x' }, ...patch },
      { id: 'free', type: 'note', name: 'free', props: { text: 'y' }, style: { hidden: true } },
    ],
  } as unknown as PageNode)

  const child = (schema: PageNode, index: number) =>
    (schema as unknown as { children: Array<Record<string, unknown>> }).children[index]

  it('drops a hidden that code put on a locked node, and leaves other nodes alone', () => {
    const result = enforceRequiredNodeLocks(computed({ style: { hidden: true, gap: '8px' } }), config)
    expect(child(result, 0).style).toEqual({ gap: '8px' })
    // An unlocked node keeps whatever code decided for it.
    expect(child(result, 1).style).toEqual({ hidden: true })
  })

  it('drops a visibleWhen condition code added to a visibility-locked node', () => {
    const result = enforceRequiredNodeLocks(
      computed({ visibleWhen: { field: 'x', equals: true } }),
      config,
    )
    expect(child(result, 0).visibleWhen).toBeUndefined()
  })

  it('strips hidden from every responsive layer, not just the base', () => {
    const result = enforceRequiredNodeLocks(
      computed({ responsive: { tablet: { hidden: true }, desktop: { gap: '4px' } } }),
      config,
    )
    expect(child(result, 0).responsive).toEqual({ desktop: { gap: '4px' } })
  })

  it('lockStyle also covers the quieter ways to disappear', () => {
    const result = enforceRequiredNodeLocks(
      computed({ style: { foreground: 'inverse', fontSize: 'caption', padding: '4px' } }, 'hint'),
      config,
    )
    expect(child(result, 0).style).toEqual({ padding: '4px' })
  })

  it('lockVisibility does not touch presentation it was never meant to guard', () => {
    const result = enforceRequiredNodeLocks(computed({ style: { foreground: 'inverse' } }), config)
    expect(child(result, 0).style).toEqual({ foreground: 'inverse' })
  })

  it('returns the very same tree when no lock is engaged, so rendering does not churn', () => {
    const schema = computed({ style: { gap: '8px' } })
    expect(enforceRequiredNodeLocks(schema, config)).toBe(schema)
    expect(enforceRequiredNodeLocks(schema, {})).toBe(schema)
  })
})
