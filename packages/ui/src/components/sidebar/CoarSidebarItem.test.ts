import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import CoarSidebarItem from './CoarSidebarItem.vue';

/**
 * Suite covers three render branches:
 *   (1) `to` set + vue-router installed → RouterLink custom-mode <a href>
 *   (2) `to` set + no router            → plain <a href={String(to)}>
 *   (3) no `to`                         → original <div role="menuitem">
 *
 * Branch (3) is the pre-feature behaviour and is pinned here as a regression
 * suite — anyone changing the conditional template must not break consumers
 * who use the click-emit-only API for action items (logout, drawer-toggle).
 *
 * Note on Vue Test Utils: the template now has multiple top-level branches
 * via v-if / v-else-if / v-else, so the component root is a fragment. That
 * makes `wrapper.attributes()` / `wrapper.classes()` / `wrapper.trigger()`
 * unreliable — they sometimes read from a v-if placeholder comment instead
 * of the rendered element. We always resolve the element via the stable
 * `.coar-sidebar-item` class first.
 */

function getItem(wrapper: VueWrapper) {
  return wrapper.get<HTMLElement>('.coar-sidebar-item');
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => h('div', 'home') }) },
      { path: '/dashboard', component: defineComponent({ render: () => h('div', 'dash') }) },
      { path: '/tasks', component: defineComponent({ render: () => h('div', 'tasks') }) },
    ],
  });
}

describe('CoarSidebarItem — link variants', () => {
  let wrapper: VueWrapper;

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

    async function mountItem(props: Record<string, unknown>) {
      wrapper = mount(CoarSidebarItem, {
        props: { label: 'Dashboard', icon: 'layout-dashboard', ...props },
        global: { plugins: [router] },
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <a href> not <div>', async () => {
      const item = await mountItem({ to: '/dashboard' });
      expect(item.element.tagName).toBe('A');
      expect(item.attributes('href')).toBe('/dashboard');
    });

    it('does not stamp role="menuitem" on the link variant', async () => {
      // Sidebar parent is role="navigation"; an <a> inside it is already
      // semantic — adding role="menuitem" without a role="menu" ancestor is
      // a WAI-ARIA mismatch we intentionally avoid.
      const item = await mountItem({ to: '/dashboard' });
      expect(item.attributes('role')).toBeUndefined();
    });

    it('keeps the coar-sidebar-item class so styling carries over', async () => {
      const item = await mountItem({ to: '/dashboard' });
      expect(item.classes()).toContain('coar-sidebar-item');
    });

    it('reflects RouterLink isActive in --active class + aria-current=page', async () => {
      await router.push('/dashboard');
      await router.isReady();
      const item = await mountItem({ to: '/dashboard' });
      await nextTick();
      expect(item.classes()).toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBe('page');
    });

    it('is not active when the current route differs', async () => {
      await router.push('/');
      await router.isReady();
      const item = await mountItem({ to: '/dashboard' });
      await nextTick();
      expect(item.classes()).not.toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBeUndefined();
    });

    it('explicit active=true overrides RouterLink isActive=false', async () => {
      await router.push('/');
      await router.isReady();
      const item = await mountItem({ to: '/dashboard', active: true });
      await nextTick();
      expect(item.classes()).toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBe('page');
    });

    it('explicit active=false overrides RouterLink isActive=true', async () => {
      await router.push('/dashboard');
      await router.isReady();
      const item = await mountItem({ to: '/dashboard', active: false });
      await nextTick();
      expect(item.classes()).not.toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBeUndefined();
    });

    it('plain click triggers SPA navigation (no full-page reload)', async () => {
      const item = await mountItem({ to: '/dashboard' });
      expect(router.currentRoute.value.path).toBe('/');
      await item.trigger('click');
      // navigate() returns a Promise (NavigationFailure | undefined); wait
      // for that microtask chain plus router-internal awaits to settle.
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/dashboard');
    });

    it('plain click also emits @click for consumer side-effects', async () => {
      const item = await mountItem({ to: '/dashboard' });
      await item.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('disabled link: aria-disabled + tabindex=-1 + click suppressed', async () => {
      const item = await mountItem({ to: '/dashboard', disabled: true });
      expect(item.attributes('aria-disabled')).toBe('true');
      expect(item.attributes('tabindex')).toBe('-1');

      await item.trigger('click');
      await nextTick();
      // Navigation must NOT have happened.
      expect(router.currentRoute.value.path).toBe('/');
      // And no consumer emit either.
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('enabled link has no manual tabindex (native <a> tabbability)', async () => {
      const item = await mountItem({ to: '/dashboard' });
      expect(item.attributes('tabindex')).toBeUndefined();
    });
  });

  describe('Branch 2: `to` set but no vue-router installed', () => {
    async function mountItem(props: Record<string, unknown>) {
      wrapper = mount(CoarSidebarItem, {
        props: { label: 'External', ...props },
        // No router plugin — RouterLink is not registered globally.
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <a href={String(to)}> fallback', async () => {
      const item = await mountItem({ to: 'https://example.com' });
      expect(item.element.tagName).toBe('A');
      expect(item.attributes('href')).toBe('https://example.com');
    });

    it('still applies coar-sidebar-item class', async () => {
      const item = await mountItem({ to: '/x' });
      expect(item.classes()).toContain('coar-sidebar-item');
    });

    it('isActive is false (no router to compute it)', async () => {
      const item = await mountItem({ to: '/x' });
      expect(item.classes()).not.toContain('coar-sidebar-item--active');
    });

    it('explicit active prop still works in the fallback path', async () => {
      const item = await mountItem({ to: '/x', active: true });
      expect(item.classes()).toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBe('page');
    });

    it('emits @click on plain click (browser handles native navigation)', async () => {
      const item = await mountItem({ to: '/x' });
      await item.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });
  });

  describe('Branch 3: no `to` (regression suite for click-emit-only API)', () => {
    async function mountItem(props: Record<string, unknown>) {
      wrapper = mount(CoarSidebarItem, {
        props: { label: 'Logout', icon: 'log-out', ...props },
        attachTo: document.body,
      });
      await nextTick();
      return getItem(wrapper);
    }

    it('renders as <div role="menuitem"> (unchanged from pre-feature)', async () => {
      const item = await mountItem({});
      expect(item.element.tagName).toBe('DIV');
      expect(item.attributes('role')).toBe('menuitem');
    });

    it('tabindex=0 by default (focusable div)', async () => {
      const item = await mountItem({});
      expect(item.attributes('tabindex')).toBe('0');
    });

    it('tabindex=-1 when disabled', async () => {
      const item = await mountItem({ disabled: true });
      expect(item.attributes('tabindex')).toBe('-1');
    });

    it('emits @click on click', async () => {
      const item = await mountItem({});
      await item.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('emits @click on Enter keydown', async () => {
      const item = await mountItem({});
      await item.trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('emits @click on Space keydown', async () => {
      const item = await mountItem({});
      await item.trigger('keydown', { key: ' ' });
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('suppresses @click when disabled', async () => {
      const item = await mountItem({ disabled: true });
      await item.trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('active prop applies --active class + aria-current=page', async () => {
      const item = await mountItem({ active: true });
      expect(item.classes()).toContain('coar-sidebar-item--active');
      expect(item.attributes('aria-current')).toBe('page');
    });
  });
});
