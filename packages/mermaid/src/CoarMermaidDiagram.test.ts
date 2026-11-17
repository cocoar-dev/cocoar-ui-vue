import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const loader = vi.hoisted(() => ({
  renderMermaid: vi.fn<(config: unknown, code: string, profile?: string) => Promise<string>>(
    async () => '<svg></svg>',
  ),
}));
vi.mock('./internal/mermaid-loader', () => loader);

import CoarMermaidDiagram from './CoarMermaidDiagram.vue';

function mountIn(className: string) {
  const host = document.createElement('div');
  host.className = className;
  document.body.appendChild(host);
  return mount(CoarMermaidDiagram, { props: { code: 'graph TD; A-->B' }, attachTo: host });
}

afterEach(() => {
  loader.renderMermaid.mockClear();
  document.body.innerHTML = '';
});

describe('CoarMermaidDiagram — presentation profile', () => {
  it('renders with the default profile outside .coar-compact', async () => {
    const wrapper = mountIn('');
    await flushPromises();
    expect(loader.renderMermaid.mock.calls[0]![2]).toBe('default');
    expect(wrapper.find('.coar-mermaid__svg').exists()).toBe(true);
  });

  it('renders with the compact profile inside .coar-compact', async () => {
    mountIn('coar-compact');
    await flushPromises();
    expect(loader.renderMermaid.mock.calls[0]![2]).toBe('compact');
  });
});
