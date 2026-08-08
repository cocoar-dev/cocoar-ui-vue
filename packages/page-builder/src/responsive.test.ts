import { describe, expect, it } from 'vitest'
import { breakpointForWidth, resolveNodeStyle } from './responsive'
import type { PageNode } from './schema'

describe('responsive node styles', () => {
  const node = {
    id: 'n', type: 'paragraph', props: { text: 'x' },
    style: { gap: '4px', direction: 'column' },
    responsive: {
      phone: { gap: '8px' },
      tablet: { direction: 'row' },
      desktop: { gap: '16px', hidden: true },
    },
  } as PageNode

  it('uses exact mobile-first thresholds', () => {
    expect(breakpointForWidth(320)).toBe('compact')
    expect(breakpointForWidth(390)).toBe('phone')
    expect(breakpointForWidth(768)).toBe('tablet')
    expect(breakpointForWidth(1280)).toBe('desktop')
  })

  it('inherits unset values from smaller breakpoints', () => {
    expect(resolveNodeStyle(node, 'compact')).toMatchObject({ gap: '4px', direction: 'column' })
    expect(resolveNodeStyle(node, 'phone')).toMatchObject({ gap: '8px', direction: 'column' })
    expect(resolveNodeStyle(node, 'tablet')).toMatchObject({ gap: '8px', direction: 'row' })
    expect(resolveNodeStyle(node, 'desktop')).toMatchObject({ gap: '16px', direction: 'row', hidden: true })
  })
})
