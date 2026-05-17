import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import CoarBreadcrumbItem from './CoarBreadcrumbItem.vue';
import CoarBreadcrumb from './CoarBreadcrumb.vue';
import CoarIcon from '../icon/CoarIcon.vue';

/**
 * Four render modes, decided automatically from props:
 *
 *   1. `active`     → <span aria-current="page">       (no link to self)
 *   2. `to` + router → <RouterLink custom> + <a>        (SPA-routed)
 *   3. `to`/`href`   → plain <a href>                   (browser nav)
 *   4. none of above → bare <slot />                    (escape hatch)
 *
 * Active wins over to/href — consumers can pass `to` on every crumb
 * (including the last) without filtering manually.
 *
 * The CSS-only slot-mode (mode 4 with consumer-provided <a>) is covered by
 * the sibling `CoarBreadcrumb.test.ts` — this suite focuses on the new
 * library-rendered branches.
 */

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => h('div', 'home') }) },
      { path: '/projects', component: defineComponent({ render: () => h('div', 'p') }) },
      { path: '/projects/alpha', component: defineComponent({ render: () => h('div', 'a') }) },
    ],
  });
}

describe('CoarBreadcrumbItem — render modes', () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('Mode 1: active (current page)', () => {
    function mountItem(props: Record<string, unknown> = {}, slot = 'Current page') {
      wrapper = mount(CoarBreadcrumbItem, {
        props: { active: true, ...props },
        slots: { default: slot },
        attachTo: document.body,
      });
      return wrapper;
    }

    it('renders <span aria-current="page"> instead of <a>', () => {
      mountItem();
      expect(wrapper.find('a').exists()).toBe(false);
      const span = wrapper.find('.coar-breadcrumb-link--active');
      expect(span.exists()).toBe(true);
      expect(span.attributes('aria-current')).toBe('page');
    });

    it('renders slot content', () => {
      mountItem({}, 'Current page');
      expect(wrapper.text()).toContain('Current page');
    });

    it('aria-current is on the <li> too (legacy AT-compat)', () => {
      mountItem();
      const li = wrapper.element as HTMLLIElement;
      expect(li.getAttribute('aria-current')).toBe('page');
    });

    it('ignores `to` — active wins (no link-to-self)', () => {
      // Consumers may pass `to` on every crumb including the last to keep
      // their .map() loop clean. The active flag is the source of truth.
      mountItem({ to: '/projects/alpha' });
      expect(wrapper.find('a').exists()).toBe(false);
      expect(wrapper.find('.coar-breadcrumb-link--active').exists()).toBe(true);
    });

    it('icon prop renders inside the active span', () => {
      mountItem({ icon: 'folder' });
      const icon = wrapper.findComponent(CoarIcon);
      expect(icon.exists()).toBe(true);
      expect(icon.props('name')).toBe('folder');
    });
  });

  describe('Mode 2: `to` + vue-router installed', () => {
    let router: Router;

    beforeEach(async () => {
      router = makeRouter();
      await router.push('/');
      await router.isReady();
    });

    async function mountItem(props: Record<string, unknown> = {}, slot = 'Projects') {
      wrapper = mount(CoarBreadcrumbItem, {
        props,
        slots: { default: slot },
        global: { plugins: [router] },
        attachTo: document.body,
      });
      await nextTick();
      return wrapper;
    }

    it('renders <a href> with resolved router URL', async () => {
      await mountItem({ to: '/projects' });
      const a = wrapper.find('a');
      expect(a.exists()).toBe(true);
      expect(a.attributes('href')).toBe('/projects');
      expect(a.classes()).toContain('coar-breadcrumb-link');
    });

    it('plain click triggers SPA navigation', async () => {
      await mountItem({ to: '/projects' });
      await wrapper.find('a').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/projects');
    });

    it('icon prop renders inside the <a> (shares hit-area)', async () => {
      await mountItem({ to: '/projects', icon: 'folder' });
      const icon = wrapper.find('a').findComponent(CoarIcon);
      expect(icon.exists()).toBe(true);
      expect(icon.props('name')).toBe('folder');
    });

    it('disabled link: aria-disabled, tabindex=-1, no nav', async () => {
      await mountItem({ to: '/projects', disabled: true });
      const a = wrapper.find('a');
      expect(a.attributes('aria-disabled')).toBe('true');
      expect(a.attributes('tabindex')).toBe('-1');
      await a.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
    });
  });

  describe('Mode 3: plain link (`href` or `to` without router)', () => {
    async function mountItem(props: Record<string, unknown> = {}, slot = 'Link') {
      wrapper = mount(CoarBreadcrumbItem, {
        props,
        slots: { default: slot },
        attachTo: document.body,
      });
      await nextTick();
      return wrapper;
    }

    it('renders <a href={href}> for href prop', async () => {
      await mountItem({ href: 'https://docs.example.com' });
      const a = wrapper.find('a');
      expect(a.exists()).toBe(true);
      expect(a.attributes('href')).toBe('https://docs.example.com');
    });

    it('renders <a href={String(to)}> for to without router', async () => {
      await mountItem({ to: '/x' });
      const a = wrapper.find('a');
      expect(a.attributes('href')).toBe('/x');
    });

    it('warns once on object `to` without router', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await mountItem({ to: { name: 'projects' } });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('[CoarBreadcrumbItem]');
      warn.mockRestore();
    });

    it('to takes precedence over href when both set', async () => {
      await mountItem({ to: '/from-to', href: 'https://from-href.example.com' });
      expect(wrapper.find('a').attributes('href')).toBe('/from-to');
    });
  });

  describe('Mode 4: bare slot (escape hatch for custom content)', () => {
    function mountItem(slot: string) {
      wrapper = mount(CoarBreadcrumbItem, {
        slots: { default: slot },
        attachTo: document.body,
      });
      return wrapper;
    }

    it('renders only the slot content — no library-injected <a> or <span>', () => {
      mountItem('<select><option>Project A</option></select>');
      // No coar-breadcrumb-link wrapper.
      expect(wrapper.find('.coar-breadcrumb-link').exists()).toBe(false);
      // Slot content is rendered as-is.
      expect(wrapper.find('select').exists()).toBe(true);
    });

    it('respects consumer-slotted <a> (the original CSS-only API)', () => {
      mountItem('<a href="/legacy" class="custom-link">Legacy</a>');
      const a = wrapper.find('a');
      expect(a.exists()).toBe(true);
      expect(a.attributes('href')).toBe('/legacy');
      expect(a.classes()).toContain('custom-link');
    });
  });

  describe('Icon slot precedence', () => {
    it('#icon slot overrides icon prop', async () => {
      wrapper = mount(CoarBreadcrumbItem, {
        props: { to: '/x', icon: 'folder' },
        slots: {
          default: 'Projects',
          icon: '<span class="custom-icon" data-test="custom">🎨</span>',
        },
        attachTo: document.body,
      });
      await nextTick();
      expect(wrapper.find('.custom-icon').exists()).toBe(true);
      // The CoarIcon from the prop should NOT render when the slot is provided.
      expect(wrapper.findComponent(CoarIcon).exists()).toBe(false);
    });

    it('icon prop renders when #icon slot is not provided', async () => {
      wrapper = mount(CoarBreadcrumbItem, {
        props: { to: '/x', icon: 'folder' },
        slots: { default: 'Projects' },
        attachTo: document.body,
      });
      await nextTick();
      expect(wrapper.findComponent(CoarIcon).exists()).toBe(true);
    });
  });

  describe('Composition inside <CoarBreadcrumb>', () => {
    // Verify the new modes compose correctly inside the parent — separators,
    // ordering, mixed-mode trails.

    function mountTrail(template: string, options?: { router?: Router }) {
      wrapper = mount(
        defineComponent({
          components: { CoarBreadcrumb, CoarBreadcrumbItem },
          template,
        }),
        {
          global: options?.router ? { plugins: [options.router] } : undefined,
          attachTo: document.body,
        },
      );
      return wrapper;
    }

    it('mixes link items + active terminator correctly', async () => {
      const router = makeRouter();
      await router.push('/');
      await router.isReady();

      mountTrail(
        `
        <CoarBreadcrumb>
          <CoarBreadcrumbItem to="/projects" icon="folder">Projects</CoarBreadcrumbItem>
          <CoarBreadcrumbItem to="/projects/alpha">Alpha</CoarBreadcrumbItem>
          <CoarBreadcrumbItem :active="true">Issues</CoarBreadcrumbItem>
        </CoarBreadcrumb>
        `,
        { router },
      );

      const items = wrapper.findAll('.coar-breadcrumb-item');
      expect(items).toHaveLength(3);
      // First two: <a> rendered
      expect(items[0].find('a').exists()).toBe(true);
      expect(items[1].find('a').exists()).toBe(true);
      // Last: active span, no <a>
      expect(items[2].find('a').exists()).toBe(false);
      expect(items[2].find('.coar-breadcrumb-link--active').exists()).toBe(true);
    });

    it('escape-hatch item (custom dropdown) coexists with link items', () => {
      mountTrail(`
        <CoarBreadcrumb>
          <CoarBreadcrumbItem href="/projects">Projects</CoarBreadcrumbItem>
          <CoarBreadcrumbItem>
            <select data-test="picker"><option>Alpha</option></select>
          </CoarBreadcrumbItem>
          <CoarBreadcrumbItem active>Issues</CoarBreadcrumbItem>
        </CoarBreadcrumb>
      `);
      const items = wrapper.findAll('.coar-breadcrumb-item');
      expect(items).toHaveLength(3);
      expect(items[0].find('a').attributes('href')).toBe('/projects');
      expect(items[1].find('select[data-test="picker"]').exists()).toBe(true);
      expect(items[2].attributes('aria-current')).toBe('page');
    });
  });
});
