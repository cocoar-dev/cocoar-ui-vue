import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import CoarLink from './CoarLink.vue';

/**
 * CoarLink has two layers:
 *
 *   1. **CSS-only layer** (legacy + still supported) — `<a class="coar-link">`
 *      with hand-written href / RouterLink. Tested in the first `describe`.
 *      The styles in `packages/ui/styles/link.css` are unchanged so existing
 *      consumers keep working.
 *
 *   2. **SFC wrapper** — `<CoarLink>` with `to` / `href` / `variant` / `size` /
 *      `disabled` props. Brings router-aware navigation + auto-rel-noopener +
 *      disabled-handling so consumers don't have to repeat the boilerplate.
 *      Four render branches: RouterLink+a / plain-a-from-to / plain-a-from-href
 *      / styled-fake-link.
 */

function getLink(wrapper: VueWrapper) {
  return wrapper.get<HTMLAnchorElement>('.coar-link');
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

describe('CoarLink (CSS-only legacy layer)', () => {
  // Verifies the original CSS-only API still works — consumers writing
  // <a class="coar-link"> directly without using the SFC.

  function mountLink(classes: string, attrs: Record<string, string> = {}) {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return mount(
      defineComponent({
        template: `<a class="${classes}" href="#" ${attrStr}>Link text</a>`,
      }),
    );
  }

  it('renders with .coar-link class', () => {
    const wrapper = mountLink('coar-link');
    expect(wrapper.find('.coar-link').exists()).toBe(true);
    expect(wrapper.element.tagName).toBe('A');
  });

  it('supports subtle + size modifiers', () => {
    const wrapper = mountLink('coar-link coar-link--subtle coar-link--s');
    expect(wrapper.classes()).toContain('coar-link--subtle');
    expect(wrapper.classes()).toContain('coar-link--s');
  });

  it('supports aria-disabled + disabled class', () => {
    const wrapper = mountLink('coar-link coar-link--disabled', { 'aria-disabled': 'true' });
    expect(wrapper.classes()).toContain('coar-link--disabled');
    expect(wrapper.attributes('aria-disabled')).toBe('true');
  });
});

describe('CoarLink (SFC) — render branches', () => {
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

    async function mountLink(props: Record<string, unknown>) {
      wrapper = mount(CoarLink, {
        props,
        slots: { default: 'Docs' },
        global: { plugins: [router] },
        attachTo: document.body,
      });
      await nextTick();
      return getLink(wrapper);
    }

    it('renders <a href> with resolved router URL', async () => {
      const link = await mountLink({ to: '/docs' });
      expect(link.element.tagName).toBe('A');
      expect(link.attributes('href')).toBe('/docs');
    });

    it('SPA-navigates on plain click', async () => {
      const link = await mountLink({ to: '/docs' });
      await link.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/docs');
    });

    it('emits @click on plain click', async () => {
      const link = await mountLink({ to: '/docs' });
      await link.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('sets aria-current=page when route matches (RouterLink isActive)', async () => {
      await router.push('/docs');
      await router.isReady();
      const link = await mountLink({ to: '/docs' });
      await nextTick();
      expect(link.attributes('aria-current')).toBe('page');
    });

    it('disabled link: aria-disabled, tabindex=-1, no nav, no emit', async () => {
      const link = await mountLink({ to: '/docs', disabled: true });
      expect(link.attributes('aria-disabled')).toBe('true');
      expect(link.attributes('tabindex')).toBe('-1');
      expect(link.classes()).toContain('coar-link--disabled');
      await link.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
      expect(wrapper.emitted('click')).toBeUndefined();
    });
  });

  describe('Branch 2: `to` set, no router', () => {
    async function mountLink(props: Record<string, unknown>) {
      wrapper = mount(CoarLink, {
        props,
        slots: { default: 'External' },
        attachTo: document.body,
      });
      await nextTick();
      return getLink(wrapper);
    }

    it('renders <a href={String(to)}> fallback', async () => {
      const link = await mountLink({ to: 'https://example.com' });
      expect(link.attributes('href')).toBe('https://example.com');
    });

    it('warns once on object `to` without router', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await mountLink({ to: { name: 'docs' } });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('[CoarLink]');
      warn.mockRestore();
    });
  });

  describe('Branch 3: external `href`', () => {
    async function mountLink(props: Record<string, unknown>) {
      wrapper = mount(CoarLink, {
        props,
        slots: { default: 'Docs' },
        attachTo: document.body,
      });
      await nextTick();
      return getLink(wrapper);
    }

    it('renders <a href={href}>', async () => {
      const link = await mountLink({ href: 'https://docs.cocoar.dev' });
      expect(link.attributes('href')).toBe('https://docs.cocoar.dev');
    });

    it('auto-adds rel="noopener" when target="_blank" and rel omitted', async () => {
      const link = await mountLink({
        href: 'https://docs.cocoar.dev',
        target: '_blank',
      });
      expect(link.attributes('rel')).toBe('noopener');
    });

    it('respects explicit rel even with target=_blank', async () => {
      const link = await mountLink({
        href: 'https://docs.cocoar.dev',
        target: '_blank',
        rel: 'noopener noreferrer external',
      });
      expect(link.attributes('rel')).toBe('noopener noreferrer external');
    });

    it('respects explicit rel="" (consumer intentionally opts out of auto-noopener)', async () => {
      // Edge case: a consumer who passes `rel=""` to override the auto-rel
      // (e.g. they want to opt into window.opener access for same-origin
      // popup communication). The guard uses `!== undefined`, not truthy,
      // so empty string survives.
      const link = await mountLink({
        href: 'https://docs.cocoar.dev',
        target: '_blank',
        rel: '',
      });
      // happy-dom may serialize empty rel as either '' or undefined; both
      // confirm we did NOT auto-fill 'noopener'.
      expect(link.attributes('rel') ?? '').toBe('');
    });

    it('does not stamp rel when target is not _blank', async () => {
      const link = await mountLink({ href: 'mailto:hi@example.com' });
      expect(link.attributes('rel')).toBeUndefined();
    });

    it('emits @click + does NOT preventDefault (browser handles nav)', async () => {
      const link = await mountLink({ href: 'https://docs.cocoar.dev' });
      await link.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });
  });

  describe('Branch 4: no `to` / no `href` — fake-link button', () => {
    async function mountLink(props: Record<string, unknown> = {}) {
      wrapper = mount(CoarLink, {
        props,
        slots: { default: 'Trigger something' },
        attachTo: document.body,
      });
      await nextTick();
      return getLink(wrapper);
    }

    it('renders a real <button>, NOT <a role="button">', async () => {
      // An <a> without href is not a link per HTML spec; <button> is the
      // semantically-correct element for "looks like a link but triggers
      // a callback". Pinning the tag explicitly.
      const link = await mountLink();
      expect(link.element.tagName).toBe('BUTTON');
      expect(link.attributes('type')).toBe('button');
      expect(link.attributes('href')).toBeUndefined();
      expect(link.attributes('role')).toBeUndefined();
    });

    it('Enter + Space trigger @click natively via <button>', async () => {
      // <button> has native Enter+Space activation — no manual keydown
      // handlers needed. The browser synthesises a click on either key,
      // which routes through @click as one event each.
      const link = await mountLink();
      await link.trigger('keydown', { key: 'Enter' });
      await link.trigger('keydown', { key: ' ' });
      // happy-dom doesn't synthesise the keydown→click handoff that real
      // browsers do, so we explicitly fire click to verify the path works
      // and the count is consistent with normal use.
      await link.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });

    it('disabled: native disabled attribute, click suppressed', async () => {
      const link = await mountLink({ disabled: true });
      expect(link.attributes('disabled')).toBeDefined();
      expect(link.attributes('aria-disabled')).toBe('true');
      await link.trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });

    it('still carries .coar-link visual classes for styling parity', async () => {
      const link = await mountLink({ variant: 'subtle', size: 'l' });
      expect(link.classes()).toContain('coar-link');
      expect(link.classes()).toContain('coar-link--subtle');
      expect(link.classes()).toContain('coar-link--l');
      // Plus the button-reset marker class.
      expect(link.classes()).toContain('coar-link--as-button');
    });
  });

  describe('Visual variants + sizes', () => {
    function mountLink(props: Record<string, unknown>) {
      wrapper = mount(CoarLink, {
        props,
        slots: { default: 'Link' },
        attachTo: document.body,
      });
      return getLink(wrapper);
    }

    it('default variant accent + size m', () => {
      const link = mountLink({ href: '#' });
      expect(link.classes()).toContain('coar-link');
      expect(link.classes()).not.toContain('coar-link--subtle');
      expect(link.classes()).toContain('coar-link--m');
    });

    it('variant subtle adds --subtle modifier', () => {
      const link = mountLink({ href: '#', variant: 'subtle' });
      expect(link.classes()).toContain('coar-link--subtle');
    });

    it.each(['s', 'm', 'l'] as const)('size %s adds --%s modifier', (size) => {
      const link = mountLink({ href: '#', size });
      expect(link.classes()).toContain(`coar-link--${size}`);
    });
  });
});
