/**
 * Audit Session 5 #F1 fix — single helper that resolves
 * `state.eventRenderer` against the three accepted forms (Component,
 * function-returning-Component, function-returning-VNode) and
 * produces a VNode the consuming `<slot name="event">` block can
 * render via `<component :is>`.
 *
 * **Used by every sub-view's default event slot** (CoarTimeGrid,
 * CoarMonthView, CoarAgendaView). Ensures the `eventRenderer` setter
 * is honored consistently — previously it was silently dropped.
 *
 * Slot priority remains as documented:
 *   template `#event` slot > view-specific renderer > universal
 *   `eventRenderer` > sub-view default. This helper handles the
 *   "universal eventRenderer" tier; the default tier (the small
 *   `meta.title ?? id` text + time label) lives in each view's
 *   template.
 *
 * **C7 read contract:** the helper is invoked from a `computed` or
 * directly inside the template render — `toValue(state.eventRenderer)`
 * is read on every invocation, never captured at setup.
 */

import { type Component, type VNode, h, isVNode } from 'vue';
import type { CalendarBuilder } from '../../builders/calendar-builder';
import type { EventRenderer, EventRendererCtx } from '../../builders/types';
import type { CalendarEvent } from '../../core';

/**
 * Resolve the universal renderer (if any) into a VNode for the
 * given event + layout context. Returns `null` if no universal
 * renderer is registered — caller falls through to the sub-view
 * default.
 */
export function resolveUniversalEventRenderer<TMeta extends Record<string, unknown>>(
  builder: CalendarBuilder<TMeta>,
  ctx: EventRendererCtx<TMeta>,
): VNode | null {
  const renderer = builder.state.eventRenderer as EventRenderer<TMeta> | null;
  if (!renderer) return null;
  if (typeof renderer === 'function') {
    const result = (renderer as (c: EventRendererCtx<TMeta>) => Component | VNode)(ctx);
    if (isVNode(result)) return result;
    return h(result as Component, ctx as Record<string, unknown>);
  }
  return h(renderer as Component, ctx as Record<string, unknown>);
}

/**
 * Default title-only fallback used by every sub-view when no
 * universal renderer + no template slot fires.
 */
export function defaultEventTitle<TMeta extends Record<string, unknown>>(
  event: CalendarEvent<TMeta>,
): string {
  return (event.meta as { title?: string } | undefined)?.title ?? event.id;
}
