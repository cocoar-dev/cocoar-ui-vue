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
    await renderMermaid(config('compact'), 'graph TD; A-->B', 'compact');
    await renderMermaid(config('compact'), 'graph TD; A-->B', 'compact');
    await renderMermaid(config('default-2'), 'graph TD; A-->B', 'default');

    expect(mermaidMock.initialize.mock.calls.map(([c]) => c.themeVariables.name)).toEqual([
      'default',
      'compact',
      'default-2',
    ]);
    for (const [c] of mermaidMock.initialize.mock.calls) {
      expect(c.securityLevel).toBe('strict');
      expect(c.startOnLoad).toBe(false);
    }
    expect(mermaidMock.render).toHaveBeenCalledTimes(4);
  });

  it('keeps a page that starts compact on its first config', async () => {
    await renderMermaid(config('compact'), 'graph TD; A-->B', 'compact');
    await renderMermaid(config('compact'), 'graph TD; A-->B', 'compact');
    expect(mermaidMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('re-reads local mode and role overrides between compact diagrams', async () => {
    await renderMermaid(config('compact-light'), 'graph TD; A-->B', 'compact');
    await renderMermaid(config('compact-dark'), 'graph TD; A-->B', 'compact');
    await renderMermaid(config('compact-brand'), 'graph TD; A-->B', 'compact');
    expect(mermaidMock.initialize.mock.calls.map(([c]) => c.themeVariables.name))
      .toEqual(['compact-light', 'compact-dark', 'compact-brand']);
  });
});
