/**
 * Consumer analysis — fold the Vue components that *use* tokens into the graph
 * as leaf nodes, so the DAG answers "what does CoarTextInput depend on?" and
 * (in reverse) "if I change `--coar-radius-m`, which components are affected?".
 *
 * A consumer's edges are simply the `var(--coar-*)` it reads in its SFC source.
 */
import { extractReferences } from './classify-value';
import type { TokenGraph, TokenNode } from './build-graph';

export interface ConsumerSource {
  /** Component display name, e.g. `CoarTextInput`. */
  name: string;
  /** Raw SFC text (template + script + style). */
  source: string;
}

export interface Consumer {
  name: string;
  /** `--coar-*` tokens read anywhere in the component. */
  tokens: string[];
}

/** Extract `var(--coar-*)` usage per component; drop components that read none. */
export function extractConsumers(sources: ConsumerSource[]): Consumer[] {
  return sources
    .map((s) => ({ name: s.name, tokens: extractReferences(s.source) }))
    .filter((c) => c.tokens.length > 0);
}

/**
 * Add consumer nodes to an existing graph (mutates + returns it). A consumer
 * references the tokens it uses (parent edges), so it lands at the most-derived
 * end of the layout. Only edges to known tokens are wired (a typo'd or
 * external token is ignored rather than spawning a stub).
 */
export function addConsumerNodes(graph: TokenGraph, consumers: Consumer[]): TokenGraph {
  for (const c of consumers) {
    const id = c.name; // component names never collide with `--coar-*`
    const references = c.tokens.filter((t) => graph.nodes.has(t));
    if (references.length === 0) continue;
    const node: TokenNode = {
      name: id, value: '', declaredType: 'unknown', type: 'unknown',
      references, dependents: [], layer: 'consumer', category: 'component', external: false,
    };
    graph.nodes.set(id, node);
    for (const t of references) graph.nodes.get(t)!.dependents.push(id);
  }
  return graph;
}
