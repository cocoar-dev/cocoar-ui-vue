import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, type Ref } from 'vue';

import CoarSplitPane from './CoarSplitPane.vue';

function mountPane(extra: Record<string, unknown> = {}, sizeRef: Ref<number> = ref(200)) {
  const Wrapper = defineComponent({
    setup: () => () =>
      h(
        CoarSplitPane,
        {
          size: sizeRef.value,
          'onUpdate:size': (v: number) => (sizeRef.value = v),
          ...extra,
        },
        {
          first: () => h('div', { class: 'pane-a' }, 'A'),
          second: () => h('div', { class: 'pane-b' }, 'B'),
        },
      ),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  return { wrapper, sizeRef };
}

describe('CoarSplitPane', () => {
  it('renders both panes and a divider by default', () => {
    const { wrapper } = mountPane();
    expect(wrapper.find('.pane-a').text()).toBe('A');
    expect(wrapper.find('.pane-b').text()).toBe('B');
    expect(wrapper.find('.coar-pane-divider').exists()).toBe(true);
  });

  it('hides the divider when not resizable', () => {
    const { wrapper } = mountPane({ resizable: false });
    expect(wrapper.find('.coar-pane-divider').exists()).toBe(false);
  });

  it('gives the first pane the controlled flex basis by default', () => {
    const { wrapper } = mountPane({}, ref(321));
    const first = wrapper.findAll('.coar-split__pane')[0]!;
    expect(first.attributes('style')).toContain('321px');
  });

  it('gives the second pane the basis when side="second"', () => {
    const { wrapper } = mountPane({ side: 'second' }, ref(150));
    const panes = wrapper.findAll('.coar-split__pane');
    expect(panes[1]!.attributes('style')).toContain('150px');
    expect(panes[0]!.classes()).toContain('coar-split__pane--fill');
  });

  it('arrow keys move the divider and update v-model:size', async () => {
    const { wrapper, sizeRef } = mountPane(); // side first, vertical divider
    await wrapper.find('.coar-pane-divider').trigger('keydown', { key: 'ArrowRight' });
    expect(sizeRef.value).toBe(208); // 200 + step (8)
    await wrapper.find('.coar-pane-divider').trigger('keydown', { key: 'ArrowLeft' });
    expect(sizeRef.value).toBe(200);
  });

  it('inverts the arrow direction when side="second"', async () => {
    const { wrapper, sizeRef } = mountPane({ side: 'second' }, ref(200));
    await wrapper.find('.coar-pane-divider').trigger('keydown', { key: 'ArrowRight' });
    expect(sizeRef.value).toBe(192); // ArrowRight shrinks a second/right pane
  });

  it('clamps to min when arrowing past it', async () => {
    const { wrapper, sizeRef } = mountPane({ min: 100 }, ref(104));
    await wrapper.find('.coar-pane-divider').trigger('keydown', { key: 'ArrowLeft' });
    expect(sizeRef.value).toBe(100); // 96 clamped up to 100
  });

  it('reports a clamped aria value with a px valuetext', () => {
    const inBounds = mountPane({ min: 100, max: 400 }, ref(250));
    const d1 = inBounds.wrapper.find('.coar-pane-divider');
    expect(d1.attributes('aria-valuenow')).toBe('250');
    expect(d1.attributes('aria-valuetext')).toBe('250px');

    // An out-of-bounds value never produces a spec-violating aria-valuenow.
    const outOfBounds = mountPane({ min: 100, max: 400 }, ref(50));
    expect(outOfBounds.wrapper.find('.coar-pane-divider').attributes('aria-valuenow')).toBe('100');
  });

  it('removes window listeners if it unmounts mid-drag', async () => {
    const { wrapper } = mountPane();
    await wrapper.find('.coar-pane-divider').trigger('pointerdown', { button: 0, pointerId: 1, clientX: 0 });
    const spy = vi.spyOn(window, 'removeEventListener');
    wrapper.unmount();
    expect(spy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    spy.mockRestore();
  });
});
