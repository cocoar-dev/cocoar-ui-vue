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
 * - Issues carry a severity: `error` = something was DROPPED (data loss),
 *   `warning` = healed or lossless (unknown types stay in the tree). The JSON
 *   tab rejects only on errors — a document mentioning element types this app
 *   doesn't know (a newer library version, an unregistered consumer element)
 *   must stay pasteable and round-trip losslessly. The v-model path applies
 *   the healed tree either way and warns in DEV.
 */
import type { ElementType, PageNode } from '../schema';
import { isContainerNode } from '../schema';
import type { PageElementRegistry } from '../elements/registry';
import { migrateV1PropsBag } from './schemaMigrateV1';
import { uid } from './nodeDefaults';
import { warnDev } from './operations';

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
  note: true,
  'text-input': true,
  'number-input': true,
  checkbox: true,
  switch: true,
  'radio-group': true,
  select: true,
  'multi-select': true,
  'otp-input': true,
  'date-input': true,
  'datetime-input': true,
  button: true,
  link: true,
  image: true,
};

export const KNOWN_ELEMENT_TYPES: ReadonlySet<string> = new Set(Object.keys(ELEMENT_TYPE_MAP));

export interface NormalizeIssue {
  /** Human-readable node position, e.g. `page.children[2]`. */
  path: string;
  message: string;
  /**
   * `error` = data was dropped (the input is structurally broken);
   * `warning` = healed in place or lossless (e.g. an unknown element type,
   * which stays in the tree and is skipped at render time).
   */
  severity: 'error' | 'warning';
}

export interface NormalizeResult {
  schema: PageNode;
  issues: NormalizeIssue[];
  /** True when healing produced a tree different from the input. */
  changed: boolean;
}

export interface NormalizeOptions {
  /**
   * Merged element registry. When provided, registered consumer types count
   * as known (no unknown-type warning) and each definition's `normalizeProps`
   * runs as a per-type healing pass over the props bag. Omit for the
   * registry-less structural pass (server-side persistence gate).
   */
  elements?: PageElementRegistry;
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
  return {
    id: 'root',
    type: 'page',
    schemaVersion: 2,
    style: { gap: '16px', padding: '24px' },
    children: [],
  };
}

