import { describe, it, expect } from 'vitest';
import { createMermaidFenceRenderers, mermaidFenceRenderers } from './registry';

describe('mermaidFenceRenderers', () => {
  it('registers a renderer under the `mermaid` fence language', () => {
    expect(mermaidFenceRenderers.mermaid).toBeTruthy();
  });

  it('registers only the mermaid key (nothing sneaks in)', () => {
    expect(Object.keys(mermaidFenceRenderers)).toEqual(['mermaid']);
  });
});

describe('createMermaidFenceRenderers', () => {
  it('builds a registry with a mermaid entry regardless of options', () => {
    const plain = createMermaidFenceRenderers();
    const zoom = createMermaidFenceRenderers({ zoomable: true });
    expect(Object.keys(plain)).toEqual(['mermaid']);
    expect(Object.keys(zoom)).toEqual(['mermaid']);
  });

  it('bakes options into a distinct wrapper component per call', () => {
    // Different option sets produce different component instances (the options
    // are closed over), so a zoomable registry is not the same as the default.
    expect(createMermaidFenceRenderers({ zoomable: true }).mermaid).not.toBe(
      mermaidFenceRenderers.mermaid,
    );
  });
});
