/**
 * Functional wrappers that resolve a builder-registered
 * `EventRenderer<T>` / `DayHeaderRenderer` into a VNode at render
 * time. The same setter (e.g. `builder.eventRenderer(...)`) accepts
 * three input forms — these helpers normalise them:
 *
 *   - **Vue component** → instantiated via `h(component, ctx)` so
 *     the ctx fields land as props (define `event`, `view`, `layout`
 *     props on the component).
 *   - **Function returning a component** → call `fn(ctx)` once per
 *     event, then `h(component, ctx)`. Use this to dispatch on
 *     `ctx.event.meta.type` etc.
 *   - **Function returning a VNode** → return the VNode as-is. Use
 *     this for a fully-custom render (the JSX / `h(...)` form).
 *
 * Slot priority is resolved in `<CoarCalendar>` itself; these helpers
 * only run when the consumer has NOT supplied a template-level slot.
 */

import { type Component, type FunctionalComponent, type VNode, h, isVNode } from 'vue';
import type { Temporal } from '../core';
import type { DayHeaderRenderer, EventRenderer, EventRendererCtx } from './types';

export interface RenderEventProps {
  renderer: EventRenderer;
  ctx: EventRendererCtx;
}

export const RenderEvent: FunctionalComponent<RenderEventProps> = (props) => {
  const { renderer, ctx } = props;
  // Defensive: under VitePress SSR a render can fire before reactive
  // dependencies resolve, producing a momentarily-undefined ctx. Skip
  // rendering rather than crashing the build with a confusing
  // "Cannot read properties of undefined (reading 'event')" error.
  if (!renderer || !ctx) return null;
  if (typeof renderer === 'function') {
    const fn = renderer as (c: EventRendererCtx) => Component | VNode;
    const result = fn(ctx);
    return isVNode(result) ? result : h(result as Component, ctx as unknown as Record<string, unknown>);
  }
  return h(renderer as Component, ctx as unknown as Record<string, unknown>);
};
RenderEvent.props = ['renderer', 'ctx'];
RenderEvent.displayName = 'CoarRenderEvent';

export interface DayHeaderCtx {
  date: Temporal.PlainDate;
  isToday: boolean;
  isWeekend: boolean;
}

export interface RenderDayHeaderProps {
  renderer: DayHeaderRenderer;
  ctx: DayHeaderCtx;
}

export const RenderDayHeader: FunctionalComponent<RenderDayHeaderProps> = (props) => {
  const { renderer, ctx } = props;
  if (typeof renderer === 'function') {
    const fn = renderer as (c: DayHeaderCtx) => Component | VNode;
    const result = fn(ctx);
    return isVNode(result) ? result : h(result as Component, ctx as unknown as Record<string, unknown>);
  }
  return h(renderer as Component, ctx as unknown as Record<string, unknown>);
};
RenderDayHeader.props = ['renderer', 'ctx'];
RenderDayHeader.displayName = 'CoarRenderDayHeader';
