/**
 * Build the token dependency graph (a DAG) from parsed declarations.
 *
 * Each token becomes a node; every `var()` it reads becomes a parent edge.
 * Pure `reference` values get their concrete type resolved by walking up to
 * the first non-reference ancestor. Referenced-but-undefined names (e.g. a
 * token owned by another package) become `external` stub nodes so the graph
 * stays connected.
 */
import { classifyValue } from './classify-value';
import type { TokenValueType } from './types';
import { parseTokenName, type TokenLayer } from './naming';
import { dedupeFirstWins, type TokenEntry } from './parse-tokens';

export interface TokenNode {
  name: string;
  value: string;
  /** Type as written — may be `reference` for a pure `var(--x)` alias. */
  declaredType: TokenValueType;
  /** Concrete type, resolving pure references to their target's type. */
  type: TokenValueType;
  /** Names this token reads via `var()` — parent edges (outgoing). */
  references: string[];
  /** Names that read this token — child edges (incoming). */
  dependents: string[];
  layer: TokenLayer;
  category: string;
  /** Referenced somewhere but not defined here (external / missing). */
  external: boolean;
}

export interface TokenGraph {
  nodes: Map<string, TokenNode>;
  /** Names with no outgoing references — true leaves / brand seeds. */
  roots: string[];
}

export function buildTokenGraph(entries: TokenEntry[]): TokenGraph {
  const nodes = new Map<string, TokenNode>();

  // 1. A node per declared token (first definition wins — the base theme).
  for (const { name, value } of dedupeFirstWins(entries)) {
    const { type, references } = classifyValue(value);
    const { layer, category } = parseTokenName(name);
    nodes.set(name, {
      name, value, declaredType: type, type, references,
      dependents: [], layer, category, external: false,
    });
  }

  // 2. Stub nodes for referenced-but-undefined names.
  for (const node of [...nodes.values()]) {
    for (const ref of node.references) {
      if (!nodes.has(ref)) {
        const { layer, category } = parseTokenName(ref);
        nodes.set(ref, {
          name: ref, value: '', declaredType: 'unknown', type: 'unknown',
          references: [], dependents: [], layer, category, external: true,
        });
      }
    }
  }

  // 3. Reverse edges.
  for (const node of nodes.values()) {
    for (const ref of node.references) nodes.get(ref)!.dependents.push(node.name);
  }

  // 4. Resolve pure-reference types to a concrete type.
  for (const node of nodes.values()) {
    if (node.declaredType === 'reference') node.type = resolveReferenceType(node, nodes);
  }

  const roots = [...nodes.values()].filter((n) => n.references.length === 0).map((n) => n.name);
  return { nodes, roots };
}

/** Walk `var()` aliases up to the first concrete (non-reference) type. */
function resolveReferenceType(start: TokenNode, nodes: Map<string, TokenNode>): TokenValueType {
  const visited = new Set<string>();
  let current: TokenNode | undefined = start;
  while (current && current.declaredType === 'reference' && current.references.length > 0) {
    if (visited.has(current.name)) return 'unknown'; // cycle guard
    visited.add(current.name);
    current = nodes.get(current.references[0]);
  }
  return current && current.declaredType !== 'reference' ? current.declaredType : 'unknown';
}

/**
 * Collect the connected subgraph around `seeds` — walking parent edges
 * (`references`, "what it derives from") and/or child edges (`dependents`,
 * "what derives from it"). Used to carve a readable slice out of the full
 * ~456-node graph for focused views.
 */
export function collectConnected(
  graph: TokenGraph,
  seeds: string[],
  opts: { ancestors?: boolean; descendants?: boolean; maxDepth?: number } = {},
): Set<string> {
  const { ancestors = true, descendants = true, maxDepth = Infinity } = opts;
  const out = new Set<string>();
  const queue: Array<{ name: string; depth: number }> = seeds
    .filter((s) => graph.nodes.has(s))
    .map((name) => ({ name, depth: 0 }));

  while (queue.length) {
    const { name, depth } = queue.shift()!;
    if (out.has(name)) continue;
    out.add(name);
    if (depth >= maxDepth) continue;
    const node = graph.nodes.get(name)!;
    const next = [
      ...(ancestors ? node.references : []),
      ...(descendants ? node.dependents : []),
    ];
    for (const n of next) if (!out.has(n)) queue.push({ name: n, depth: depth + 1 });
  }
  return out;
}
