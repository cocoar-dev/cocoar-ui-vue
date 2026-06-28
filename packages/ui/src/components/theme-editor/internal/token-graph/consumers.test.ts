import { describe, it, expect } from 'vitest';
import { parseTokenDeclarations } from './parse-tokens';
import { buildTokenGraph } from './build-graph';
import { extractConsumers, addConsumerNodes } from './consumers';

const CSS = `
  :root {
    --coar-radius-m: 4px;
    --coar-input-radius: var(--coar-radius-m);
    --coar-field-padding-x: 12px;
  }
`;

describe('extractConsumers', () => {
  it('pulls var() usage out of SFC text and drops token-free components', () => {
    const consumers = extractConsumers([
      { name: 'CoarTextInput', source: '<style>.x{ border-radius: var(--coar-input-radius); padding: 0 var(--coar-field-padding-x); }</style>' },
      { name: 'CoarPlain', source: '<style>.x{ color: red; }</style>' },
    ]);
    expect(consumers).toEqual([
      { name: 'CoarTextInput', tokens: ['--coar-input-radius', '--coar-field-padding-x'] },
    ]);
  });
});

describe('addConsumerNodes', () => {
  it('adds a consumer node wired to the tokens it uses, in both directions', () => {
    const graph = buildTokenGraph(parseTokenDeclarations(CSS));
    addConsumerNodes(graph, [
      { name: 'CoarTextInput', tokens: ['--coar-input-radius', '--coar-field-padding-x'] },
    ]);
    const consumer = graph.nodes.get('CoarTextInput')!;
    expect(consumer.layer).toBe('consumer');
    expect(consumer.references).toEqual(['--coar-input-radius', '--coar-field-padding-x']);
    // reverse edge: the token now knows the component depends on it (impact)
    expect(graph.nodes.get('--coar-input-radius')!.dependents).toContain('CoarTextInput');
  });

  it('skips a consumer whose tokens are all unknown (no edges → no node)', () => {
    const graph = buildTokenGraph(parseTokenDeclarations(CSS));
    addConsumerNodes(graph, [{ name: 'CoarGhost', tokens: ['--coar-does-not-exist'] }]);
    expect(graph.nodes.has('CoarGhost')).toBe(false);
  });
});
