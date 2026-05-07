/**
 * Tests for `<CoarTimeGridColumn>` (internal/time-grid).
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarTimeGridColumn from '../CoarTimeGridColumn.vue';
import { Temporal } from '../../../../core';

const day = Temporal.PlainDate.from('2026-04-15');

const baseProps = {
  day,
  heightPx: 1440,
  slotHeightPx: 30,
  renderBufferOffsetPx: 15,
} as const;

describe('<CoarTimeGridColumn>', () => {
  it('renders inline height + slot-gradient background', () => {
    const wrapper = mount(CoarTimeGridColumn, { props: baseProps });
    const style = wrapper.find('.coar-time-grid-column').attributes('style') ?? '';
    expect(style).toContain('height: 1440px');
    expect(style).toContain('background-image: repeating-linear-gradient');
    expect(style).toContain('background-position: 0px 15px');
  });

  it('applies --today and --weekend classes', () => {
    const today = mount(CoarTimeGridColumn, { props: { ...baseProps, isToday: true } });
    expect(today.find('.coar-time-grid-column').classes()).toContain('coar-time-grid-column--today');

    const weekend = mount(CoarTimeGridColumn, { props: { ...baseProps, isWeekend: true } });
    expect(weekend.find('.coar-time-grid-column').classes()).toContain('coar-time-grid-column--weekend');
  });

  it('emits pointerdown(native, day)', async () => {
    const wrapper = mount(CoarTimeGridColumn, { props: baseProps });
    await wrapper.find('.coar-time-grid-column').trigger('pointerdown');
    const ev = wrapper.emitted('pointerdown');
    expect(ev).toHaveLength(1);
    expect((ev![0][1] as Temporal.PlainDate).toString()).toBe('2026-04-15');
  });

  it('renders default-slot content (events / overlays)', () => {
    const Renderer = defineComponent({
      components: { CoarTimeGridColumn },
      setup() {
        return () =>
          h(CoarTimeGridColumn, baseProps, () =>
            h('div', { class: 'evt' }, 'Standup'),
          );
      },
    });
    const wrapper = mount(Renderer);
    expect(wrapper.find('.coar-time-grid-column .evt').text()).toBe('Standup');
  });
});
