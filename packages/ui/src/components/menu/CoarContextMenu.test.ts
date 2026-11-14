import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, readonly, defineComponent, h, nextTick } from 'vue';
import CoarContextMenu from './CoarContextMenu.vue';
import CoarMenuItem from './CoarMenuItem.vue';
import CoarSubFlyout from './CoarSubFlyout.vue';
import { useContextMenu, type ContextMenuContext } from './useContextMenu';
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

describe('CoarContextMenu — local .coar-mobile area', () => {
  const nodes: Element[] = [];
  let unmount: (() => void) | undefined;

  afterEach(() => {
    unmount?.();
    unmount = undefined;
    _resetOverlayServiceForTests();
    document.querySelectorAll('.coar-overlay-host').forEach((n) => n.remove());
    nodes.splice(0).forEach((n) => n.remove());
  });

  /** Real Teleport: the menu host lands in body, outside the area, as in an app. */
  function mountMenu(menu: ContextMenuContext) {
    const Wrapper = defineComponent({
      setup: () => () =>
        h('div', null, [
          h(CoarContextMenu, { menu }, { default: () => h(CoarMenuItem, { label: 'Copy' }) }),
          h(CoarOverlayHost),
        ]),
    });
    const w = mount(Wrapper, { global: { plugins: [CoarOverlayPlugin] }, attachTo: document.body });
    unmount = () => w.unmount();
  }

  function mobileArea() {
    const area = document.createElement('div');
    area.className = 'coar-mobile';
    area.style.setProperty('--coar-control-m-height', '52px');
    document.body.appendChild(area);
    nodes.push(area);
    return area;
  }

  async function menuHost() {
    await nextTick();
    await nextTick();
    return document.querySelector<HTMLElement>('.coar-overlay-host');
  }

  it('remembers the element target and the menu host takes over the area', async () => {
    const menu = useContextMenu();
    mountMenu(menu);
    const area = mobileArea();
    const row = document.createElement('div');
    area.appendChild(row);
    row.addEventListener('contextmenu', (e) => menu.open(e));
    row.dispatchEvent(new MouseEvent('contextmenu', { clientX: 10, clientY: 10, bubbles: true }));

    expect(menu.target?.value).toBe(row);
    const host = await menuHost();
    expect(host).not.toBeNull();
    expect(host!.classList.contains('coar-mobile')).toBe(true);
    expect(host!.style.getPropertyValue('--coar-control-m-height')).toBe('52px');
  });

  it('opens without context when the target is not an element', async () => {
    const menu = useContextMenu();
    mountMenu(menu);
    const area = mobileArea();
    const text = document.createTextNode('cell');
    area.appendChild(text);
    text.addEventListener('contextmenu', (e) => menu.open(e as MouseEvent));
    text.dispatchEvent(new MouseEvent('contextmenu', { clientX: 10, clientY: 10, bubbles: true }));

    expect(menu.isOpen.value).toBe(true);
    expect(menu.target?.value).toBeNull();
    const host = await menuHost();
    expect(host).not.toBeNull();
    expect(host!.classList.contains('coar-mobile')).toBe(false);
  });

  it('has no target when opened with plain coordinates', () => {
    const menu = useContextMenu();
    menu.open({ clientX: 1, clientY: 2 });
    expect(menu.isOpen.value).toBe(true);
    expect(menu.target?.value).toBeNull();
  });
});