export function normalizePageSchema(value: unknown, options?: NormalizeOptions): NormalizeResult {
  const issues: NormalizeIssue[] = [];

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ path: 'root', message: 'Schema root must be an object.', severity: 'error' });
    return { schema: defaultPage(), issues, changed: true };
  }

  // Legacy column/row containers first (their output is v1-flat by
  // construction), then the v1 → v2 props-bag migration. Both are
  // identity-preserving, so `rootChanged` stays honest.
  const migrated = migrateV1PropsBag(migrateLegacyTypes(value)) as Record<string, unknown>;
  let rootChanged = migrated !== value;

  let root = migrated;
  if (root.type !== 'page') {
    // Any non-page root (stack, card, …) is wrapped so the builder always has
    // a page root. Style stays on the wrapped child; the wrapper is bare.
    root = {
      id: 'root',
      type: 'page',
      schemaVersion: 2,
      style: { gap: '16px', padding: '24px' },
      children: [root],
    };
    rootChanged = true;
  } else if (root.schemaVersion === undefined || root.schemaVersion === 1) {
    // Pre-versioning and v1 documents were just migrated to the bag grammar —
    // stamp the version they now actually have. Later versions are preserved.
    root = { ...root, schemaVersion: 2 };
    rootChanged = true;
  }

  const seenIds = new Set<string>();
  const result = normalizeNode(root, 'page', seenIds, issues, options);
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
  options?: NormalizeOptions,
): NodeResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({ path, message: 'Node must be an object — entry dropped.', severity: 'error' });
    return { node: null, changed: true };
  }

  let node = raw as Record<string, unknown>;
  let changed = false;
  const set = (key: string, value: unknown) => {
    if (node === raw) node = { ...node };
    node[key] = value;
    changed = true;
  };

  // With a registry, registered consumer types are as known as built-ins.
  const def =
    typeof node.type === 'string' && node.type !== 'page'
      ? options?.elements?.[node.type]
      : undefined;
  const typeKnown =
    (typeof node.type === 'string' && KNOWN_ELEMENT_TYPES.has(node.type)) || def !== undefined;
  if (!typeKnown) {
    issues.push({
      path,
      message: `Unknown element type ${JSON.stringify(node.type)} — the renderer will skip it.`,
      severity: 'warning',
    });
  }

  // Every known element carries a props bag in the v2 grammar (the v1
  // migration ran before this pass, so a missing bag means a hand-built tree —
  // healed silently; a non-object bag is tampered data and worth a warning).
  if (typeKnown && node.type !== 'page') {
    if (node.props === undefined) {
      set('props', {});
    } else if (node.props === null || typeof node.props !== 'object' || Array.isArray(node.props)) {
      issues.push({
        path,
        message: '`props` must be an object — reset to empty.',
        severity: 'warning',
      });
      set('props', {});
    }
    // Per-definition healing of the (now object-shaped) bag — the element's
    // own ingest gate for untrusted JSON. Crash-guarded: a throwing consumer
    // hook must not take normalization down.
    if (def?.normalizeProps) {
      try {
        const healed = def.normalizeProps(node.props);
        if (healed !== node.props) set('props', healed);
      } catch (e) {
        warnDev(`normalizeProps of element "${String(node.type)}" threw — bag left as-is. ${String(e)}`);
      }
    }
  }

  // Ids must be unique page-wide: they drive v-for keys, selection paths and
  // undo bookkeeping. First occurrence keeps its id, later duplicates get a
  // fresh one.
  if (typeof node.id !== 'string' || node.id === '' || seenIds.has(node.id)) {
    set('id', uid());
  }
  seenIds.add(node.id as string);

  if (typeKnown && node.type === 'heading') {
    // The props bag was healed to an object above; `level` lives inside it (v2).
    const props = node.props as Record<string, unknown>;
    const level = props.level;
    if (level !== undefined && level !== null) {
      if (typeof level === 'number' && Number.isFinite(level)) {
        const clamped = Math.min(6, Math.max(1, Math.round(level)));
        if (clamped !== level) set('props', { ...props, level: clamped });
      } else {
        issues.push({
          path,
          message: `Heading level ${JSON.stringify(level)} is not a number — reset to 2.`,
          severity: 'warning',
        });
        set('props', { ...props, level: 2 });
      }
    }
  }

  const isContainer =
    (typeKnown && isContainerNode(node as unknown as PageNode)) || def?.container === true;
  if (isContainer) {
    if (node.children === undefined || node.children === null) {
      set('children', []);
    } else if (!Array.isArray(node.children)) {
      issues.push({
        path,
        message: '`children` must be an array — reset to empty.',
        severity: 'warning',
      });
      set('children', []);
    } else {
      normalizeChildren(node, set, path, seenIds, issues, options);
    }
  } else if (!typeKnown && Array.isArray(node.children)) {
    // Unknown-typed subtrees stay in the tree (skipped at render time), but
    // their STRUCTURE is still healed — ids must be page-unique even in
    // invisible branches, or they collide the moment the type gets registered.
    normalizeChildren(node, set, path, seenIds, issues, options);
  } else if (typeKnown && node.children !== undefined) {
    issues.push({
      path,
      message: `"${node.type as string}" is not a container — its \`children\` are ignored by the renderer.`,
      severity: 'warning',
    });
  }

  return { node, changed };
}

function normalizeChildren(
  node: Record<string, unknown>,
  set: (key: string, value: unknown) => void,
  path: string,
  seenIds: Set<string>,
  issues: NormalizeIssue[],
  options?: NormalizeOptions,
): void {
  const children = node.children as unknown[];
  const nextChildren: unknown[] = [];
  let childrenChanged = false;
  for (let i = 0; i < children.length; i++) {
    const child = normalizeNode(children[i], `${path}.children[${i}]`, seenIds, issues, options);
    if (child.node !== null) nextChildren.push(child.node);
    childrenChanged ||= child.changed;
  }
  if (childrenChanged) set('children', nextChildren);
}
