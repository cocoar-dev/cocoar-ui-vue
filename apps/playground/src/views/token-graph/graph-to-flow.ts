/**
 * Adapter: token-graph DAG → Vue Flow nodes/edges, auto-laid-out with dagre.
 *
 * Token *families* (size/palette scales like `component-{xs,s,m,l}-height`)
 * render as a collapsible **container** node (Vue Flow group): collapsed = just
 * the header bar (edges attach to it); expanded = a box with the member nodes
 * nested inside (`parentNode`), edges attach to the individual members.
 *
 * Layout uses a dagre *meta* pass where every group is one sized box (header
 * height when collapsed, tall enough for its stacked members when expanded);
 * members are then placed relative to their box.
 *
 * Lives in the playground (not the pure token-graph module) because it pulls in
 * Vue Flow + dagre — the analyzer itself stays renderer-agnostic.
 */
import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@vue-flow/core';
import { familyOf, familyMembers } from
  '../../../../../packages/ui/src/components/theme-editor/internal/token-graph';
import type { TokenGraph, TokenLayer, TokenNode } from
  '../../../../../packages/ui/src/components/theme-editor/internal/token-graph';

export interface FlowNodeData {
  short: string;
  full: string;
  layer: TokenLayer;
  type: string;
  value: string;
  /** A CSS color to swatch, for color-typed tokens (resolved live via var()). */
  swatch?: string;
  /** Group-container fields. */
  isGroup?: boolean;
  count?: number;
  collapsed?: boolean;
}

const NODE_W = 230;
const NODE_H = 46;
const PAD = 12;
const HEADER_H = 34;
const CHILD_GAP = 8;

export interface GraphToFlowOpts {
  rankdir?: 'LR' | 'TB';
  /** Family keys to show expanded (members nested in the box). */
  expanded?: Set<string>;
}

export function graphToFlow(
  graph: TokenGraph,
  names: Set<string>,
  opts: GraphToFlowOpts = {},
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const { rankdir = 'LR', expanded = new Set<string>() } = opts;

  // Families with ≥2 members in this view.
  const families = familyMembers(names);
  const groupOf = (name: string): string | null => {
    const fam = familyOf(name);
    return fam && families.has(fam.key) ? fam.key : null;
  };
  const collapsed = (key: string) => !expanded.has(key);

  // Partition the visible names into grouped members vs standalone tokens.
  const members = new Map<string, string[]>();
  const standalone: string[] = [];
  for (const name of names) {
    const key = groupOf(name);
    if (!key) standalone.push(name);
    else (members.get(key) ?? members.set(key, []).get(key)!).push(name);
  }

  const groupSize = (key: string) =>
    collapsed(key)
      ? { w: NODE_W, h: NODE_H }
      : { w: NODE_W + 2 * PAD, h: HEADER_H + members.get(key)!.length * (NODE_H + CHILD_GAP) + PAD };

  // dagre meta id: a member collapses to its group box for layout purposes.
  const metaId = (name: string) => groupOf(name) ?? name;
  // final-edge id: only collapsed groups absorb their members; expanded members
  // keep their own id so edges attach to the nested node.
  const displayId = (name: string) => {
    const key = groupOf(name);
    return key && collapsed(key) ? key : name;
  };

  // ── dagre meta layout ──
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 18, ranksep: 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const name of standalone) g.setNode(name, { width: NODE_W, height: NODE_H });
  for (const key of members.keys()) {
    const s = groupSize(key);
    g.setNode(key, { width: s.w, height: s.h });
  }
  const metaSeen = new Set<string>();
  for (const name of names) {
    const n = graph.nodes.get(name);
    if (!n) continue;
    const t = metaId(name);
    for (const ref of n.references) {
      if (!names.has(ref)) continue;
      const s = metaId(ref);
      if (s === t || metaSeen.has(`${s}|${t}`)) continue;
      metaSeen.add(`${s}|${t}`);
      g.setEdge(s, t);
    }
  }
  dagre.layout(g);

  // ── build nodes (parents before their children) ──
  const nodes: Node<FlowNodeData>[] = [];
  for (const name of standalone) {
    const p = g.node(name);
    nodes.push(tokenNode(name, graph.nodes.get(name)!, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, rankdir));
  }
  for (const [key, mem] of members) {
    const p = g.node(key);
    const s = groupSize(key);
    const rep = graph.nodes.get(mem[0])!;
    nodes.push({
      id: key,
      type: 'tokengroup',
      position: { x: p.x - s.w / 2, y: p.y - s.h / 2 },
      style: { width: `${s.w}px`, height: `${s.h}px` },
      data: {
        short: key.replace(/^--coar-/, ''), full: key, layer: rep.layer, type: rep.type,
        value: '', isGroup: true, count: mem.length, collapsed: collapsed(key),
      },
    });
    if (!collapsed(key)) {
      mem.forEach((m, i) => {
        nodes.push({
          ...tokenNode(m, graph.nodes.get(m)!, { x: PAD, y: HEADER_H + i * (NODE_H + CHILD_GAP) }, rankdir),
          parentNode: key,
          extent: 'parent',
        });
      });
    }
  }

  // ── edges ──
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const n = graph.nodes.get(name);
    if (!n) continue;
    const target = displayId(name);
    for (const ref of n.references) {
      if (!names.has(ref)) continue;
      const source = displayId(ref);
      if (source === target || seen.has(`${source}->${target}`)) continue;
      seen.add(`${source}->${target}`);
      edges.push({ id: `${source}->${target}`, source, target });
    }
  }

  return { nodes, edges };
}

function tokenNode(
  name: string,
  n: TokenNode,
  position: { x: number; y: number },
  rankdir: 'LR' | 'TB',
): Node<FlowNodeData> {
  return {
    id: name,
    type: 'token',
    position,
    sourcePosition: rankdir === 'LR' ? Position.Right : Position.Bottom,
    targetPosition: rankdir === 'LR' ? Position.Left : Position.Top,
    data: {
      short: name.replace(/^--coar-/, ''),
      full: name,
      layer: n.layer,
      type: n.layer === 'consumer' ? 'component' : n.type,
      value: n.value,
      swatch: n.type === 'color' ? `var(${name})` : undefined,
    },
  };
}
