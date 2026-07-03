/**
 * Normalization for schemas entering the builder from OUTSIDE its own
 * operations: the initial v-model value, external v-model replacement, and the
 * JSON tab's Apply. Inside the builder every mutation funnels through
 * `operations.ts` and stays well-formed; the entry points are where legacy
 * shapes, hand-written JSON, and tampered data appear.
 *
 * Contract:
 * - HEALS silently what has an unambiguous intent: legacy `column`/`row`
 *   containers, a non-`page` root (wrapped), a missing `children` array, a
 *   missing/duplicate node id, a numeric heading level outside 1–6.
 * - REPORTS as issues what needs the author: a non-object root or child
 *   (dropped), an unknown element type (kept — the renderer's allow-list
 *   drops it at render time), a non-array `children` value (reset to []), a
 *   non-numeric heading level (reset to 2), children on a non-container.
 * - The JSON tab treats ANY issue as a rejection (nothing is applied, nothing
 *   reaches the host's v-model); the v-model path applies the healed tree and
 *   warns in DEV.
 */
import type { ElementType, PageNode } from '../schema';
import { isContainerNode } from '../schema';
import { uid } from './nodeDefaults';

// Exhaustiveness-checked against the schema union: adding a new ElementType
// without listing it here is a compile error.
const ELEMENT_TYPE_MAP: Record<ElementType, true> = {
  page: true,
  stack: true,
  card: true,
  section: true,
  divider: true,
  spacer: true,
  heading: true,
  paragraph: true,
  'text-input': true,
  checkbox: true,
  select: true,
  button: true,
  link: true,
  image: true,
};

export const KNOWN_ELEMENT_TYPES: ReadonlySet<string> = new Set(Object.keys(ELEMENT_TYPE_MAP));

export interface NormalizeIssue {
  /** Human-readable node position, e.g. `page.children[2]`. */
  path: string;
  message: string;
}

export interface NormalizeResult {
  schema: PageNode;
  issues: NormalizeIssue[];
  /** True when healing produced a tree different from the input. */
  changed: boolean;
}

/**
 * Recursively migrate legacy node types so schemas from earlier versions (or
 * hand-written copies) still work:
 *   - `column` → `stack` (direction = 'column')
 *   - `row`    → `stack` (direction = 'row')
 */
export function migrateLegacyTypes(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node;
  const n = node as { type?: string; children?: unknown[] };
  // Preserve identity for untouched subtrees so callers can detect "nothing
  // to migrate" by reference.
  let children = n.children;
  if (Array.isArray(n.children)) {
    const mapped = n.children.map(migrateLegacyTypes);
    if (mapped.some((c, i) => c !== n.children![i])) children = mapped;
  }
  if (n.type === 'column') {
    return { ...n, type: 'stack', direction: 'column', children };
  }
  if (n.type === 'row') {
    return { ...n, type: 'stack', direction: 'row', children };
  }
  if (children === n.children) return node;
  return { ...n, children };
}

function defaultPage(): PageNode {
  return { id: 'root', type: 'page', style: { gap: '16px', padding: '24px' }, children: [] };
}

export function normalizePageSchema(value: unknown): NormalizeResult {
  const issues: NormalizeIssue[] = [];

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ path: 'root', message: 'Schema root must be an object.' });
    return { schema: defaultPage(), issues, changed: true };
  }

  const migrated = migrateLegacyTypes(value) as Record<string, unknown>;
  let rootChanged = migrated !== value;

  let root = migrated;
  if (root.type !== 'page') {
    // Any non-page root (stack, card, …) is wrapped so the builder always has
    // a page root. Style stays on the wrapped child; the wrapper is bare.
    root = { id: 'root', type: 'page', style: { gap: '16px', padding: '24px' }, children: [root] };
    rootChanged = true;
  }

  const seenIds = new Set<string>();
  const result = normalizeNode(root, 'page', seenIds, issues);
  // The root was pre-checked as an object and typed 'page', so it never drops.
  const schema = (result.node ?? defaultPage()) as PageNode;
  return { schema, issues, changed: rootChanged || result.changed };
}

interface NodeResult {
  node: Record<string, unknown> | null;
  changed: boolean;
}

function normalizeNode(
  raw: unknown,
  path: string,
  seenIds: Set<string>,
  issues: NormalizeIssue[],
): NodeResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({ path, message: 'Node must be an object — entry dropped.' });
    return { node: null, changed: true };
  }

  let node = raw as Record<string, unknown>;
  let changed = false;
  const set = (key: string, value: unknown) => {
    if (node === raw) node = { ...node };
    node[key] = value;
    changed = true;
  };

  const typeKnown = typeof node.type === 'string' && KNOWN_ELEMENT_TYPES.has(node.type);
  if (!typeKnown) {
    issues.push({
      path,
      message: `Unknown element type ${JSON.stringify(node.type)} — the renderer will skip it.`,
    });
  }

  // Ids must be unique page-wide: they drive v-for keys, selection paths and
  // undo bookkeeping. First occurrence keeps its id, later duplicates get a
  // fresh one.
  if (typeof node.id !== 'string' || node.id === '' || seenIds.has(node.id)) {
    set('id', uid());
  }
  seenIds.add(node.id as string);

  if (typeKnown && node.type === 'heading' && node.level !== undefined && node.level !== null) {
    if (typeof node.level === 'number' && Number.isFinite(node.level)) {
      const clamped = Math.min(6, Math.max(1, Math.round(node.level)));
      if (clamped !== node.level) set('level', clamped);
    } else {
      issues.push({
        path,
        message: `Heading level ${JSON.stringify(node.level)} is not a number — reset to 2.`,
      });
      set('level', 2);
    }
  }

  const isContainer = typeKnown && isContainerNode(node as unknown as PageNode);
  if (isContainer) {
    if (node.children === undefined || node.children === null) {
      set('children', []);
    } else if (!Array.isArray(node.children)) {
      issues.push({ path, message: '`children` must be an array — reset to empty.' });
      set('children', []);
    } else {
      const children = node.children as unknown[];
      const nextChildren: unknown[] = [];
      let childrenChanged = false;
      for (let i = 0; i < children.length; i++) {
        const child = normalizeNode(children[i], `${path}.children[${i}]`, seenIds, issues);
        if (child.node !== null) nextChildren.push(child.node);
        childrenChanged ||= child.changed;
      }
      if (childrenChanged) set('children', nextChildren);
    }
  } else if (typeKnown && node.children !== undefined) {
    issues.push({
      path,
      message: `"${node.type as string}" is not a container — its \`children\` are ignored by the renderer.`,
    });
  }

  return { node, changed };
}
