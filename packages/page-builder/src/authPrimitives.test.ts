import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CoarPageRenderer from './CoarPageRenderer.vue'
import type { PageConfig, PageNode } from './schema'

const config: PageConfig = {
  allowedElements: ['repeat', 'stack', 'checkbox', 'paragraph', 'feedback', 'button'],
  availableActions: [{ id: 'save', label: 'Save' }],
  contextFields: [{
    path: 'items', type: 'array', itemFields: [
      { path: 'id', type: 'string' }, { path: 'label', type: 'string' }, { path: 'required', type: 'boolean' },
    ],
  }],
}

const schema = {
  id: 'root', type: 'page', children: [
    {
      id: 'items', type: 'repeat',
      props: { source: 'items', keyPath: 'id', selection: { name: 'selected', valuePath: 'id', requiredPath: 'required', defaultSelection: 'all' } },
      children: [{ id: 'choice', type: 'checkbox', name: '$selection', props: { label: '' }, bindings: { label: { source: 'item', path: 'label' } } }],
    },
    { id: 'error', type: 'feedback', props: { kind: 'form-error' } },
    { id: 'save', type: 'button', props: { label: 'Save', action: 'save' } },
  ],
} as PageNode

describe('generic auth-grade primitives', () => {
  it('emits a freely named selected-key array and keeps required items selected', async () => {
    const save = vi.fn()
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema, config, actions: { save },
        runtimeContext: { items: [{ id: 'a', label: 'Required A', required: true }, { id: 'b', label: 'Optional B', required: false }] },
      },
    })
    await flushPromises()
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(2)
    expect(boxes[0].attributes('disabled')).toBeDefined()
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(true)
    await boxes[1].setValue(false)
    await wrapper.find('button').trigger('click')
    expect(save).toHaveBeenCalledWith({ selected: ['a'] })
  })

  it('default-selects items that arrive later without reselecting an unchecked item', async () => {
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema, config,
        runtimeContext: { items: [{ id: 'a', label: 'A', required: false }] },
      },
    })
    await flushPromises()
    const original = wrapper.find('input[type="checkbox"]')
    await original.setValue(false)

    await wrapper.setProps({
      runtimeContext: {
        items: [
          { id: 'a', label: 'A', required: false },
          { id: 'b', label: 'B', required: false },
        ],
      },
    })
    await flushPromises()

    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect((boxes[0].element as HTMLInputElement).checked).toBe(false)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(true)
  })

  it('removes stale values, de-duplicates them, and follows the current item order', async () => {
    const save = vi.fn()
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema, config, actions: { save },
        runtimeContext: { items: [
          { id: 'a', label: 'A', required: false },
          { id: 'b', label: 'B', required: false },
          { id: 'c', label: 'C', required: false },
        ] },
      },
    })
    await flushPromises()

    await wrapper.setProps({
      runtimeContext: { items: [
        { id: 'c', label: 'C', required: false },
        { id: 'a', label: 'A', required: false },
        { id: 'a', label: 'Duplicate A', required: false },
      ] },
    })
    await flushPromises()
    await wrapper.find('button').trigger('click')
    expect(save).toHaveBeenCalledWith({ selected: ['c', 'a'] })
  })

  it('merges host initial selection with required items without selecting every optional item', async () => {
    const save = vi.fn()
    const noneByDefault = structuredClone(schema) as PageNode
    const repeat = (noneByDefault as Extract<PageNode, { type: 'page' }>).children[0] as Extract<PageNode, { type: 'repeat' }>
    repeat.props.selection!.defaultSelection = 'none'
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema: noneByDefault, config, actions: { save }, initialValues: { selected: ['b'] },
        runtimeContext: { items: [
          { id: 'a', label: 'Required A', required: true },
          { id: 'b', label: 'Optional B', required: false },
          { id: 'c', label: 'Optional C', required: false },
        ] },
      },
    })
    await flushPromises()
    await wrapper.find('button').trigger('click')
    expect(save).toHaveBeenCalledWith({ selected: ['a', 'b'] })
  })

  it('renders action failures at the authored feedback node and preserves values', async () => {
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema, config,
        actions: { save: async () => { throw new Error('Retry here') } },
        runtimeContext: { items: [{ id: 'a', label: 'A', required: false }] },
      },
    })
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.pb-feedback').text()).toContain('Retry here')
    expect(wrapper.find('.pb-form-error').exists()).toBe(false)
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)

    await wrapper.setProps({
      runtimeContext: { items: [{ id: 'a', label: 'A', required: false }] },
    })
    await flushPromises()
    expect(wrapper.find('.pb-feedback').text()).toContain('Retry here')
  })
})
