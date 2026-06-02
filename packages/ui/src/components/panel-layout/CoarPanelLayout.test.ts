import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import CoarPanelLayout from './CoarPanelLayout.vue';

function mountLayout(
  slots: Record<string, () => unknown>,
  props: Record<string, unknown> = {},
) {
  const Wrapper = defineComponent({
    setup: () => () => h(CoarPanelLayout, { ...props }, slots),
  });
  return mount(Wrapper, { attachTo: document.body });
}

describe('CoarPanelLayout', () => {
  it('always renders the content region', () => {
    const w = mountLayout({ default: () => h('div', { class: 'c' }, 'content') });
    expect(w.find('.coar-panel-layout__content .c').text()).toBe('content');
  });

  it('renders only the regions whose slots are filled', () => {
    const w = mountLayout({
      default: () => h('div', 'c'),
      left: () => h('div', { class: 'L' }, 'L'),
    });
    expect(w.find('.coar-panel-layout__left').exists()).toBe(true);
    expect(w.find('.coar-panel-layout__right').exists()).toBe(false);
    expect(w.find('.coar-panel-layout__bottom').exists()).toBe(false);
    expect(w.findAll('.coar-pane-divider').length).toBe(1); // left only
  });

  it('renders top / right / bottom / status regions when provided', () => {
    const w = mountLayout({
      default: () => h('div', 'c'),
      top: () => h('div', { class: 'T' }, 'T'),
      right: () => h('div', { class: 'R' }, 'R'),
      bottom: () => h('div', { class: 'B' }, 'B'),
      status: () => h('div', { class: 'S' }, 'S'),
    });
    expect(w.find('.coar-panel-layout__top .T').exists()).toBe(true);
    expect(w.find('.coar-panel-layout__right .R').exists()).toBe(true);
    expect(w.find('.coar-panel-layout__bottom .B').exists()).toBe(true);
    expect(w.find('.coar-panel-layout__status .S').exists()).toBe(true);
    // right + bottom are resizable; top + status are fixed (no divider)
    expect(w.findAll('.coar-pane-divider').length).toBe(2);
  });

  it('hides a region when its *-open prop is false', () => {
    const w = mountLayout(
      { default: () => h('div', 'c'), left: () => h('div', 'L') },
      { leftOpen: false },
    );
    expect(w.find('.coar-panel-layout__left').exists()).toBe(false);
    expect(w.findAll('.coar-pane-divider').length).toBe(0);
  });

  it('omits the divider when a region is not resizable', () => {
    const w = mountLayout(
      { default: () => h('div', 'c'), left: () => h('div', 'L') },
      { leftResizable: false },
    );
    expect(w.find('.coar-panel-layout__left').exists()).toBe(true);
    expect(w.findAll('.coar-pane-divider').length).toBe(0);
  });

  it('applies a controlled width to the left region', () => {
    const w = mountLayout(
      { default: () => h('div', 'c'), left: () => h('div', 'L') },
      { leftWidth: 333 },
    );
    expect(w.find('.coar-panel-layout__left').attributes('style')).toContain('333px');
  });

  it('protects the content region with a min size by default (never crushed to 0)', () => {
    const w = mountLayout({
      default: () => h('div', 'c'),
      left: () => h('div', 'L'),
      right: () => h('div', 'R'),
      bottom: () => h('div', 'B'),
    });
    expect(w.find('.coar-panel-layout__center').attributes('style')).toContain('min-width: 120px');
    expect(w.find('.coar-panel-layout__content').attributes('style')).toContain('min-height: 80px');
  });

  it('honors custom content minimums', () => {
    const w = mountLayout(
      { default: () => h('div', 'c') },
      { contentMinWidth: 200, contentMinHeight: 140 },
    );
    expect(w.find('.coar-panel-layout__center').attributes('style')).toContain('min-width: 200px');
    expect(w.find('.coar-panel-layout__content').attributes('style')).toContain('min-height: 140px');
  });
});
