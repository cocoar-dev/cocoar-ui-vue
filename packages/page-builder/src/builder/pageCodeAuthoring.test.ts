import { describe, expect, it } from 'vitest'
import type { ElementNode, PageNode } from '../schema'
import { elementCodeTypeLibrary } from './pageCodeAuthoring'

const button: ElementNode = {
  id: 'submit-button',
  type: 'button',
  name: 'submitButton',
  props: { label: 'Sign in', disabled: false },
}

const schema: PageNode = {
  id: 'root',
  type: 'page',
  children: [button],
}

describe('Element Code authoring types', () => {
  it('keeps the current element separate from page and action context', () => {
    const content = elementCodeTypeLibrary(schema, button).at(-1)?.content ?? ''

    expect(content).toContain('compute?: (element: E, page: PageComputeContext<S>) => void;')
    expect(content).toContain('readonly type: "button";')
    expect(content).toContain('readonly name: "submitButton";')
    expect(content).toContain('state: S;')
    expect(content).toContain('readonly payload: Readonly<Record<string, unknown>>;')
    expect(content).not.toContain('readonly elements:')
    expect(content).not.toContain('ElementComputeContext')
  })

  it('exposes allowlisted host context as the nested object shape scripts receive', () => {
    const content = elementCodeTypeLibrary(schema, button, {
      contextFields: [
        { path: 'auth.internalLoginEnabled', type: 'boolean' },
        {
          path: 'auth.externalProviders',
          type: 'array',
          itemFields: [{ path: 'id', type: 'string' }, { path: 'name', type: 'string' }],
        },
      ],
    }).map((library) => library.content).join('\n')

    expect(content).toContain('readonly "auth": Readonly<{')
    expect(content).toContain('readonly "internalLoginEnabled": boolean;')
    expect(content).toContain('readonly "externalProviders": readonly Readonly<{ readonly "id": string; readonly "name": string; }>[];')
    expect(content).not.toContain('readonly "auth.internalLoginEnabled"')
  })
})
