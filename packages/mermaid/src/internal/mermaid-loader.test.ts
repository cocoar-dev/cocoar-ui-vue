import { beforeEach, describe, expect, it, vi } from 'vitest';

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (id: string) => ({ svg: `<svg id="${id}"></svg>` })),
}));
vi.mock('mermaid', () => ({ default: mermaidMock }));

import { renderMermaid, resetMermaidForTests } from './mermaid-loader';

const config = (name: string) => () => ({ theme: 'base', themeVariables: { name } });

describe('renderMermaid — presentation profiles', () => {
  beforeEach(() => {
    resetMermaidForTests();
    mermaidMock.initialize.mockClear();
    mermaidMock.render.mockClear();
  });

  it('initializes once for a page with one profile, as before', async () => {
    await renderMermaid(config('first'), 'graph TD; A-->B');
    await renderMermaid(config('second'), 'graph TD; A-->C');
    await renderMermaid(config('third'), 'graph TD; A-->D', 'default');
    expect(mermaidMock.initialize).toHaveBeenCalledTimes(1);
    expect(mermaidMock.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: { name: 'first' },
    });
  });

  it('re-initializes with the rendering diagram\'s config when the profile changes', async () => {
    await renderMermaid(config('default'), 'graph TD; A-->B');
    await renderMermaid(config('themed'), 'graph TD; A-->B', 'theme');
    await renderMermaid(config('themed'), 'graph TD; A-->B', 'theme');
    await renderMermaid(config('default-2'), 'graph TD; A-->B', 'default');

    expect(mermaidMock.initialize.mock.calls.map(([c]) => c.themeVariables.name)).toEqual([
      'default',
      'themed',
      'default-2',
    ]);
    for (const [c] of mermaidMock.initialize.mock.calls) {
      expect(c.securityLevel).toBe('strict');
      expect(c.startOnLoad).toBe(false);
    }
    expect(mermaidMock.render).toHaveBeenCalledTimes(4);
  });

  it('keeps a page that starts in a role theme on its first config while the roles stay', async () => {
    await renderMermaid(config('themed'), 'graph TD; A-->B', 'theme');
    await renderMermaid(config('themed'), 'graph TD; A-->B', 'theme');
    expect(mermaidMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('applies the roles of each diagram in a role theme: local mode and role overrides', async () => {
    await renderMermaid(config('themed-light'), 'graph TD; A-->B', 'theme');
    await renderMermaid(config('themed-dark'), 'graph TD; A-->B', 'theme');
    await renderMermaid(config('themed-brand'), 'graph TD; A-->B', 'theme');
    expect(mermaidMock.initialize.mock.calls.map(([c]) => c.themeVariables.name))
      .toEqual(['themed-light', 'themed-dark', 'themed-brand']);
  });

  it('serializes renders, so each one runs with the config it initialized', async () => {
    const order: string[] = [];
    mermaidMock.initialize.mockImplementation((c: { themeVariables: { name: string } }) => {
      order.push(`init:${c.themeVariables.name}`);
    });
    mermaidMock.render.mockImplementation(async (...[id, code]: string[]) => {
      order.push(`render:${code}`);
      return { svg: `<svg id="${id}"></svg>` };
    });
    await Promise.all([
      renderMermaid(config('a'), 'A', 'theme'),
      renderMermaid(config('b'), 'B', 'theme'),
      renderMermaid(config('c'), 'C', 'default'),
    ]);
    expect(order).toEqual(['init:a', 'render:A', 'init:b', 'render:B', 'init:c', 'render:C']);
  });
});
