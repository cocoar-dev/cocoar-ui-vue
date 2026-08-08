import type { NodeStyle, PageBreakpoint, PageNode } from './schema'

export const PAGE_BREAKPOINT_WIDTHS: Readonly<Record<PageBreakpoint, number>> = {
  compact: 320,
  phone: 390,
  tablet: 768,
  desktop: 1280,
}

const CASCADE: readonly PageBreakpoint[] = ['compact', 'phone', 'tablet', 'desktop']

export function breakpointForWidth(width: number): PageBreakpoint {
  if (width >= PAGE_BREAKPOINT_WIDTHS.desktop) return 'desktop'
  if (width >= PAGE_BREAKPOINT_WIDTHS.tablet) return 'tablet'
  if (width >= PAGE_BREAKPOINT_WIDTHS.phone) return 'phone'
  return 'compact'
}

/** Resolve the exact mobile-first cascade used by both builder and renderer. */
export function resolveNodeStyle(
  node: Pick<PageNode, 'style' | 'responsive'>,
  viewport: number | PageBreakpoint,
): NodeStyle {
  const breakpoint = typeof viewport === 'number' ? breakpointForWidth(viewport) : viewport
  const result: NodeStyle = { ...(node.style ?? {}) }
  for (const current of CASCADE) {
    if (current === 'compact') {
      if (breakpoint === current) break
      continue
    }
    Object.assign(result, node.responsive?.[current])
    if (breakpoint === current) break
  }
  return result
}

export function localNodeStyle(
  node: Pick<PageNode, 'style' | 'responsive'>,
  breakpoint: PageBreakpoint,
): Partial<NodeStyle> {
  return breakpoint === 'compact' ? (node.style ?? {}) : (node.responsive?.[breakpoint] ?? {})
}
