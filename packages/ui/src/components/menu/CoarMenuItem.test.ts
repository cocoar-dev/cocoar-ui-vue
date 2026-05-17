import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import CoarMenuItem, { type MenuItemClickEvent } from './CoarMenuItem.vue';
import { MENU_CLOSE_KEY } from './menu-cascade';

/**
 * Branches mirror CoarSidebarItem; differences vs that suite:
 *
 *  - `clicked` instead of `click`, with `MenuItemClickEvent.keepMenuOpen()`
 *  - menu auto-closes after click (via injected `MENU_CLOSE_KEY` callback)
 *  - role="menuitem" is REQUIRED on both <a> and <div> branches because the
 *    item lives inside a role="menu" container
 *  - modifier-clicks must NOT close the menu (user is opening multiple links
 *    in new tabs from one menu)
 */

function getItem(wrapper: VueWrapper) {
  return wrapper.get<HTMLElement>('.coar-menu-item');
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => h('div', 'home') }) },
      { path: '/profile', component: defineComponent({ render: () => h('div', 'profile') }) },
      { path: '/settings', component: defineComponent({ render: () => h('div', 'settings') }) },
    ],
  });
}

describe('CoarMenuItem — link variants', () => {
  let wrapper: VueWrapper;
  let closeMenu: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    closeMenu = vi.fn();
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('Branch 1: `to` + vue-router installed', () => {
    let router: Router;

    beforeEach(async () => {
      router = makeRouter();
      await router.push('/');
      await router.isReady();
    });

    async function mountItem(
      props: Record<string, unknown> = {},
      clickedHandler?: (e: MenuItemClickEvent) => void,
    ) {
      wrapper = mount(CoarMenuItem, {
        props: { label: 'Profile', icon: 'user', ...props },
        global: {
          plugins: [router],
          provide: { [MENU_CLOSE_KEY as symbol]: closeMenu },
        },
        attrs: clickedHandler ? { onClicked: clickedHandler } : undefined,
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <a role="menuitem" href>', async () => {
      const item = await mountItem({ to: '/profile' });
      expect(item.element.tagName).toBe('A');
      expect(item.attributes('href')).toBe('/profile');
      // role="menuitem" is REQUIRED inside a role="menu" container — keep it
      // on the <a> branch too (unlike CoarSidebarItem which lives in nav).
      expect(item.attributes('role')).toBe('menuitem');
    });

    it('plain click triggers SPA navigation', async () => {
      const item = await mountItem({ to: '/profile' });
      await item.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/profile');
    });

    it('plain click auto-closes the menu', async () => {
      const item = await mountItem({ to: '/profile' });
      await item.trigger('click');
      await flushPromises();
      // closeMenu is queued via queueMicrotask; flush once more.
      await flushPromises();
      expect(closeMenu).toHaveBeenCalledTimes(1);
    });

    it('keepMenuOpen() inside @clicked handler suppresses auto-close', async () => {
      const item = await mountItem({ to: '/profile' }, (e) => {
        e.keepMenuOpen();
      });
      await item.trigger('click');
      await flushPromises();
      await flushPromises();
      expect(closeMenu).not.toHaveBeenCalled();
      // Navigation still happens — keepMenuOpen affects menu state only.
      expect(router.currentRoute.value.path).toBe('/profile');
    });

    it('Ctrl-click does NOT close the menu (user opening multiple new tabs)', async () => {
      const item = await mountItem({ to: '/profile' });
      // happy-dom doesn't natively distinguish modifier clicks via trigger();
      // pass options on the event constructor.
      await item.trigger('click', { ctrlKey: true });
      await flushPromises();
      expect(closeMenu).not.toHaveBeenCalled();
      // No SPA navigation either — browser handles new-tab natively.
      expect(router.currentRoute.value.path).toBe('/');
    });

    it('middle-button click does NOT close the menu', async () => {
      const item = await mountItem({ to: '/profile' });
      await item.trigger('click', { button: 1 });
      await flushPromises();
      expect(closeMenu).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toBe('/');
    });

    it('disabled link: aria-disabled, click suppressed, no navigation, no close', async () => {
      const item = await mountItem({ to: '/profile', disabled: true });
      expect(item.attributes('aria-disabled')).toBe('true');
      expect(item.attributes('tabindex')).toBe('-1');

      await item.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
      expect(closeMenu).not.toHaveBeenCalled();
      expect(wrapper.emitted('clicked')).toBeUndefined();
    });

    it('Enter keydown does NOT preventDefault on link (let browser fire native click)', async () => {
      const item = await mountItem({ to: '/profile' });
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      item.element.dispatchEvent(event);
      // Component must let the browser's native Enter→click pathway run.
      expect(event.defaultPrevented).toBe(false);
    });

    it('Space keydown navigates (regression — was emit+close without nav)', async () => {
      // Space on `<a>` does NOT fire a native click in any browser, so the
      // component synthesizes one on itemRef to unify Space with click and
      // ensure SPA navigation runs. Before this fix Space silently emitted
      // `clicked` and closed the menu without ever calling navigate().
      const item = await mountItem({ to: '/profile' });
      await item.trigger('keydown', { key: ' ' });
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/profile');
    });

    it('Space keydown also auto-closes the menu', async () => {
      const item = await mountItem({ to: '/profile' });
      await item.trigger('keydown', { key: ' ' });
      await flushPromises();
      await flushPromises();
      expect(closeMenu).toHaveBeenCalledTimes(1);
    });

    it('disabled link: Space keydown does nothing', async () => {
      const item = await mountItem({ to: '/profile', disabled: true });
      await item.trigger('keydown', { key: ' ' });
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
      expect(closeMenu).not.toHaveBeenCalled();
    });
  });

  describe('Branch 2: `to` set but no vue-router installed', () => {
    async function mountItem(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarMenuItem, {
        props: { label: 'Help', ...props },
        global: {
          provide: { [MENU_CLOSE_KEY as symbol]: closeMenu },
        },
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <a role="menuitem" href={String(to)}> fallback', async () => {
      const item = await mountItem({ to: 'https://docs.example.com' });
      expect(item.element.tagName).toBe('A');
      expect(item.attributes('href')).toBe('https://docs.example.com');
      expect(item.attributes('role')).toBe('menuitem');
    });

    it('plain click still auto-closes the menu', async () => {
      const item = await mountItem({ to: '/x' });
      await item.trigger('click');
      await flushPromises();
      await flushPromises();
      expect(closeMenu).toHaveBeenCalledTimes(1);
    });

    it('modifier-click does NOT close the menu', async () => {
      const item = await mountItem({ to: '/x' });
      await item.trigger('click', { metaKey: true });
      await flushPromises();
      expect(closeMenu).not.toHaveBeenCalled();
    });
  });

  describe('Branch 3: no `to` (regression suite for click-emit-only API)', () => {
    async function mountItem(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarMenuItem, {
        props: { label: 'Delete', ...props },
        global: {
          provide: { [MENU_CLOSE_KEY as symbol]: closeMenu },
        },
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <div role="menuitem"> (unchanged from pre-feature)', async () => {
      const item = await mountItem();
      expect(item.element.tagName).toBe('DIV');
      expect(item.attributes('role')).toBe('menuitem');
    });

    it('emits clicked + closes menu on click', async () => {
      const item = await mountItem();
      await item.trigger('click');
      expect(wrapper.emitted('clicked')).toHaveLength(1);
      await flushPromises();
      expect(closeMenu).toHaveBeenCalledTimes(1);
    });

    it('keepMenuOpen() in handler suppresses auto-close', async () => {
      wrapper = mount(CoarMenuItem, {
        props: { label: 'Delete' },
        global: { provide: { [MENU_CLOSE_KEY as symbol]: closeMenu } },
        attrs: {
          onClicked: (e: MenuItemClickEvent) => e.keepMenuOpen(),
        },
        attachTo: document.body,
      });
      await nextTick();
      const item = getItem(wrapper);
      await item.trigger('click');
      await flushPromises();
      expect(closeMenu).not.toHaveBeenCalled();
    });

    it('Enter keydown triggers clicked + closes menu', async () => {
      const item = await mountItem();
      await item.trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('clicked')).toHaveLength(1);
      await flushPromises();
      expect(closeMenu).toHaveBeenCalledTimes(1);
    });

    it('Space keydown triggers clicked + closes menu', async () => {
      const item = await mountItem();
      await item.trigger('keydown', { key: ' ' });
      expect(wrapper.emitted('clicked')).toHaveLength(1);
    });

    it('disabled: click suppressed, no emit, no close', async () => {
      const item = await mountItem({ disabled: true });
      await item.trigger('click');
      expect(wrapper.emitted('clicked')).toBeUndefined();
      expect(closeMenu).not.toHaveBeenCalled();
    });

    it('label slot still works when no label prop is set', async () => {
      wrapper = mount(CoarMenuItem, {
        slots: { default: 'Custom slot text' },
        global: { provide: { [MENU_CLOSE_KEY as symbol]: closeMenu } },
        attachTo: document.body,
      });
      await nextTick();
      expect(wrapper.text()).toContain('Custom slot text');
    });
  });
});
