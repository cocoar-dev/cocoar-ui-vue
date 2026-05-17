import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import CoarButton from './CoarButton.vue';

/**
 * Covers the `to` prop addition. Three render branches:
 *   (1) `to` set + vue-router installed → <RouterLink>-rendered <a>
 *   (2) `to` set + no router            → plain <a href={String(to)}>
 *   (3) no `to`                         → original <button> (regression)
 *
 * Note: existing button behaviour (variants, sizes, slots, etc.) is covered
 * by CoarButton.test.ts — this suite is scoped to the `to` integration only.
 *
 * Unlike CoarSidebarItem/CoarMenuItem, CoarButton uses RouterLink in
 * NON-custom mode (single-template `<component :is>` root) — there is no
 * `active` prop or aria-current concern that would need slot access to
 * `isActive` / `navigate`. RouterLink wires its own click handler including
 * the modifier-click guardEvent.
 */

function getRoot(wrapper: VueWrapper) {
  return wrapper.get<HTMLElement>('.coar-button');
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => h('div', 'home') }) },
      { path: '/docs', component: defineComponent({ render: () => h('div', 'docs') }) },
    ],
  });
}

describe('CoarButton — `to` prop', () => {
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

    async function mountBtn(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarButton, {
        props,
        slots: { default: 'Open docs' },
        global: { plugins: [router] },
        attachTo: document.body,
      });
      await nextTick();
      return getRoot(wrapper);
    }

    it('renders as <a href> with the resolved router URL', async () => {
      const root = await mountBtn({ to: '/docs' });
      expect(root.element.tagName).toBe('A');
      expect(root.attributes('href')).toBe('/docs');
    });

    it('keeps all coar-button visual classes (variant, size, etc.)', async () => {
      const root = await mountBtn({ to: '/docs', variant: 'primary', size: 'l' });
      const classes = root.classes();
      expect(classes).toContain('coar-button');
      expect(classes).toContain('coar-button--primary');
      expect(classes).toContain('coar-button--l');
    });

    it('does NOT stamp type or disabled HTML attrs on the <a> branch', async () => {
      // `type` and `disabled` are invalid on <a> and would be rendered as
      // unknown attrs without a guard. computed `rootBindings` filters them.
      const root = await mountBtn({ to: '/docs', type: 'submit', disabled: true });
      expect(root.attributes('type')).toBeUndefined();
      expect(root.attributes('disabled')).toBeUndefined();
    });

    it('plain click triggers SPA navigation (no full-page reload)', async () => {
      const root = await mountBtn({ to: '/docs' });
      expect(router.currentRoute.value.path).toBe('/');
      await root.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/docs');
    });

    it('plain click also emits @click for consumer side-effects', async () => {
      const root = await mountBtn({ to: '/docs' });
      await root.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('modifier-click does NOT trigger SPA nav (browser opens new tab)', async () => {
      const root = await mountBtn({ to: '/docs' });
      await root.trigger('click', { ctrlKey: true });
      await flushPromises();
      // SPA stayed on /, browser handles native new-tab open.
      expect(router.currentRoute.value.path).toBe('/');
    });

    it('disabled link: tabindex=-1, aria-disabled, no nav, no emit', async () => {
      const root = await mountBtn({ to: '/docs', disabled: true });
      expect(root.attributes('aria-disabled')).toBe('true');
      expect(root.attributes('tabindex')).toBe('-1');
      expect(root.classes()).toContain('coar-button--disabled');

      await root.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('loading link: aria-busy, tabindex=-1, no nav, no emit', async () => {
      const root = await mountBtn({ to: '/docs', loading: true });
      expect(root.attributes('aria-busy')).toBe('true');
      expect(root.attributes('aria-disabled')).toBe('true');
      expect(root.attributes('tabindex')).toBe('-1');

      await root.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('enabled link has no manual tabindex (native <a> tabbability)', async () => {
      const root = await mountBtn({ to: '/docs' });
      expect(root.attributes('tabindex')).toBeUndefined();
    });

    it('renders slot content + iconStart/iconEnd identically to <button>', async () => {
      const root = await mountBtn({ to: '/docs', iconStart: 'home', iconEnd: 'arrow-right' });
      expect(root.text()).toContain('Open docs');
      expect(wrapper.find('.coar-button__icon--start').exists()).toBe(true);
      expect(wrapper.find('.coar-button__icon--end').exists()).toBe(true);
    });
  });

  describe('Branch 2: `to` set, no router installed', () => {
    async function mountBtn(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarButton, {
        props,
        slots: { default: 'External' },
        // No router plugin.
        attachTo: document.body,
      });
      await nextTick();
      return getRoot(wrapper);
    }

    it('renders as <a href={String(to)}> fallback', async () => {
      const root = await mountBtn({ to: 'https://example.com' });
      expect(root.element.tagName).toBe('A');
      expect(root.attributes('href')).toBe('https://example.com');
    });

    it('disabled fallback: tabindex=-1 + aria-disabled, click suppressed', async () => {
      const root = await mountBtn({ to: '/x', disabled: true });
      expect(root.attributes('tabindex')).toBe('-1');
      expect(root.attributes('aria-disabled')).toBe('true');
      await root.trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('emits @click on plain click (browser handles native navigation)', async () => {
      const root = await mountBtn({ to: '/x' });
      await root.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('object route (RouteLocationRaw shape) falls back to String(to)', async () => {
      // Without a router we have no way to resolve { name: 'foo' } — we
      // stringify it. Documenting this in tests so consumers know the
      // fallback is "object → degraded link". The DEV-only console.warn
      // (covered in the next test) makes this footgun loud at dev-time.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = await mountBtn({ to: { name: 'docs' } });
      expect(root.element.tagName).toBe('A');
      expect(root.attributes('href')).toBe('[object Object]');
      warn.mockRestore();
    });

    it('warns once when `to` is a non-string object without a router', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await mountBtn({ to: { name: 'docs' } });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('[CoarButton]');
      expect(warn.mock.calls[0][0]).toContain('vue-router');
      warn.mockRestore();
    });

    it('does NOT warn for string `to` without a router (the happy path)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await mountBtn({ to: '/x' });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('Branch 3: no `to` (regression suite for <button> behaviour)', () => {
    async function mountBtn(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarButton, {
        props,
        slots: { default: 'Click me' },
        attachTo: document.body,
      });
      await nextTick();
      return getRoot(wrapper);
    }

    it('renders as <button type="button"> by default', async () => {
      const root = await mountBtn();
      expect(root.element.tagName).toBe('BUTTON');
      expect(root.attributes('type')).toBe('button');
    });

    it('honors explicit type="submit"', async () => {
      const root = await mountBtn({ type: 'submit' });
      expect(root.attributes('type')).toBe('submit');
    });

    it('uses native disabled attribute (not just aria-disabled)', async () => {
      const root = await mountBtn({ disabled: true });
      expect(root.attributes('disabled')).toBeDefined();
      expect(root.attributes('aria-disabled')).toBe('true');
    });

    it('does NOT set tabindex on the <button> branch (native focusability)', async () => {
      const root = await mountBtn({ disabled: true });
      expect(root.attributes('tabindex')).toBeUndefined();
    });

    it('emits @click on click', async () => {
      const root = await mountBtn();
      await root.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('does not emit @click when disabled', async () => {
      const root = await mountBtn({ disabled: true });
      await root.trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('does not emit @click when loading', async () => {
      const root = await mountBtn({ loading: true });
      await root.trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });
  });
});
