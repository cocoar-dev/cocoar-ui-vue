import { describe, expect, it } from 'vitest'
import type { PageNode } from './schema'
import { collectPageRuntimeExpressions, pageRuntimeExpressionSource } from './runtimeExpressions'
import { runtimeExpressionKey } from './runtimeBindings'

describe('page runtime expressions', () => {
  it('collects pure property expressions with stable ids', () => {
    const schema: PageNode = {
      id: 'root', type: 'page', children: [{
        id: 'button', type: 'button', props: { label: 'Go' },
        bindings: {
          disabled: { source: 'expression', expression: '!fields.name' },
          title: { source: 'expression', enabled: false, expression: 'fields.name' },
          label: { source: 'context', path: 'branding.label' },
        },
      }],
    }
    expect(collectPageRuntimeExpressions(schema)).toEqual([{
      id: runtimeExpressionKey('button', 'disabled'),
      nodeId: 'button',
      target: 'disabled',
      expression: '!fields.name',
    }])
  })

  it('wraps JavaScript source as a read-only binding function', () => {
    const source = pageRuntimeExpressionSource({ expression: 'fields.name?.length ?? 0' })
    expect(source).toContain('({ fields, form, context, resources, viewport }) =>')
    expect(source).toContain('fields.name?.length ?? 0')
  })
})
