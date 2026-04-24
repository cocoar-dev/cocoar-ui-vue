/**
 * Pure helpers extracted from `CoarMarkdownEditor.vue` so they can be unit-tested
 * without spinning up a Milkdown editor + ProseMirror view.
 *
 * Anything in this file MUST remain free of Vue/PM/Milkdown imports — the goal is
 * predictable, fast, environment-independent tests.
 */

import type { CoarMarkdownEditorTool } from './CoarMarkdownEditor.vue';

/**
 * Decide whether a given tool should appear in the toolbar.
 *
 * - `whitelist === undefined` → all tools enabled (default).
 * - `whitelist` set → only listed tools enabled.
 *
 * The Set lookup is O(1); we accept either a Set (cached by the caller) or an
 * array (lazy callers).
 */
export function isToolEnabled(
  tool: CoarMarkdownEditorTool,
  whitelist: ReadonlySet<CoarMarkdownEditorTool> | readonly CoarMarkdownEditorTool[] | undefined,
): boolean {
  if (whitelist === undefined) return true;
  // Duck-type via the presence of `.has` — works for both `Set` and
  // `ReadonlySet` without TypeScript narrowing quirks (`Array.isArray`
  // doesn't narrow `ReadonlyArray<T>` cleanly out of a union with
  // `ReadonlySet<T>`, and `instanceof Set` doesn't either).
  return 'has' in whitelist
    ? whitelist.has(tool)
    : whitelist.includes(tool);
}

/**
 * Compute the action a list-toggle button should perform.
 *
 * - In the same list type → `'lift'` (un-list, becomes paragraph).
 * - In a different list type → `'switch'` (lift then wrap as the target type).
 * - Outside any list → `'wrap'` (wrap the block as the target type).
 *
 * The caller is responsible for actually dispatching the corresponding PM
 * commands; this function is purely the decision tree.
 */
export type ListToggleAction = 'lift' | 'switch' | 'wrap';

export function decideListToggleAction(args: {
  target: 'bullet_list' | 'ordered_list';
  inBulletList: boolean;
  inOrderedList: boolean;
}): ListToggleAction {
  const { target, inBulletList, inOrderedList } = args;
  const inSame = target === 'bullet_list' ? inBulletList : inOrderedList;
  if (inSame) return 'lift';
  const inOther = target === 'bullet_list' ? inOrderedList : inBulletList;
  if (inOther) return 'switch';
  return 'wrap';
}
