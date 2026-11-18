import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { ROLE_DERIVATION_TOKEN } from '../../theme/role-theme';
import {
  COMPACT_APPEARANCE_INPUT_TOKENS, COMPACT_CONTEXT_TOKENS, ROLE_DERIVED_TOKENS,
} from './compact-context';
import CoarOverlayHost from './CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests, getOverlayService } from './useOverlay';

async function source(relativePath: string): Promise<string> {
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  return fs.readFileSync(`${dir}/${relativePath}`, 'utf8');
}

describe('compact presentation transport contract', () => {
  it('covers every input, the mode marker and every derived token, with no duplicates', async () => {
    const css = await source('../../../styles/tokens/compact.css');
    const derived = await source('../../../styles/tokens/derived.css');
    const names = (text: string) =>
      new Set(Array.from(text.matchAll(/^\s*(--coar-[\w-]+)\s*:/gm), (m) => m[1]));
    const declared = names(css);
    for (const token of names(derived)) if (!token.startsWith('--coar-d-')) declared.add(token);
    // The activation is written as such; an empty value cannot be read back and copied.
    declared.delete(ROLE_DERIVATION_TOKEN);
    // appearance-accent is an optional consumer input, never a profile default
    // that would mask a parent ThemeScope's explicit brand.
    for (const token of COMPACT_APPEARANCE_INPUT_TOKENS) declared.add(token);
    expect(new Set(COMPACT_CONTEXT_TOKENS).size).toBe(COMPACT_CONTEXT_TOKENS.length);
    expect([...COMPACT_CONTEXT_TOKENS].sort()).toEqual([...declared].sort());
    // The document opt-in must beat :root.dark-mode without touching a
    // document that has not opted in.
    expect(css).not.toMatch(/:root(?!\.coar-compact)/);
  });

  it('lists exactly the tokens the shared derivation defines, each from its private value', async () => {
    const derived = await source('../../../styles/tokens/derived.css');
    const publics = Array.from(
      derived.matchAll(/^ {2}(--coar-[\w-]+): var\((--coar-d-[\w-]+), inherit\);$/gm),
      (m) => [m[1], m[2]],
    );
    expect(publics.map(([name]) => name).sort()).toEqual([...ROLE_DERIVED_TOKENS].sort());
    const privates = new Set(Array.from(derived.matchAll(/^ {2}(--coar-d-[\w-]+):/gm), (m) => m[1]));
    for (const [name, value] of publics) {
      expect(value, name).toBe(name.replace('--coar-', '--coar-d-'));
      expect(privates.has(value), value).toBe(true);
    }
    // Derivation is inert without the activation: every private value starts with it.
    for (const line of derived.matchAll(/^ {2}--coar-d-[\w-]+: (.*)$/gm)) {
      expect(line[1].startsWith(`var(${ROLE_DERIVATION_TOKEN}) `), line[0]).toBe(true);
    }
  });

  it('keeps the compact-only font weights out of the legacy font entry', async () => {
    const legacy = await source('../../fonts.ts');
    const compact = await source('../../compact-fonts.ts');
    expect(legacy).not.toContain('@fontsource/inter/500.css');
    expect(legacy).not.toContain('@fontsource/inter/600.css');
    for (const weight of [400, 500, 600, 700]) {
      expect(compact).toContain(`@fontsource/inter/${weight}.css`);
    }
  });
});

describe('local compact overlays', () => {
  let wrapper: VueWrapper;
  let area: HTMLElement;
  let anchor: HTMLElement;
  let style: HTMLStyleElement;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `
      .coar-compact { --coar-ui-font-size: 13px; --coar-field-font-size: 14px; }
      .coar-compact.coar-mobile { --coar-ui-font-size: 14px; --coar-field-font-size: 16px; }
    `;
    document.head.appendChild(style);
    area = document.createElement('div');
    area.className = 'coar-compact';
    // Exercise transport at an explicit scope boundary here. happy-dom does
    // not resolve inherited custom properties on descendants; the browser
    // suite covers real nested trigger/theme inheritance and geometry.
    anchor = area;
    document.body.appendChild(area);
    wrapper = mount(CoarOverlayHost, { attachTo: document.body, global: { plugins: [CoarOverlayPlugin] } });
  });

  afterEach(() => {
    wrapper.unmount();
    _resetOverlayServiceForTests();
    area.remove();
    style.remove();
    document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((el) => el.remove());
  });

  async function settle() {
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function open(virtual = false) {
    getOverlayService().open({
      spec: { anchor: virtual ? { kind: 'point', x: 0, y: 0 } : { kind: 'element', element: anchor } },
      context: anchor,
      content: { kind: 'component', component: defineComponent({ render: () => h('div', 'content') }) },
    });
    await settle();
    return document.querySelector<HTMLElement>('.coar-overlay-host')!;
  }

  it.each([false, true])('transports resolved roles for a virtual=%s anchor', async (virtual) => {
    area.style.setProperty('--coar-ui-font-size', '15px');
    area.style.setProperty('--coar-calendar-event-font-size', '12px');
    const host = await open(virtual);
    expect(host.classList.contains('coar-compact')).toBe(true);
    expect(host.style.getPropertyValue('--coar-ui-font-size')).toBe('15px');
    expect(host.style.getPropertyValue('--coar-field-font-size')).toBe('14px');
    expect(host.style.getPropertyValue('--coar-calendar-event-font-size')).toBe('12px');
  });

  it('leaves a legacy overlay untouched', async () => {
    area.classList.remove('coar-compact');
    const host = await open();
    expect(host.classList.contains('coar-compact')).toBe(false);
    expect(host.style.getPropertyValue('--coar-ui-font-size')).toBe('');
  });

  it('follows local mobile role changes without conflating input and action text', async () => {
    const host = await open();
    area.classList.add('coar-mobile');
    await settle();
    expect(host.classList.contains('coar-mobile')).toBe(true);
    expect(host.style.getPropertyValue('--coar-ui-font-size')).toBe('14px');
    expect(host.style.getPropertyValue('--coar-field-font-size')).toBe('16px');
  });

  it('clears copied roles when the profile is removed, then supports reactivation', async () => {
    const host = await open();
    area.classList.remove('coar-compact');
    await settle();
    expect(host.classList.contains('coar-compact')).toBe(false);
    expect(host.style.getPropertyValue('--coar-ui-font-size')).toBe('');
    area.classList.add('coar-compact');
    await settle();
    expect(host.classList.contains('coar-compact')).toBe(true);
    expect(host.style.getPropertyValue('--coar-ui-font-size')).toBe('13px');
  });
});
