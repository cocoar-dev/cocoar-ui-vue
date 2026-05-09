import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, readonly, defineComponent, h } from 'vue';
import CoarContextMenu from './CoarContextMenu.vue';
import CoarMenuItem from './CoarMenuItem.vue';
import CoarSubFlyout from './CoarSubFlyout.vue';
import type { ContextMenuContext } from './useContextMenu';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';

function createMenuContext(): ContextMenuContext {
  const isOpen = ref(false);
  const position = ref({ x: 100, y: 100 });
  return {
    isOpen: readonly(isOpen),
    position: readonly(position),
    open() { isOpen.value = true; },
    close() { isOpen.value = false; },
  };
}

/**
 * Stub `Teleport` so the service-mounted submenu panel renders inline (query-able
 * via the wrapper), and mount a `CoarOverlayHost` as a sibling so `overlay.open()`
 * actually results in a rendered panel. Plugin provides the service singleton.
 */
const mountOpts = {
  global: {
    plugins: [CoarOverlayPlugin],
    stubs: { Teleport: true },
  },
};

describe('CoarContextMenu', () => {
  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
  });

  it('closes the entire menu chain when a CoarMenuItem inside a CoarSubFlyout is clicked', async () => {
    const menu = createMenuContext();
    menu.open({ clientX: 0, clientY: 0 });

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h('div', null, [
            h(CoarContextMenu, { menu }, {
              default: () => [
                h(CoarSubFlyout, { label: 'Status' }, {
                  default: () => h(CoarMenuItem, { label: 'In Bearbeitung' }),
                }),
              ],
            }),
            h(CoarOverlayHost),
          ]);
      },
    });

    const w = mount(Wrapper, mountOpts);

    // Open the submenu by clicking the sub-flyout trigger
    const submenuTrigger = w.find('.coar-submenu-item');
    expect(submenuTrigger.exists()).toBe(true);
    await submenuTrigger.trigger('click');

    // The submenu panel should now be open
    expect(w.find('.coar-submenu-panel').exists()).toBe(true);

    // Click the nested menu item
    const menuItem = w.find('.coar-menu-item');
    expect(menuItem.exists()).toBe(true);
    await menuItem.trigger('click');

    // Wait for the queueMicrotask in CoarMenuItem's handleClick
    await new Promise<void>((r) => queueMicrotask(() => r()));

    // The root context menu should be closed
    expect(menu.isOpen.value).toBe(false);
  });

  it('closes the context menu when a direct CoarMenuItem is clicked', async () => {
    const menu = createMenuContext();
    menu.open({ clientX: 0, clientY: 0 });

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h('div', null, [
            h(CoarContextMenu, { menu }, {
              default: () => h(CoarMenuItem, { label: 'Delete' }),
            }),
            h(CoarOverlayHost),
          ]);
      },
    });

    const w = mount(Wrapper, mountOpts);

    const menuItem = w.find('.coar-menu-item');
    await menuItem.trigger('click');
    await new Promise<void>((r) => queueMicrotask(() => r()));

    expect(menu.isOpen.value).toBe(false);
  });
});
