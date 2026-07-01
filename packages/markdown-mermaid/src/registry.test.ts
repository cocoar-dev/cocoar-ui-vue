import { describe, it, expect } from 'vitest';
import { mermaidFenceRenderers } from './registry';
import CoarMermaidDiagram from './CoarMermaidDiagram.vue';

describe('mermaidFenceRenderers', () => {
  it('maps the `mermaid` fence language to CoarMermaidDiagram', () => {
    expect(mermaidFenceRenderers.mermaid).toBe(CoarMermaidDiagram);
  });

  it('registers only the mermaid key (nothing sneaks in)', () => {
    expect(Object.keys(mermaidFenceRenderers)).toEqual(['mermaid']);
  });
});
