import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const loader = vi.hoisted(() => ({
  renderMermaid: vi.fn<(config: () => unknown, code: string, profile?: string) => Promise<string>>(
    async () => '<svg></svg>',
  ),
}));
vi.mock('./internal/mermaid-loader', () => loader);

import CoarMermaidDiagram from './CoarMermaidDiagram.vue';

/** What the shared derivation leaves on a scope whose theme activates it. */
const ROLE_THEME = { '--coar-d-role-derivation': 'on' };

function mountIn(className: string, tokens: Record<string, string> = {}) {
  const host = document.createElement('div');
  host.className = className;
  for (const [name, value] of Object.entries(tokens)) host.style.setProperty(name, value);
  document.body.appendChild(host);
  const wrapper = mount(CoarMermaidDiagram, { props: { code: 'graph TD; A-->B' }, attachTo: host });
  return { host, wrapper };
}

/** Lets the attribute observer deliver and the render it starts settle. */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

const profiles = () => loader.renderMermaid.mock.calls.map((call) => call[2]);
const fontOf = (call: number) =>
  (loader.renderMermaid.mock.calls[call]![0]() as { themeVariables: Record<string, string> })
    .themeVariables.fontFamily;

/**
 * happy-dom resolves a custom property only on the element that declares it.
 * Browsers inherit it: read it from the nearest ancestor that sets it.
 */
function inheritCustomProperties(): void {
  const computed = getComputedStyle;
  vi.stubGlobal('getComputedStyle', (element: HTMLElement) =>
    new Proxy(computed(element), {
      get(styles, key) {
        if (key !== 'getPropertyValue') return Reflect.get(styles, key, styles);
        return (name: string) => {
          for (let scope: HTMLElement | null = element; scope; scope = scope.parentElement) {
            const value = scope.style.getPropertyValue(name);
            if (value) return value;
          }
          return styles.getPropertyValue(name);
        };
      },
    }));
}

beforeEach(inheritCustomProperties);

afterEach(() => {
  vi.unstubAllGlobals();
  loader.renderMermaid.mockClear();
  document.body.innerHTML = '';
});

describe('CoarMermaidDiagram — presentation profile', () => {
  it('renders with the default profile outside a role theme', async () => {
    const { wrapper } = mountIn('');
    await flushPromises();
    expect(profiles()).toEqual(['default']);
    expect(wrapper.find('.coar-mermaid__svg').exists()).toBe(true);
  });

  it.each(['coar-theme--compact', 'coar-compact', ''])(
    'renders with the theme profile where a role theme is in effect (class "%s")',
    async (className) => {
      mountIn(className, ROLE_THEME);
      await flushPromises();
      expect(profiles()).toEqual(['theme']);
    },
  );

  it('does not take the class name for the theme', async () => {
    mountIn('coar-compact');
    await flushPromises();
    expect(profiles()).toEqual(['default']);
  });

  it('reads the roles in effect at the diagram', async () => {
    mountIn('coar-theme--compact', { ...ROLE_THEME, '--coar-font-family-body': 'Inter' });
    await flushPromises();
    expect(fontOf(0)).toBe('Inter');
  });
});

describe('CoarMermaidDiagram — follows its role theme', () => {
  it('renders again when a role it reads changes', async () => {
    const { host } = mountIn('coar-theme--compact', { ...ROLE_THEME, '--coar-font-family-body': 'Inter' });
    await flushPromises();
    host.style.setProperty('--coar-font-family-body', 'Poppins');
    await settle();
    expect(profiles()).toEqual(['theme', 'theme']);
    expect(fontOf(1)).toBe('Poppins');
  });

  it('keeps its render when an attribute changes but no role does', async () => {
    const { host } = mountIn('coar-theme--compact', ROLE_THEME);
    await flushPromises();
    host.classList.add('unrelated');
    host.style.setProperty('--coar-mermaid-height', '300px');
    await settle();
    expect(profiles()).toEqual(['theme']);
  });

  it('renders again when its scope enters or leaves a role theme', async () => {
    const { host } = mountIn('');
    await flushPromises();
    host.style.setProperty('--coar-d-role-derivation', 'on');
    await settle();
    host.style.removeProperty('--coar-d-role-derivation');
    await settle();
    expect(profiles()).toEqual(['default', 'theme', 'default']);
  });

  it('keeps its render outside a role theme, as before', async () => {
    const { host } = mountIn('', { '--coar-font-family-body': 'Inter' });
    await flushPromises();
    host.style.setProperty('--coar-font-family-body', 'Poppins');
    host.classList.add('dark-mode');
    await settle();
    expect(profiles()).toEqual(['default']);
  });
});
