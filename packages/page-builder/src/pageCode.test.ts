import { describe, expect, it } from 'vitest'
import type { PageNode } from './schema'
import {
  applyPageCodeValues,
  createPageCodeDrafts,
  normalizePageCodeOutput,
  pageStateRuntimeSource,
  elementComputeRuntimeSource,
  elementActionRuntimeSource,
  constrainPageStateCode,
  constrainElementCode,
  elementCodeHasClickAction,
  readElementQuickProperties,
  setElementQuickProperty,
  setPageRootQuickProperty,
  pageCodeRuntimeSource,
  pageRootComputeRuntimeSource,
  constrainPageRootCode,
} from './pageCode'

const schema: PageNode = {
  id: 'root',
  type: 'page',
  children: [{
    id: 'login-card',
    type: 'card',
    name: 'loginCard',
    props: {},
    children: [{
      id: 'password-input',
      type: 'password-input',
      name: 'password',
      props: { label: 'Fallback' },
    }],
  }],
}

describe('Page Code data boundary', () => {
  it('creates identifier-friendly aliases without exposing children', () => {
    const drafts = createPageCodeDrafts(schema)
    expect(Object.keys(drafts.elements)).toEqual(['page', 'loginCard', 'password'])
    expect(drafts.nodeIds.password).toBe('password-input')
    expect(drafts.elements.loginCard).not.toHaveProperty('children')
  })

  it('applies configuration atomically but ignores identity and structure writes', () => {
    const drafts = createPageCodeDrafts(schema)
    const values = normalizePageCodeOutput({
      elements: {
        password: {
          ...drafts.elements.password,
          id: 'attacker-id',
          type: 'image',
          name: 'otherField',
          children: [{ id: 'injected', type: 'paragraph' }],
          props: { label: 'Computed', disabled: true },
          style: { width: '240px' },
          validation: { required: true },
          visibleWhen: null,
        },
      },
      state: { items: [{ id: 'one' }] },
      actionIds: ['addItem'],
    }, drafts)

    const result = applyPageCodeValues(schema, values)
    const password = (result as Extract<PageNode, { type: 'page' }>).children[0]
      && (result as { children: PageNode[] }).children[0] as { children: PageNode[] }
    const node = password.children[0] as Exclude<PageNode, { type: 'page' }>
    expect(node.id).toBe('password-input')
    expect(node.type).toBe('password-input')
    expect(node.name).toBe('password')
    expect(node.props).toEqual({ label: 'Computed', disabled: true })
    expect(node.style).toEqual({ width: '240px' })
    expect(node).not.toHaveProperty('children')
    expect(values.state).toEqual({ items: [{ id: 'one' }] })
    expect(values.actionIds).toEqual(['addItem'])
  })

  it('builds one async dispatcher for compute and actions', () => {
    const source = pageCodeRuntimeSource('definePage({ state: {}, actions: {} })')
    expect(source).toContain("input.kind === 'action'")
    expect(source).toContain('await definition.compute(scope)')
    expect(source).toContain('Object.keys(capabilities || {})')
  })

  it('builds separate state, reactive compute, and async action boundaries', () => {
    const state = pageStateRuntimeSource('definePageState({ counter: 0 })')
    const compute = elementComputeRuntimeSource(
      'defineElement({ compute(element, page) { element.props.label = String(page.state.counter) }, actions: { click(element, page, action) {} } })',
      'password',
      '__element:password-input:click',
    )
    const action = elementActionRuntimeSource(
      'defineElement({ actions: { click(element, page, action) { page.state.counter++ } } })',
      'password',
    )

    expect(state).toContain('definePageState')
    expect(compute).toContain('scope.elements["password"]')
    expect(compute).toContain('self.props.action = "__element:password-input:click"')
    expect(compute).toContain('definition.compute(element, page)')
    expect(action).toContain('await action(element, page, actionContext)')
    expect(action).toContain('return { state: page.state }')
  })

  it('builds constrained reactive Page Root Code without structural authority', () => {
    const constrained = constrainPageRootCode(`definePageRoot({
      compute(page, runtime) {
        page.style.minHeight = runtime.viewport.width < 600 ? '100dvh' : '720px'
        page.enterSubmits = true
      },
    })`)
    const source = pageRootComputeRuntimeSource(constrained)

    expect(constrained).toContain('compute(page, runtime)')
    expect(constrained).toContain('@slot:compute')
    expect(source).toContain('scope.elements.page')
    expect(source).toContain('style: page.style')
    expect(source).toContain('responsive: page.responsive')
    expect(source).toContain('enterSubmits: page.enterSubmits')
    expect(source).not.toContain('children: page.children')
  })

  it('migrates free-form source into locked editable slots without losing bodies', () => {
    const state = constrainPageStateCode('definePageState({ counter: 2, nested: { ok: true } })')
    const element = constrainElementCode(`defineElement({
      compute({ self }) {
        if (self.props.label) { self.props.label = 'Changed' }
      },
      actions: { click({ state }) { state.counter++ } },
    })`)

    expect(state).toContain('// @locked @slot:state')
    expect(state).toContain('counter: 2')
    expect(element).toContain('@slot:compute')
    expect(element).toContain('// @locked @slot:click')
    expect(element).toContain("element.props.label = 'Changed'")
    expect(element).toContain('state.counter++')
    expect(elementCodeHasClickAction(element)).toBe(true)
    expect(elementCodeHasClickAction(constrainElementCode('defineElement({ compute() {} })'))).toBe(false)
  })

  it('migrates the previous constrained destructuring signature to element', () => {
    const source = `defineElement({ // @locked
  compute({ self, fields }) { // @locked @slot:compute
    self.props.disabled = !fields.username;
  }, // @locked
  actions: { // @locked
    async click({ state }) { // @locked @slot:click
      state.counter++;
    }, // @locked
  }, // @locked
}) // @locked`
    const migrated = constrainElementCode(source)
    expect(migrated).toContain('compute(element, page)')
    expect(migrated).toContain('async click(element, page, action)')
    expect(migrated).toContain('const { fields } = page;')
    expect(migrated).toContain('element.props.disabled = !fields.username;')
    expect(migrated).toContain('const { state } = page;')
  })

  it('migrates mixed element/page access from the first constrained prototype', () => {
    const source = `defineElement({ // @locked
  compute(element) { // @locked @slot:compute
    element.props.disabled = !element.form.valid || !element.state.ready;
  }, // @locked
  actions: { // @locked
    async click(element) { // @locked @slot:click
      element.state.lastPayload = element.payload;
    }, // @locked
  }, // @locked
}) // @locked`
    const migrated = constrainElementCode(source)
    expect(migrated).toContain('element.props.disabled = !page.form.valid || !page.state.ready;')
    expect(migrated).toContain('page.state.lastPayload = action.payload;')
  })

  it('round-trips code-backed Quick Properties without parsing or replacing custom code', () => {
    const custom = `defineElement({
      compute(element, page) {
        element.props.disabled = !page.form.valid;
      },
    })`
    const withLabel = setElementQuickProperty(custom, 'props.label', 'Sign in')
    const withRequired = setElementQuickProperty(withLabel, 'validation.required', true)

    expect(withRequired).toContain('element.props.label = "Sign in";')
    expect(withRequired).toContain('element.validation = { ...(element.validation || {}), required: true };')
    expect(withRequired.indexOf('element.props.label')).toBeLessThan(withRequired.indexOf('element.props.disabled'))
    expect(withRequired).toContain('element.props.disabled = !page.form.valid;')
    expect(readElementQuickProperties(withRequired)).toEqual({
      'props.label': 'Sign in',
      'validation.required': true,
    })

    const reset = setElementQuickProperty(withRequired, 'props.label', undefined)
    expect(readElementQuickProperties(reset)).toEqual({ 'validation.required': true })
    expect(reset).toContain('element.props.disabled = !page.form.valid;')
  })

  it('writes page root Quick Properties against the root draft, preserving custom code', () => {
    // Verbatim shape of a rootCode persisted before the Quick Properties
    // boundary existed: locked, correct signature, but no @quick markers.
    const legacy = [
      'definePageRoot({ // @locked',
      '  compute(page, runtime) { // @locked @slot:compute',
      '    page.enterSubmits = runtime.viewport.width > 600',
      '  }, // @locked',
      '}) // @locked',
    ].join('\n')
    expect(legacy).not.toContain('@quick:start')
    // Such a source must be rebuilt rather than left without a write target.
    expect(constrainPageRootCode(legacy)).toContain('@quick:start')

    const withHeight = setPageRootQuickProperty(legacy, 'style.height', '600px')
    const withOverflow = setPageRootQuickProperty(withHeight, 'style.overflow', 'auto')

    // Assignments target `page`, the root compute slot's draft parameter.
    expect(withOverflow).toContain('page.style.height = "600px";')
    expect(withOverflow).toContain('page.style.overflow = "auto";')
    expect(withOverflow).not.toContain('element.style')
    // The pre-existing body survives and still runs after the locked block.
    expect(withOverflow).toContain('page.enterSubmits = runtime.viewport.width > 600')
    expect(withOverflow.indexOf('page.style.height')).toBeLessThan(withOverflow.indexOf('page.enterSubmits'))
    expect(readElementQuickProperties(withOverflow)).toEqual({
      'style.height': '600px',
      'style.overflow': 'auto',
    })

    // Re-constraining an already-bounded source must not duplicate the block.
    expect(constrainPageRootCode(withOverflow)).toBe(withOverflow)

    const reset = setPageRootQuickProperty(withOverflow, 'style.height', undefined)
    expect(readElementQuickProperties(reset)).toEqual({ 'style.overflow': 'auto' })
    expect(reset).toContain('page.enterSubmits = runtime.viewport.width > 600')
  })

  it('rejects page root Quick Properties the root draft cannot carry', () => {
    // The root draft exposes style/responsive/enterSubmits only, so a props or
    // validation write would silently do nothing at runtime.
    expect(() => setPageRootQuickProperty(undefined, 'props.label', 'x')).toThrow(/style/)
    expect(() => setPageRootQuickProperty(undefined, 'validation.required', true)).toThrow(/style/)
  })

  it('keeps page root Quick Properties executable through the runtime wrapper', () => {
    const source = setPageRootQuickProperty(undefined, 'style.minHeight', '100dvh')
    const runtime = pageRootComputeRuntimeSource(source)
    expect(runtime).toContain('page.style.minHeight = "100dvh";')
    expect(runtime).toContain('definition.compute(page, runtime)')
    expect(runtime).toContain('style: page.style')
  })

  it('writes translation Quick Properties as readable i18n helpers', () => {
    const source = setElementQuickProperty(undefined, 'props.label', {
      source: 'translation',
      key: 'auth.login.submit',
      fallback: 'Sign in',
    })
    expect(source).toContain('element.props.label = i18n.text("auth.login.submit", undefined, "Sign in");')
    expect(readElementQuickProperties(source)).toEqual({
      'props.label': { source: 'translation', key: 'auth.login.submit', fallback: 'Sign in' },
    })
    expect(elementComputeRuntimeSource(source, 'submit', 'click')).toContain('const i18n = Object.freeze')
  })
})
