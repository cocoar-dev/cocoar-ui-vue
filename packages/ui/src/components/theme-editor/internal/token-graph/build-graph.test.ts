import { describe, it, expect } from 'vitest';
import { parseTokenDeclarations } from './parse-tokens';
import { buildTokenGraph, collectConnected } from './build-graph';

// A fixture mirroring the real 4-layer error chain.
const CSS = `
  :root {
    --coar-error: #d63b3b;
    --coar-color-red-600: oklch(from var(--coar-error) 0.47 0.13 h);
    --coar-color-red-800: oklch(from var(--coar-error) 0.35 0.10 h);
    --coar-background-semantic-error-bold: var(--coar-color-red-600);
    --coar-text-semantic-error-bold: var(--coar-color-red-800);
    --coar-button-danger-bg: var(--coar-background-semantic-error-bold);
    --coar-radius-m: 4px;
    --coar-button-radius: var(--coar-radius-m);
  }
`;

describe('buildTokenGraph', () => {
  const graph = buildTokenGraph(parseTokenDeclarations(CSS));

  it('creates a node per declared token', () => {
    expect(graph.nodes.size).toBe(8);
  });

  it('records parent edges (references) and reverse edges (dependents)', () => {
    const semantic = graph.nodes.get('--coar-background-semantic-error-bold')!;
    expect(semantic.references).toEqual(['--coar-color-red-600']);
    expect(graph.nodes.get('--coar-color-red-600')!.dependents)
      .toContain('--coar-background-semantic-error-bold');
  });

  it('classifies layers from the naming schema', () => {
    expect(graph.nodes.get('--coar-error')!.layer).toBe('brand');
    expect(graph.nodes.get('--coar-color-red-600')!.layer).toBe('primitive');
    expect(graph.nodes.get('--coar-background-semantic-error-bold')!.layer).toBe('semantic');
    expect(graph.nodes.get('--coar-button-danger-bg')!.layer).toBe('component');
  });

  it('resolves a pure reference to its concrete type', () => {
    // button-danger-bg → background-semantic-error-bold → color-red-600 → color
    expect(graph.nodes.get('--coar-button-danger-bg')!.declaredType).toBe('reference');
    expect(graph.nodes.get('--coar-button-danger-bg')!.type).toBe('color');
    // button-radius → radius-m (4px) → dimension
    expect(graph.nodes.get('--coar-button-radius')!.type).toBe('dimension');
  });

  it('marks brand seeds + raw scales as roots', () => {
    expect(graph.roots).toContain('--coar-error');
    expect(graph.roots).toContain('--coar-radius-m');
  });
});

describe('collectConnected', () => {
  const graph = buildTokenGraph(parseTokenDeclarations(CSS));

  it('walks the full chain from a leaf seed', () => {
    const sub = collectConnected(graph, ['--coar-error']);
    expect(sub.has('--coar-button-danger-bg')).toBe(true); // descendant
    expect(sub.has('--coar-color-red-600')).toBe(true);
    expect(sub.has('--coar-radius-m')).toBe(false); // unrelated chain
  });

  it('can restrict to ancestors only', () => {
    const sub = collectConnected(graph, ['--coar-button-danger-bg'], { descendants: false });
    expect(sub.has('--coar-error')).toBe(true);
    expect(sub.has('--coar-text-semantic-error-bold')).toBe(false); // sibling, not ancestor
  });
});
