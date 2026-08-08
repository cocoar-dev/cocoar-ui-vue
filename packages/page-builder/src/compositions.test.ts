import { describe, expect, it } from 'vitest'
import type { ElementNode, PageRootNode } from './schema'
import {
  compilePageCompositions,
  compositionTemplateFromInstance,
  createInMemoryPageCompositionRepository,
  detachPageComposition,
  linkExistingCompositionInstance,
  materializePageComposition,
  validatePageCompositionReferences,
  type PageCompositionDefinition,
} from './compositions'

function template(text = 'Brand'): ElementNode {
  return {
    id: 'source-stack',
    type: 'stack',
    name: 'brandPanel',
    props: { direction: 'column' },
    children: [{ id: 'source-heading', type: 'heading', name: 'brandHeading', props: { text } }],
  }
}

function definition(version = '1', text = 'Brand'): PageCompositionDefinition {
  return { id: 'brand-panel', name: 'Brand panel', version, root: template(text) }
}

function page(children: ElementNode[] = []): PageRootNode {
  return { id: 'page', type: 'page', schemaVersion: 5, children }
}

describe('page compositions', () => {
  it('materializes independent normal subtrees with unique ids and names', () => {
    const first = materializePageComposition(definition(), { page: page() })
    const second = materializePageComposition(definition(), { page: page([first]) })

    expect(first.type).toBe('stack')
    expect(first.composition).toEqual({ id: 'brand-panel', version: '1' })
    expect(first.compositionOrigins).toContainEqual({ id: 'brand-panel', sourceNodeId: 'source-stack' })
    expect(first.id).not.toBe(second.id)
    expect(first.name).toBe('brandPanel')
    expect(second.name).toBe('brandPanel2')
    expect(first.children?.[0].id).not.toBe(second.children?.[0].id)
    expect((second.children?.[0] as ElementNode).name).toBe('brandHeading2')
  })

  it('preserves instance ids and public names when updating to another version', () => {
    const first = materializePageComposition(definition(), { page: page() })
    const oldRootId = first.id
    const oldChildId = first.children?.[0].id
    const updatedDefinition = definition('2', 'Updated brand')
    updatedDefinition.root.children!.push({
      id: 'source-copy',
      type: 'paragraph',
      name: 'brandCopy',
      props: { text: 'New' },
    })

    const updated = materializePageComposition(updatedDefinition, { page: page([first]), existing: first })

    expect(updated.id).toBe(oldRootId)
    expect(updated.name).toBe('brandPanel')
    expect(updated.children?.[0].id).toBe(oldChildId)
    expect((updated.children?.[0] as ElementNode<{ text: string }>).props.text).toBe('Updated brand')
    expect(updated.children?.[1].compositionOrigins).toContainEqual({ id: 'brand-panel', sourceNodeId: 'source-copy' })
    expect(updated.composition?.version).toBe('2')
  })

  it('links the source instance without changing its ids and detaches without changing content', () => {
    const original = template()
    const linked = linkExistingCompositionInstance(original, definition())
    const detached = detachPageComposition(linked)

    expect(linked.id).toBe(original.id)
    expect(linked.children?.[0].id).toBe(original.children?.[0].id)
    expect(detached).toEqual(original)
  })

  it('detaches an outer composition without losing a nested composition link', () => {
    const innerDefinition: PageCompositionDefinition = {
      id: 'inner', name: 'Inner', version: '1', root: template('Inner'),
    }
    const inner = materializePageComposition(innerDefinition, { page: page() })
    const outerDefinition: PageCompositionDefinition = {
      id: 'outer',
      name: 'Outer',
      version: '1',
      root: {
        id: 'outer-root', type: 'stack', name: 'outerRoot', props: { direction: 'column' }, children: [inner],
      },
    }
    const outer = materializePageComposition(outerDefinition, { page: page() })
    const detachedOuter = detachPageComposition(outer)
    const nested = detachedOuter.children?.[0] as ElementNode

    expect(detachedOuter.composition).toBeUndefined()
    expect(detachedOuter.compositionOrigins).toBeUndefined()
    expect(nested.composition).toEqual({ id: 'inner', version: '1' })
    expect(nested.compositionOrigins).toContainEqual({ id: 'inner', sourceNodeId: 'source-stack' })
    expect(nested.compositionOrigins?.some((origin) => origin.id === 'outer')).toBe(false)
  })

  it('compiles a runtime tree with no composition metadata', () => {
    const linked = materializePageComposition(definition(), { page: page() })
    const compiled = compilePageCompositions(page([linked]))
    const serialized = JSON.stringify(compiled)

    expect(serialized).not.toContain('composition')
    expect(compiled.children[0].type).toBe('stack')
    expect((compiled.children[0] as ElementNode).children?.[0].type).toBe('heading')
  })

  it('turns local instance changes back into stable template ids', () => {
    const linked = materializePageComposition(definition(), { page: page() })
    ;(linked.children?.[0] as ElementNode<{ text: string }>).props.text = 'Edited'
    const result = compositionTemplateFromInstance(linked)

    expect(result.id).toBe('source-stack')
    expect(result.children?.[0].id).toBe('source-heading')
    expect((result.children?.[0] as ElementNode<{ text: string }>).props.text).toBe('Edited')
    expect(result.composition).toBeUndefined()
    expect(result.compositionOrigins).toBeUndefined()
  })

  it('rejects malformed templates before materializing them', () => {
    const malformed = definition()
    malformed.root.children!.push({
      id: 'source-heading',
      type: 'paragraph',
      name: 'duplicate',
      props: { text: 'Duplicate id' },
    })

    expect(() => materializePageComposition(malformed)).toThrow('duplicate node id')
  })

  it('provides immutable versions and optimistic concurrency in the in-memory repository', async () => {
    const repository = createInMemoryPageCompositionRepository()
    const created = await repository.create({ name: 'Brand panel', root: template() })
    const published = await repository.publish({ id: created.id, baseVersion: '1', root: template('V2') })

    expect(published.version).toBe('2')
    expect((await repository.get(created.id, '1'))?.root).toEqual(template())
    expect((await repository.get(created.id))?.version).toBe('2')
    await expect(Promise.resolve().then(() => repository.publish({ id: created.id, baseVersion: '1', root: template() })))
      .rejects.toThrow('changed from 1 to 2')
  })

  it('reports missing references and cycles', async () => {
    const nested = template()
    nested.composition = { id: 'missing', version: '1' }
    const repository = createInMemoryPageCompositionRepository([{
      id: 'cycle-a',
      name: 'Cycle A',
      version: '1',
      root: {
        ...template(),
        composition: undefined,
        children: [{ ...template(), id: 'nested-b', composition: { id: 'cycle-b', version: '1' } }],
      },
    }, {
      id: 'cycle-b',
      name: 'Cycle B',
      version: '1',
      root: {
        ...template(),
        composition: undefined,
        children: [{ ...template(), id: 'nested-a', composition: { id: 'cycle-a', version: '1' } }],
      },
    }])

    const missingIssues = await validatePageCompositionReferences(page([nested]), repository)
    expect(missingIssues).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'missing', compositionId: 'missing' })]))

    const cycleRoot = template()
    cycleRoot.composition = { id: 'cycle-a', version: '1' }
    const cycleIssues = await validatePageCompositionReferences(page([cycleRoot]), repository)
    expect(cycleIssues.some((issue) => issue.kind === 'cycle')).toBe(true)
  })

  it('reports incomplete builder metadata as an invalid reference', async () => {
    const malformed = template()
    malformed.composition = { id: 'brand-panel' } as unknown as PageCompositionDefinition['root']['composition']

    const issues = await validatePageCompositionReferences(page([malformed]), createInMemoryPageCompositionRepository())

    expect(issues).toEqual([expect.objectContaining({ kind: 'invalid-reference', nodeId: malformed.id })])
  })
})
