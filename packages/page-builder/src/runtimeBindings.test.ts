import { describe, expect, it } from 'vitest'
import { readAllowedContext, resolveExpressionStyle, resolveNodeRuntime, resolvePropertyBinding, runtimeExpressionKey, safeReadPath } from './runtimeBindings'
import type { ElementNode, PageConfig, PageNode } from './schema'

const config: PageConfig = {
  contextFields: [
    { path: 'branding.name', type: 'string' },
    { path: 'items', type: 'array', itemFields: [{ path: 'label', type: 'string' }] },
  ],
  defaultLocale: 'en',
}
const context = { branding: { name: 'Acme', secret: 'nope' }, items: [] }

describe('safe runtime bindings', () => {
  it('reads only exact allowlisted paths', () => {
    expect(readAllowedContext(context, config, 'branding.name')).toBe('Acme')
    expect(readAllowedContext(context, config, 'branding.secret')).toBeUndefined()
    expect(safeReadPath(context, '__proto__.polluted')).toBeUndefined()
  })

  it('resolves localized templates with typed placeholders', () => {
    expect(resolvePropertyBinding({
      template: { localized: { de: 'Hallo {name}', en: 'Hello {name}' } },
      placeholders: { name: { source: 'context', path: 'branding.name' } },
    }, { config, context, locale: 'de' })).toBe('Hallo Acme')
  })

  it('resolves page translation keys, interpolation and locale fallback', () => {
    const runtime = {
      config,
      locale: 'de-AT',
      translations: {
        de: { 'auth.welcome': 'Hallo {name}' },
        en: { 'auth.welcome': 'Hello {name}' },
      },
    }
    expect(resolvePropertyBinding({
      source: 'translation',
      key: 'auth.welcome',
      params: { name: 'Ada' },
    }, runtime)).toBe('Hallo Ada')

    const node = {
      id: 'heading', type: 'heading', props: {
        text: { source: 'translation', key: 'auth.missing', fallback: 'Fallback copy' },
      },
    } as PageNode
    expect((resolveNodeRuntime(node, runtime) as ElementNode).props.text).toBe('Fallback copy')
  })

  it('rejects undeclared item properties', () => {
    expect(resolvePropertyBinding({ source: 'item', path: 'label' }, {
      item: { label: 'Allowed', secret: 'Hidden' }, allowedItemPaths: new Set(['label']),
    })).toBe('Allowed')
    expect(resolvePropertyBinding({ source: 'item', path: 'secret', fallback: 'fallback' }, {
      item: { secret: 'Hidden' }, allowedItemPaths: new Set(['label']),
    })).toBe('fallback')
  })

  it('maps resolved values onto props without mutating the document', () => {
    const node = { id: 'h', type: 'heading', props: { text: 'Default' }, bindings: { text: { source: 'context', path: 'branding.name' } } } as PageNode
    const resolved = resolveNodeRuntime(node, { config, context })
    expect((resolved as ElementNode).props.text).toBe('Acme')
    expect((node as ElementNode).props.text).toBe('Default')
  })

  it('resolves controlled field, selection, item and index sources into nested action values', () => {
    const node = {
      id: 'approve', type: 'button', props: {
        label: 'Approve',
        actionValues: { fixed: true, approvedScopes: [] },
      },
      bindings: {
        'actionValues.approvedScopes': { source: 'selection', path: 'approvedScopes' },
        'actionValues.email': { source: 'field', path: 'email' },
        'actionValues.scopeId': { source: 'item', path: 'id' },
        'actionValues.scopeIndex': { source: 'index' },
      },
    } as PageNode
    const resolved = resolveNodeRuntime(node, {
      fields: { approvedScopes: ['openid', 'profile'], email: 'ada@example.test' },
      selectionNames: new Set(['approvedScopes']),
      item: { id: 'profile', secret: 'hidden' },
      itemIndex: 1,
      allowedItemPaths: new Set(['id']),
    }) as ElementNode

    expect(resolved.props.actionValues).toEqual({
      fixed: true,
      approvedScopes: ['openid', 'profile'],
      email: 'ada@example.test',
      scopeId: 'profile',
      scopeIndex: 1,
    })
    expect((node as ElementNode).props.actionValues).toEqual({ fixed: true, approvedScopes: [] })
  })

  it('reads a direct state binding from customer-authored Page State', () => {
    expect(resolvePropertyBinding({ source: 'state', path: 'consent.checked' }, {
      pageState: { consent: { checked: true }, privateValue: 'not addressed' },
      viewState: 'prompt',
    })).toBe(true)
  })

  it('applies sandbox results to one nested action-value key only', () => {
    const node = {
      id: 'language', type: 'link', props: {
        label: 'Switch', actionValues: { language: 'en', source: 'static' },
      },
      bindings: {
        'actionValues.language': { source: 'expression', expression: 'state.language' },
      },
    } as PageNode
    const resolved = resolveNodeRuntime(node, {
      expressionValues: {
        [runtimeExpressionKey('language', 'actionValues.language')]: 'de',
      },
    }) as ElementNode
    expect(resolved.props.actionValues).toEqual({ language: 'de', source: 'static' })
  })

  it('keeps static values until sandbox expression results arrive', () => {
    const node = {
      id: 'submit', type: 'button', props: { label: 'Sign in', disabled: false, title: 'Static title' },
      style: { width: '200px', height: '100px' },
      bindings: {
        disabled: { source: 'expression', expression: '!form.valid' },
        title: { source: 'expression', enabled: false, expression: '`Dynamic title`' },
        'style.width': { source: 'expression', expression: '`${fields.username.length * 12}px`' },
        'style.height': { source: 'expression', enabled: false, expression: '`400px`' },
      },
    } as PageNode

    const before = resolveNodeRuntime(node, {}) as ElementNode
    expect(before.props.disabled).toBe(false)
    expect(resolveExpressionStyle(node, node.style, {})).toEqual({ width: '200px', height: '100px' })

    const expressionValues = {
      [runtimeExpressionKey('submit', 'disabled')]: true,
      [runtimeExpressionKey('submit', 'title')]: 'Dynamic title',
      [runtimeExpressionKey('submit', 'style.width')]: '240px',
      [runtimeExpressionKey('submit', 'style.height')]: '400px',
    }
    const after = resolveNodeRuntime(node, { expressionValues }) as ElementNode
    expect(after.props.disabled).toBe(true)
    expect(after.props.title).toBe('Static title')
    expect(resolveExpressionStyle(node, node.style, expressionValues)).toEqual({ width: '240px', height: '100px' })
    expect((node as ElementNode).props.disabled).toBe(false)
    expect(node.style?.width).toBe('200px')
  })
})
