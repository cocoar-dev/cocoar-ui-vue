import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, onMounted } from 'vue';
// Vite-native ?raw import — pulls the SFC's source-text for the regression
// pin below without needing @types/node for fs/path/url.
import sfcSource from './CoarOverlayOutlet.vue?raw';
import { MOBILE_CONTEXT_TOKENS } from './overlay-types';
import CoarOverlayHost from './CoarOverlayHost.vue';
import {
  CoarOverlayPlugin,
  _resetOverlayServiceForTests,
  getOverlayService,
  useOverlayParent,
} from './useOverlay';

/**
 * Regression suite for the `.coar-overlay-panel` layout contract.
 *
 * Bug history: prior to this fix the panel had `display: flex` but no
 * `flex: 1` / `min-width: 0`. As a flex child of `.coar-overlay-host` it
 * therefore shrank to its content's intrinsic width, ignoring the
 * `size: { width: '42rem' }` width that `overlay-service.applySize`
 * writes onto the host. Consumer apps had to override with a global
 * `.coar-overlay-panel { flex: 1; min-width: 0 }` rule.
 *
 * The tests below pin both the source declaration (the WHY/intent) and
 * the runtime cascade (the actual computed effect) so a future refactor
 * of the style block can't silently break the contract.
 */
describe('CoarOverlayOutlet — panel layout contract', () => {
  it('SFC source declares flex: 1 and min-width: 0 on .coar-overlay-panel', () => {
    const panelRule = sfcSource.match(/\.coar-overlay-panel\s*\{[\s\S]*?\n\}/);
    expect(panelRule, '.coar-overlay-panel rule not found in SFC').not.toBeNull();
    const body = panelRule![0];
    expect(body).toMatch(/\bflex:\s*1\b/);
    expect(body).toMatch(/\bmin-width:\s*0\b/);
    expect(body).toMatch(/\bdisplay:\s*flex\b/);
    expect(body).toMatch(/\bbox-sizing:\s*border-box\b/);
  });

  describe('computed style at runtime', () => {
    let styleEl: HTMLStyleElement;
    let host: HTMLElement;
    let panel: HTMLElement;

    beforeEach(() => {
      const styleMatch = sfcSource.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      expect(styleMatch, 'SFC <style> block missing').not.toBeNull();
      styleEl = document.createElement('style');
      styleEl.textContent = styleMatch![1];
      document.head.appendChild(styleEl);

      host = document.createElement('div');
      host.className = 'coar-overlay-host';
      host.style.width = '672px';
      document.body.appendChild(host);

      panel = document.createElement('div');
      panel.className = 'coar-overlay-panel';
      host.appendChild(panel);
    });

    afterEach(() => {
      host.remove();
      styleEl.remove();
    });

    it('cascades flex: 1, min-width: 0, display: flex onto the panel', () => {
      const cs = getComputedStyle(panel);
      expect(cs.flexGrow).toBe('1');
      // happy-dom returns the raw declared value ('0'); real browsers serialize
      // it as '0px'. Accept either — we care that it is the zero value, not the
      // serialization.
      expect(['0', '0px']).toContain(cs.minWidth);
      expect(cs.display).toBe('flex');
      expect(cs.boxSizing).toBe('border-box');
    });

    it('does not write an inline width onto the panel (panel fills host via flex)', () => {
      // The host gets `width: 672px` from overlay-service.applySize; the panel
      // must NOT receive an inline width — its width comes from `flex: 1`.
      // Defending against a regression where someone "fixes" sizing by setting
      // panel width = host width inline (which breaks min-width: 0).
      expect(panel.style.width).toBe('');
      expect(panel.style.flex).toBe('');
    });
  });

  describe('overlay-service integration', () => {
    let wrapper: VueWrapper;

    afterEach(() => {
      wrapper?.unmount();
      _resetOverlayServiceForTests();
      // Clean up any teleported overlay nodes left in document.body.
      document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((n) => n.remove());
    });

    function mountHost() {
      wrapper = mount(CoarOverlayHost, {
        global: { plugins: [CoarOverlayPlugin] },
        attachTo: document.body,
      });
      return getOverlayService();
    }

    it('writes the configured width onto the host and leaves the panel inline-width-free', async () => {
      const service = mountHost();
      const Content = defineComponent({
        name: 'TestContent',
        render: () => h('div', { class: 'test-content' }, 'hi'),
      });

      service.open({
        spec: {
          anchor: { kind: 'virtual', placement: 'center' },
          size: { width: 672 },
        },
        content: { kind: 'component', component: Content },
      });

      await nextTick();
      await nextTick();

      const hostEl = document.querySelector('.coar-overlay-host') as HTMLElement;
      const panelEl = document.querySelector('.coar-overlay-panel') as HTMLElement;
      expect(hostEl, '.coar-overlay-host not rendered').not.toBeNull();
      expect(panelEl, '.coar-overlay-panel not rendered').not.toBeNull();

      // applySize() target — host receives the configured width.
      expect(hostEl.style.width).toBe('672px');

      // Panel must rely on flex: 1 from CSS, not on inline width.
      expect(panelEl.style.width).toBe('');

      // Class is applied so the CSS rule can match.
      expect(panelEl.classList.contains('coar-overlay-panel')).toBe(true);
    });

    it('still works for size: { width: "42rem" } (string width path)', async () => {
      const service = mountHost();
      const Content = defineComponent({ render: () => h('div', 'x') });

      service.open({
        spec: {
          anchor: { kind: 'virtual', placement: 'center' },
          size: { width: '42rem' },
        },
        content: { kind: 'component', component: Content },
      });

      await nextTick();
      await nextTick();

      const hostEl = document.querySelector('.coar-overlay-host') as HTMLElement;
      expect(hostEl.style.width).toBe('42rem');
    });

    it('propagates the nearest scoped theme to a teleported overlay host', async () => {
      const service = mountHost();
      const Content = defineComponent({ render: () => h('div', 'themed') });
      const scope = document.createElement('div');
      scope.className = 'coar-theme-scope dark-mode';
      scope.style.setProperty('--coar-accent', '#10b981');
      const anchor = document.createElement('button');
      scope.appendChild(anchor);
      document.body.appendChild(scope);

      service.open({
        spec: {
          anchor: { kind: 'element', element: anchor },
          position: { placement: 'bottom-start' },
        },
        content: { kind: 'component', component: Content },
      });
      await nextTick();
      await nextTick();

      const hostEl = document.querySelector('.coar-overlay-host') as HTMLElement;
      expect(hostEl.classList.contains('dark-mode')).toBe(true);
      expect(hostEl.getAttribute('data-coar-theme-proxy')).toBe('');
      expect(hostEl.style.getPropertyValue('--coar-accent')).toBe('#10b981');
      scope.remove();
    });
  });

  describe('mobile context', () => {
    let wrapper: VueWrapper;
    const cleanup: Element[] = [];

    afterEach(() => {
      wrapper?.unmount();
      _resetOverlayServiceForTests();
      document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((n) => n.remove());
      cleanup.splice(0).forEach((n) => n.remove());
      document.body.classList.remove('coar-mobile');
    });

    function mountHost() {
      wrapper = mount(CoarOverlayHost, {
        global: { plugins: [CoarOverlayPlugin] },
        attachTo: document.body,
      });
      return getOverlayService();
    }

    /** A local area; happy-dom does not apply mobile.css, so the values come inline. */
    function mobileArea(values: Record<string, string> = {}) {
      const area = document.createElement('div');
      area.className = 'coar-mobile';
      const tokens: Record<string, string> = {
        '--coar-control-m-height': '52px',
        '--coar-control-min-font-size': '16px',
        ...values,
      };
      for (const [token, value] of Object.entries(tokens)) area.style.setProperty(token, value);
      document.body.appendChild(area);
      cleanup.push(area);
      return area;
    }

    function anchorIn(parent: Element) {
      const anchor = document.createElement('button');
      parent.appendChild(anchor);
      return anchor;
    }

    async function openAt(anchor: Element) {
      const service = getOverlayService();
      const ref = service.open({
        spec: { anchor: { kind: 'element', element: anchor }, position: { placement: 'bottom-start' } },
        content: { kind: 'component', component: defineComponent({ render: () => h('div', 'x') }) },
      });
      await nextTick();
      await nextTick();
      const hosts = document.querySelectorAll<HTMLElement>('.coar-overlay-host');
      return { ref, host: hosts[hosts.length - 1] };
    }

    function inlineControlTokens(host: HTMLElement): string[] {
      return Array.from({ length: host.style.length }, (_, i) => host.style.item(i))
        .filter((p) => p.startsWith('--coar-control-'));
    }

    it('lists exactly the custom properties declared in mobile.css', async () => {
      // Vitest blanks `.css?raw` imports (CSS is not processed), so read the file from disk.
      // A non-literal specifier keeps @types/node out of the package typecheck.
      const fsModule = 'node:fs';
      const fs = (await import(/* @vite-ignore */ fsModule)) as {
        readFileSync(path: string, encoding: 'utf8'): string;
      };
      // A plain path from the file: URL — happy-dom replaces the global URL class, which
      // neither resolves file: URLs nor is accepted by node:fs.
      const dir = decodeURIComponent(import.meta.url)
        .replace(/^file:\/\//, '')
        .replace(/^\/([A-Za-z]:)/, '$1')
        .replace(/\/[^/]*$/, '');
      const mobileCss = fs.readFileSync(`${dir}/../../../styles/tokens/mobile.css`, 'utf8');
      const declared = Array.from(mobileCss.matchAll(/^\s*(--[\w-]+)\s*:/gm), (m) => m[1]);
      expect([...MOBILE_CONTEXT_TOKENS].sort()).toEqual([...declared].sort());
    });

    it('leaves the host untouched without a .coar-mobile ancestor', async () => {
      mountHost();
      const plain = document.createElement('div');
      document.body.appendChild(plain);
      cleanup.push(plain);
      const { host } = await openAt(anchorIn(plain));
      expect(host.classList.contains('coar-mobile')).toBe(false);
      expect(inlineControlTokens(host)).toEqual([]);
    });

    it('copies class and token values from a local area, overrides included', async () => {
      mountHost();
      const area = mobileArea({ '--coar-control-m-height': '60px' });
      const { host } = await openAt(anchorIn(area));
      expect(host.classList.contains('coar-mobile')).toBe(true);
      expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('60px');
      expect(host.style.getPropertyValue('--coar-control-min-font-size')).toBe('16px');
    });

    it('copies nothing when body carries .coar-mobile (the host inherits)', async () => {
      mountHost();
      document.body.classList.add('coar-mobile');
      const plain = document.createElement('div');
      document.body.appendChild(plain);
      cleanup.push(plain);
      const { host } = await openAt(anchorIn(plain));
      expect(host.classList.contains('coar-mobile')).toBe(false);
      expect(inlineControlTokens(host)).toEqual([]);
    });

    it('gives a nested overlay opened with the parent panel as context the class', async () => {
      const service = mountHost();
      const area = mobileArea();
      const { ref: parent } = await openAt(anchorIn(area));
      service.open({
        spec: { anchor: { kind: 'point', x: 0, y: 0 } },
        content: { kind: 'component', component: defineComponent({ render: () => h('div', 'child') }) },
        parent,
        context: parent.panelElement!,
      });
      await nextTick();
      await nextTick();
      const hosts = document.querySelectorAll<HTMLElement>('.coar-overlay-host');
      expect(hosts).toHaveLength(2);
      // The parent host is the child's .coar-mobile area: class and tokens come along.
      expect(hosts[1].classList.contains('coar-mobile')).toBe(true);
      expect(hosts[1].style.getPropertyValue('--coar-control-m-height')).toBe('52px');
    });

    it('follows when the class is removed from the area', async () => {
      mountHost();
      const area = mobileArea();
      const { host } = await openAt(anchorIn(area));
      expect(host.classList.contains('coar-mobile')).toBe(true);
      area.classList.remove('coar-mobile');
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(host.classList.contains('coar-mobile')).toBe(false);
      expect(inlineControlTokens(host)).toEqual([]);
    });

    it('keeps theme and mobile values together across a theme observer callback', async () => {
      mountHost();
      const area = mobileArea({ '--coar-control-m-height': '60px' });
      const scope = document.createElement('div');
      scope.className = 'coar-theme-scope light-mode';
      scope.style.setProperty('--coar-accent', '#10b981');
      scope.style.setProperty('--coar-control-m-height', '40px');
      area.appendChild(scope);
      const { host } = await openAt(anchorIn(scope));
      expect(host.style.getPropertyValue('--coar-accent')).toBe('#10b981');
      // The area's value (read from the area, not the anchor) wins over the theme copy.
      expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('60px');

      scope.classList.replace('light-mode', 'dark-mode');
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(host.classList.contains('dark-mode')).toBe(true);
      expect(host.classList.contains('coar-mobile')).toBe(true);
      expect(host.style.getPropertyValue('--coar-accent')).toBe('#10b981');
      expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('60px');
      expect(host.style.getPropertyValue('--coar-control-min-font-size')).toBe('16px');
    });

    it.each(['the same element', 'an inner element'])(
      'keeps a theme-owned control token when the area loses the class (theme scope on %s)',
      async (where) => {
        mountHost();
        const area = mobileArea({ '--coar-control-m-height': '60px' });
        const scope = where === 'the same element' ? area : document.createElement('div');
        if (scope !== area) area.appendChild(scope);
        scope.classList.add('coar-theme-scope', 'light-mode');
        if (scope !== area) scope.style.setProperty('--coar-control-m-height', '40px');
        const { host } = await openAt(anchorIn(scope));
        expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('60px');

        area.classList.remove('coar-mobile');
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(host.classList.contains('coar-mobile')).toBe(false);
        // Only the theme copy is left: the inline value of the scope.
        expect(host.style.getPropertyValue('--coar-control-m-height')).toBe(
          scope === area ? '60px' : '40px',
        );
      },
    );

    it('gives a point-anchored child opened in the parent content onMounted the class', async () => {
      const service = mountHost();
      const area = mobileArea();
      const ParentContent = defineComponent({
        setup() {
          const parent = useOverlayParent();
          onMounted(() => {
            // The parent panel is not mounted yet: open() finds no context.
            service.open({
              spec: { anchor: { kind: 'point', x: 0, y: 0 } },
              content: { kind: 'component', component: defineComponent({ render: () => h('div', 'child') }) },
              parent,
            });
          });
          return () => h('div', 'parent');
        },
      });
      service.open({
        spec: { anchor: { kind: 'element', element: anchorIn(area) } },
        content: { kind: 'component', component: ParentContent },
      });
      await nextTick();
      await nextTick();
      await nextTick();
      const hosts = document.querySelectorAll<HTMLElement>('.coar-overlay-host');
      expect(hosts).toHaveLength(2);
      expect(hosts[1].classList.contains('coar-mobile')).toBe(true);
      expect(hosts[1].style.getPropertyValue('--coar-control-m-height')).toBe('52px');
    });
  });
});
