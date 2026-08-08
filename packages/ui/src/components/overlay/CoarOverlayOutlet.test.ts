import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
// Vite-native ?raw import — pulls the SFC's source-text for the regression
// pin below without needing @types/node for fs/path/url.
import sfcSource from './CoarOverlayOutlet.vue?raw';
import CoarOverlayHost from './CoarOverlayHost.vue';
import {
  CoarOverlayPlugin,
  _resetOverlayServiceForTests,
  getOverlayService,
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
});
