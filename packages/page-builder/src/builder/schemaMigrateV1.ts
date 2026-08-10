/**
 * v1 → v2 wire-format migration: the pre-GA flat grammar carried element
 * props directly on the node (`{ type: 'heading', text, level }`); v2 isolates
 * them in a `props` bag (`{ type: 'heading', props: { text, level } }`).
 *
 * Detection is per node and version-agnostic: a KNOWN element type without a
 * `props` object is a v1 node — its listed fields move into a fresh bag. Nodes
 * that already carry `props`, the `page` root, and unknown types (which cannot
 * exist in v1 documents and whose host-vs-props split we cannot know) pass
 * through untouched. Identity-preserving: an already-v2 tree returns the same
 * reference, so callers can run this unconditionally (idempotent).
 *
 * Runs on every ingest path — `normalizePageSchema` (builder, server) and the
 * renderer's on-the-fly migration — always AFTER `migrateLegacyTypes`, whose
 * output (`column`/`row` → flat stack) is v1-shaped by construction.
 */
import type { ElementType } from '../schema';

/** Flat v1 fields that belong in the v2 props bag, per built-in type. */
const V1_PROP_FIELDS: Record<Exclude<ElementType, 'page'>, readonly string[]> = {
  stack: ['direction', 'wrap'],
  card: ['title'],
  section: ['title'],
  repeat: ['source', 'keyPath', 'itemAlias', 'maxItems', 'emptyText', 'selection'],
  divider: [],
  spacer: ['size'],
  heading: ['text', 'level'],
  paragraph: ['text'],
  note: ['text', 'variant'],
  feedback: ['kind', 'text', 'emptyText'],
  'text-input': ['label', 'placeholder', 'inputType', 'rows', 'disabled'],
  // v1 documents predate the standalone password element (they carried
  // text-input + inputType) — listed for the exhaustiveness check and for
  // hand-written flat nodes.
  'password-input': ['label', 'placeholder', 'disabled'],
  'number-input': ['label', 'placeholder', 'min', 'max', 'step', 'decimals', 'disabled'],
  checkbox: ['label', 'disabled'],
  switch: ['label', 'disabled'],
  'radio-group': ['label', 'options', 'orientation', 'disabled'],
  select: ['label', 'placeholder', 'options', 'disabled'],
  'multi-select': ['label', 'placeholder', 'options', 'disabled'],
  'otp-input': ['label', 'length', 'otpType', 'mask', 'disabled'],
  'date-input': ['label', 'placeholder', 'disabled'],
  'datetime-input': ['label', 'placeholder', 'disabled'],
  button: ['label', 'action', 'validates', 'icon', 'variant', 'size', 'actionValues', 'actionValueField', 'actionValue'],
  link: ['label', 'action', 'actionValues', 'actionValueField', 'actionValue'],
  image: ['assetId', 'alt'],
  'visual-markup': ['html', 'css'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function migrateV1PropsBag(node: unknown): unknown {
  if (!isRecord(node)) return node;

  // Recurse first (identity-preserving, like migrateLegacyTypes).
  let children = node.children;
  if (Array.isArray(node.children)) {
    const mapped = node.children.map(migrateV1PropsBag);
    if (mapped.some((c, i) => c !== (node.children as unknown[])[i])) children = mapped;
  }

  const fields =
    typeof node.type === 'string' && node.type !== 'page'
      ? V1_PROP_FIELDS[node.type as Exclude<ElementType, 'page'>]
      : undefined;
  const needsBag = fields !== undefined && !isRecord(node.props);

  if (!needsBag) {
    if (children === node.children) return node;
    return { ...node, children };
  }

  const props: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (fields.includes(k)) props[k] = v;
    else rest[k] = v;
  }
  // `rest` already carries the original `children` (when present); only
  // overwrite when the recursion produced a new array — leaves must not gain
  // a `children: undefined` key.
  const result: Record<string, unknown> = { ...rest, props };
  if (children !== node.children) result.children = children;
  return result;
}

/**
 * Any element node without an object `props` bag gets an empty one. The v1
 * migration only manufactures bags for KNOWN built-in types — a registered
 * CONSUMER element node with a missing/null bag (hand-written JSON that never
 * passed the builder) would otherwise reach its renderer as-is and crash on
 * the first `node.props.x` access, taking the whole page down. Chains LAST in
 * the renderer's on-the-fly migration. Identity-preserving and idempotent.
 */
export function healMissingPropsBags(node: unknown): unknown {
  if (!isRecord(node)) return node;

  let children = node.children;
  if (Array.isArray(node.children)) {
    const mapped = node.children.map(healMissingPropsBags);
    if (mapped.some((c, i) => c !== (node.children as unknown[])[i])) children = mapped;
  }

  const needsBag =
    typeof node.type === 'string' && node.type !== 'page' && !isRecord(node.props);

  if (!needsBag && children === node.children) return node;
  const result: Record<string, unknown> = { ...node };
  if (needsBag) result.props = {};
  if (children !== node.children) result.children = children;
  return result;
}

/**
 * `text-input` with `inputType: 'password'` predates the standalone
 * `password-input` element — rewrite it so old documents pick up the
 * dedicated element. Expects v2 (bag) shape, so it chains AFTER
 * `migrateV1PropsBag`. Identity-preserving and idempotent.
 */
export function migrateLegacyPasswordInput(node: unknown): unknown {
  if (!isRecord(node)) return node;

  let children = node.children;
  if (Array.isArray(node.children)) {
    const mapped = node.children.map(migrateLegacyPasswordInput);
    if (mapped.some((c, i) => c !== (node.children as unknown[])[i])) children = mapped;
  }

  const isLegacyPassword =
    node.type === 'text-input' &&
    isRecord(node.props) &&
    node.props.inputType === 'password';

  if (!isLegacyPassword) {
    if (children === node.children) return node;
    return { ...node, children };
  }

  const props = { ...(node.props as Record<string, unknown>) };
  delete props.inputType;
  delete props.rows;
  const result: Record<string, unknown> = { ...node, type: 'password-input', props };
  if (children !== node.children) result.children = children;
  return result;
}

/**
 * `repeat.props.contextPath` said "a context path" while `binding.source` said "a
 * kind of source" — one word, two grammars. The path is now `contextPath`,
 * next to the `keyPath` it belongs with. Renamed on ingest under the v6
 * migration, identity-preserving and idempotent.
 */
export function migrateRepeatContextPath(node: unknown): unknown {
  if (!isRecord(node)) return node;

  let children = node.children;
  if (Array.isArray(node.children)) {
    const mapped = node.children.map(migrateRepeatContextPath);
    if (mapped.some((c, i) => c !== (node.children as unknown[])[i])) children = mapped;
  }

  const needsRename =
    node.type === 'repeat' &&
    isRecord(node.props) &&
    node.props.source !== undefined &&
    node.props.contextPath === undefined;

  if (!needsRename) {
    if (children === node.children) return node;
    return { ...node, children };
  }

  const props = { ...(node.props as Record<string, unknown>) };
  props.contextPath = props.source;
  delete props.source;
  const result: Record<string, unknown> = { ...node, props };
  if (children !== node.children) result.children = children;
  return result;
}
