/**
 * Tests for `RenderEvent` and `RenderDayHeader` — the functional
 * wrappers that resolve a builder-registered renderer (component /
 * function-returns-component / function-returns-VNode) into a VNode
 * at render time.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { CalendarEvent } from '../core';
import { zdt } from '../__test-utils__/event-fixtures';
import type { EventRendererCtx } from './types';
import { RenderEvent, RenderDayHeader } from './render-helpers';

const sampleEvent: CalendarEvent = {
  id: 'a',
  start: zdt('2026-04-15T09:00:00'),
  meta: { title: 'Stand-up' },
};
const sampleCtx: EventRendererCtx = { event: sampleEvent, view: 'week' };

describe('RenderEvent', () => {
  it('renders a Vue component and forwards ctx as props', () => {
    const Spy = defineComponent({
      props: ['event', 'view', 'layout'],
      setup(props) {
        return () => h('div', { class: 'spy' }, [
          h('span', { class: 'id' }, props.event.id),
          h('span', { class: 'view' }, props.view),
        ]);
      },
    });
    const wrapper = mount(RenderEvent, {
      props: { renderer: Spy, ctx: sampleCtx },
    });
    expect(wrapper.find('.id').text()).toBe('a');
    expect(wrapper.find('.view').text()).toBe('week');
  });

  it('calls a function-returning-component once and forwards ctx', () => {
    const A = defineComponent({
      props: ['event'],
      setup(p) {
        return () => h('div', { class: 'a' }, p.event.id);
      },
    });
    const B = defineComponent({
      props: ['event'],
      setup(p) {
        return () => h('div', { class: 'b' }, p.event.id);
      },
    });
    const renderer = (ctx: EventRendererCtx) =>
      ctx.event.id === 'a' ? A : B;
    const w1 = mount(RenderEvent, {
      props: { renderer, ctx: { event: { ...sampleEvent, id: 'a' }, view: 'week' } },
    });
    expect(w1.find('.a').exists()).toBe(true);
    const w2 = mount(RenderEvent, {
      props: { renderer, ctx: { event: { ...sampleEvent, id: 'b' }, view: 'week' } },
    });
    expect(w2.find('.b').exists()).toBe(true);
  });

  it('returns a VNode directly when the function returns one', () => {
    const renderer = (ctx: EventRendererCtx) =>
      h('em', { class: 'inline' }, `(${ctx.event.id})`);
    const wrapper = mount(RenderEvent, {
      props: { renderer, ctx: sampleCtx },
    });
    expect(wrapper.find('em.inline').text()).toBe('(a)');
  });
});

describe('RenderDayHeader', () => {
  it('renders a component with date / isToday / isWeekend props', () => {
    const Header = defineComponent({
      props: ['date', 'isToday', 'isWeekend'],
      setup(p) {
        return () =>
          h('div', { class: 'h' }, [
            h('span', { class: 'iso' }, p.date.toString()),
            h('span', { class: 'tw' }, `${p.isToday}/${p.isWeekend}`),
          ]);
      },
    });
    const ctx = {
      date: { toString: () => '2026-04-15' } as never,
      isToday: false,
      isWeekend: false,
    };
    const wrapper = mount(RenderDayHeader, {
      props: { renderer: Header, ctx },
    });
    expect(wrapper.find('.iso').text()).toBe('2026-04-15');
    expect(wrapper.find('.tw').text()).toBe('false/false');
  });

  it('accepts a function returning a VNode', () => {
    const renderer = (c: { date: { toString(): string } }) =>
      h('strong', {}, c.date.toString());
    const wrapper = mount(RenderDayHeader, {
      props: {
        renderer,
        ctx: {
          date: { toString: () => '2026-04-20' } as never,
          isToday: true,
          isWeekend: false,
        },
      },
    });
    expect(wrapper.find('strong').text()).toBe('2026-04-20');
  });
});
