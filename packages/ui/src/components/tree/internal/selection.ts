/**
 * Pure checkbox-cascade engine for `<CoarTree :selection-mode="'checkbox'">`.
 *
 * All functions are side-effect-free and operate on a {@link TreeIndex} (a flat
 * id→relations view of the *loaded* tree), so they're trivially unit-testable
 * and never touch Vue reactivity. The component builds the index from its
 * config and feeds the result back into the `checkedIds` model.
 *
 * **Model.** `checkedIds` holds every node considered fully checked — leaves AND
 * parents whose loaded children are all checked. The invariant maintained by
 * {@link applyCheckToggle} is: *a parent is in the set iff all its loaded
 * children are*. "Indeterminate" (some-but-not-all descendants checked) is never
 * stored — it's derived on demand by {@link computeIndeterminate}.
 *
 * **Lazy inheritance.** A checked folder whose children aren't loaded yet keeps
 * its id in the set; when the children arrive, {@link reconcileChecked}
 * propagates the check down to them. See `loadChildren` on the tree.
 *
 * `checkStrictly` mode bypasses cascade entirely — callers just add/remove the
 * single id and skip reconcile + indeterminate.
 */

/** Flat, O(1)-lookup view of the loaded tree. Unloaded/leaf nodes map to `[]`. */
export interface TreeIndex {
  /** Loaded child ids for each node id, in order. */
  children: Map<string, string[]>;
  /** Parent id for each node id; root nodes map to `null`. */
  parent: Map<string, string | null>;
  /** All node ids in DFS pre-order (parent before its children). */
  order: string[];
}

/**
 * Build a {@link TreeIndex} from the loaded node tree. Walks every node reachable
 * via `getChildren` (regardless of expand state) so cascade works on collapsed
 * subtrees too. Unloaded lazy folders (`getChildren` → null/undefined) contribute
 * no children, so cascade never descends into data that doesn't exist yet.
 */
export function indexTree<T>(
  roots: readonly T[],
  getId: (n: T) => string,
  getChildren: (n: T) => readonly T[] | null | undefined,
): TreeIndex {
  const children = new Map<string, string[]>();
  const parent = new Map<string, string | null>();
  const order: string[] = [];

  const walk = (list: readonly T[], parentId: string | null) => {
    for (const n of list) {
      const id = getId(n);
      order.push(id);
      parent.set(id, parentId);
      const kids = getChildren(n);
      if (Array.isArray(kids) && kids.length) {
        children.set(
          id,
          kids.map((k) => getId(k)),
        );
        walk(kids, id);
      } else {
        children.set(id, []);
      }
    }
  };
  walk(roots, null);
  return { children, parent, order };
}

/**
 * Toggle `id` (and its whole loaded subtree) to `value`, then re-normalize every
 * ancestor so a parent ends up checked exactly when all its loaded children are.
 * Returns a NEW set; the input is left untouched.
 */
export function applyCheckToggle(
  checked: ReadonlySet<string>,
  id: string,
  value: boolean,
  index: TreeIndex,
): Set<string> {
  const next = new Set(checked);

  // Cascade down the loaded subtree (including `id` itself).
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (value) next.add(cur);
    else next.delete(cur);
    const kids = index.children.get(cur);
    if (kids) for (const k of kids) stack.push(k);
  }

  // Re-normalize ancestors bottom-up.
  let p = index.parent.get(id) ?? null;
  while (p !== null) {
    const kids = index.children.get(p) ?? [];
    const allChecked = kids.length > 0 && kids.every((k) => next.has(k));
    if (allChecked) next.add(p);
    else next.delete(p);
    p = index.parent.get(p) ?? null;
  }

  return next;
}

/**
 * Propagate checks downward from every checked node. The only mutation is
 * *adding* inherited descendants, so it's safe to run on any tree change: newly
 * loaded children under a checked folder become checked, and a consumer that
 * sets `checkedIds` to just a few ancestor ids gets the full closure for free.
 * Returns the input set unchanged (same reference) when nothing was added.
 */
export function reconcileChecked(checked: ReadonlySet<string>, index: TreeIndex): Set<string> {
  const next = new Set(checked);
  const effective = new Map<string, boolean>();
  let changed = false;
  for (const id of index.order) {
    const parentId = index.parent.get(id) ?? null;
    const ancestorChecked = parentId !== null && effective.get(parentId) === true;
    const isChecked = ancestorChecked || next.has(id);
    effective.set(id, isChecked);
    if (isChecked && !next.has(id)) {
      next.add(id);
      changed = true;
    }
  }
  return changed ? next : (checked as Set<string>);
}

/**
 * Derive the indeterminate set: nodes NOT in `checked` that have at least one
 * checked descendant. Walks in reverse DFS order (children before parents) so
 * each node aggregates its already-computed subtree in one pass.
 */
export function computeIndeterminate(checked: ReadonlySet<string>, index: TreeIndex): Set<string> {
  const ind = new Set<string>();
  const selfOrDesc = new Map<string, boolean>();
  for (let i = index.order.length - 1; i >= 0; i--) {
    const id = index.order[i];
    const kids = index.children.get(id) ?? [];
    let descChecked = false;
    for (const k of kids) if (selfOrDesc.get(k)) descChecked = true;
    const selfChecked = checked.has(id);
    if (!selfChecked && descChecked) ind.add(id);
    selfOrDesc.set(id, selfChecked || descChecked);
  }
  return ind;
}
