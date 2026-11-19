import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { hasRoleDerivation, readCompactPresentationContext, useCompactPresentationContext } from './useCompactPresentationContext';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.className = '';
  document.body.className = '';
});

function area(html: string) {
  document.body.innerHTML = html;
  return document.querySelector('i')!;
}

// jsdom writes the ~930 transported custom properties into an inline style in about
// 300 ms per update (browsers do not); a test that updates a context several times
// then needs more than the default 5 s when every package tests at once.
describe('shared compact teleport context', { timeout: 20_000 }, () => {
  it('adds nothing to legacy teleports, including legacy mobile', () => {
    expect(readCompactPresentationContext(null)).toEqual({ classes: [], style: {} });
    expect(readCompactPresentationContext(area('<div class="coar-mobile dark-mode"><i></i></div>')))
      .toEqual({ classes: [], style: {} });
  });

  it.each([
    '<div class="coar-compact dark-mode"><div class="coar-mobile"><i></i></div></div>',
    '<div class="coar-mobile"><div class="coar-compact dark-mode"><i></i></div></div>',
    '<i class="coar-compact coar-mobile dark-mode"></i>',
  ])('preserves local mobile and mode boundaries: %s', (html) => {
    expect(readCompactPresentationContext(area(html)).classes)
      .toEqual(['coar-compact', 'coar-mobile', 'dark-mode']);
  });

  it('makes the target a theme scope a nested teleport or renderer can recognise, without the class', () => {
    // A theme class without `.coar-compact`: the stylesheet leaves the marker on its scope.
    // (On the element itself: happy-dom does not inherit custom properties.)
    const source = area('<i style="--coar-d-role-derivation: on"></i>');
    const context = readCompactPresentationContext(source);
    expect(context.classes).toEqual(['coar-theme-surface', 'light-mode']);
    // The scope's text comes with the class, never as inline values that would beat
    // the surface's own styles (a button's white icon).
    for (const property of ['color', 'font-family', 'font-size']) expect(context.style).not.toHaveProperty(property);
    expect(context.style['--coar-role-derivation']).toBe(' ');
    const target = document.createElement('div');
    for (const [name, value] of Object.entries(context.style)) target.style.setProperty(name, value);
    document.body.appendChild(target);
    expect(hasRoleDerivation(target)).toBe(true);
  });

  it('resolves the nearest explicit mode, including data-theme scopes', () => {
    document.documentElement.className = 'coar-compact dark-mode';
    expect(readCompactPresentationContext(area('<div data-theme="light"><i></i></div>')).classes)
      .toEqual(['coar-compact', 'light-mode']);
  });

  it('carries registered roles and explicit package overrides, but no unrelated properties', () => {
    const source = area('<div class="coar-compact"><i style="--coar-ui-font-size:15px;--coar-package-role:17px;--private-value:secret"></i></div>');
    const context = readCompactPresentationContext(source);
    expect(context.style['--coar-ui-font-size']).toBe('15px');
    expect(context.style['--coar-package-role']).toBe('17px');
    expect(context.style['--private-value']).toBeUndefined();
  });

  it('preserves intentionally unset theme inputs across a teleport', () => {
    const source = area('<i class="coar-compact coar-theme-none" style="--coar-appearance-accent:initial"></i>');
    const context = readCompactPresentationContext(source);
    expect(context.style['--coar-appearance-accent']).toBe('initial');
    expect(context.style['--coar-appearance-font-body']).toBe('initial');
    expect(context.style['--coar-panel-radius']).toBe('initial');
    expect(context.style['--coar-theme-document-viewer-font-size']).toBe('initial');
  });

  it('updates and clears a mounted custom teleport without retaining stale roles', async () => {
    const origin = ref<Element | null>(null);
    const wrapper = mount(defineComponent({
      setup() {
        const context = useCompactPresentationContext(() => origin.value);
        return () => h('output', { class: context.value.classes, style: context.value.style });
      },
    }));
    origin.value = area('<i class="coar-compact" style="--coar-ui-font-size:15px"></i>');
    await nextTick();
    await nextTick();
    expect(wrapper.classes()).toContain('coar-compact');
    expect(wrapper.attributes('style')).toContain('15px');
    origin.value!.classList.add('coar-mobile', 'dark-mode');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(wrapper.classes()).toContain('coar-mobile');
    expect(wrapper.classes()).toContain('dark-mode');
    origin.value!.classList.remove('coar-compact');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(wrapper.classes()).not.toContain('coar-compact');
    expect(wrapper.element.getAttribute('style') ?? '').not.toContain('15px');
    wrapper.unmount();
  });
});
