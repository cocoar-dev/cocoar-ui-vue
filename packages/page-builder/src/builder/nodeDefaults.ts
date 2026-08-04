import type { ElementNode, ElementType, PageNode } from '../schema';
export type { ElementType };

let counter = 0;
/**
 * Node ids must stay unique across editing sessions: schemas get saved and
 * re-loaded, so a fresh session must never mint an id a stored schema already
 * contains. A session-local counter did exactly that (duplicate ids after
 * load → broken keys/selection/field names). The counter now only backs the
 * non-secure-context fallback, where the timestamp keeps it out of the old
 * `node_N` namespace.
 */
export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  counter += 1;
  return `node_${Date.now().toString(36)}_${counter}`;
}

const FORBIDDEN_ELEMENT_NAMES = new Set(['__proto__', 'prototype', 'constructor']);

/** Public element names are also Page-Code property names (`elements.pageTitle`). */
export function isValidElementName(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
    && !FORBIDDEN_ELEMENT_NAMES.has(value);
}

/** Human-readable camelCase base used when the builder or migration mints a name. */
export function elementNameBase(value: string): string {
  const words = value.split(/[^A-Za-z0-9_$]+/).filter(Boolean);
  const joined = words.map((word, index) => index === 0
    ? word
    : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('') || 'element';
  const safe = joined.replace(/^[^A-Za-z_$]/, (match) => `_${match}`);
  return isValidElementName(safe) ? safe : 'element';
}

/** Returns `heading`, `heading2`, … without mutating the supplied set. */
export function uniqueElementName(preferred: string, used: ReadonlySet<string>): string {
  const base = isValidElementName(preferred) ? preferred : elementNameBase(preferred);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function collectElementNames(root: PageNode): Set<string> {
  const names = new Set<string>();
  const walk = (node: PageNode) => {
    const name = node.type === 'page' ? undefined : (node as ElementNode).name;
    if (isValidElementName(name)) {
      names.add(name);
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(root);
  return names;
}

/**
 * Deep copy of a subtree with fresh ids on every node — the duplicate
 * operation's core. Public `name`s are regenerated because they are unique
 * Page-Code references (and, for value elements, value-model keys).
 */
export function cloneWithFreshIds(node: PageNode, usedNames: Set<string> = new Set()): PageNode {
  const clone = { ...node, id: uid() } as PageNode;
  if (clone.type !== 'page') {
    const element = clone as ElementNode;
    element.name = uniqueElementName(element.name || elementNameBase(element.type), usedNames);
    usedNames.add(element.name);
  }
  if ('children' in clone && Array.isArray(clone.children)) {
    (clone as { children: PageNode[] }).children = clone.children.map((child) => cloneWithFreshIds(child, usedNames));
  }
  return clone;
}

// The per-type default nodes moved onto the element definitions
// (`builder.defaults()` in src/elements/<type>/index.ts); fresh nodes are
// assembled by `usePageBuilder`'s createNode from the registry.
