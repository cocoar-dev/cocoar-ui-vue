import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, readonly, defineComponent, h } from 'vue';
import CoarContextMenu from './CoarContextMenu.vue';
import CoarMenuItem from './CoarMenuItem.vue';
import CoarSubFlyout from './CoarSubFlyout.vue';
import type { ContextMenuContext } from './useContextMenu';

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

const globalStubs = { global: { stubs: { Teleport: true } } };

describe('CoarContextMenu', () => {
  it('closes the entire menu chain when a CoarMenuItem inside a CoarSubFlyout is clicked', async () => {
    const menu = createMenuContext();
    menu.open({ clientX: 100, clientY: 100 });

    // Create a wrapper component that nests MenuItem inside SubFlyout inside ContextMenu
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(CoarContextMenu, { menu }, {
            default: () => [
              h(CoarSubFlyout, { label: 'Status' }, {
                default: () => h(CoarMenuItem, { label: 'In Bearbeitung' }),
              }),
            ],
          });
      },
    });

    const w = mount(Wrapper, globalStubs);

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
    await new Promise((r) => queueMicrotask(r));

    // The root context menu should be closed
    expect(menu.isOpen.value).toBe(false);
  });

  it('closes the context menu when a direct CoarMenuItem is clicked', async () => {
    const menu = createMenuContext();
    menu.open({ clientX: 100, clientY: 100 });

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(CoarContextMenu, { menu }, {
            default: () => h(CoarMenuItem, { label: 'Delete' }),
          });
      },
    });

    const w = mount(Wrapper, globalStubs);

    const menuItem = w.find('.coar-menu-item');
    await menuItem.trigger('click');
    await new Promise((r) => queueMicrotask(r));

    expect(menu.isOpen.value).toBe(false);
  });
});
