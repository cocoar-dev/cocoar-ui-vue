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
  divider: [],
  spacer: ['size'],
  heading: ['text', 'level'],
  paragraph: ['text'],
  note: ['text', 'variant'],
  'text-input': ['label', 'placeholder', 'inputType', 'rows', 'disabled'],
  'number-input': ['label', 'placeholder', 'min', 'max', 'step', 'decimals', 'disabled'],
  checkbox: ['label', 'disabled'],
  switch: ['label', 'disabled'],
  'radio-group': ['label', 'options', 'orientation', 'disabled'],
  select: ['label', 'placeholder', 'options', 'disabled'],
  'multi-select': ['label', 'placeholder', 'options', 'disabled'],
  'otp-input': ['label', 'length', 'otpType', 'mask', 'disabled'],
  'date-input': ['label', 'placeholder', 'disabled'],
  'datetime-input': ['label', 'placeholder', 'disabled'],
  button: ['label', 'action', 'validates', 'icon', 'variant', 'size'],
  link: ['label', 'action'],
  image: ['assetId', 'alt'],
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
