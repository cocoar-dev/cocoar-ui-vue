/**
 * Milkdown plugin bundle that registers `CodeBlockView` as the NodeView for
 * the `code_block` schema slot, plus a companion ProseMirror plugin that
 * notifies each mounted view when the selection changes (PM's own
 * `selectNode`/`deselectNode` only fire for `NodeSelection`, not for the
 * `TextSelection` the user creates by clicking into the code block).
 *
 * Drop both plugins into the editor's `.use(...)` chain after `commonmark`.
 */
import { codeBlockSchema } from '@milkdown/preset-commonmark';
import { Plugin } from '@milkdown/prose/state';
import { $prose, $view } from '@milkdown/utils';

import { activeCodeBlockViews, CodeBlockView } from './CodeBlockNodeView';

export const codeBlockNodeViewPlugin = $view(
  codeBlockSchema.node,
  () => (node, view, getPos) => new CodeBlockView(node, view, getPos),
);

/**
 * Editor-level PM plugin: on every transaction whose selection actually
 * changed, ping each mounted `CodeBlockView` so it can recompute its
 * `editing` flag. The pre-flight selection comparison keeps work down to
 * the strict minimum — no DOM walks, no allocations on text-only edits.
 */
export const codeBlockSelectionWatcherPlugin = $prose(
  () =>
    new Plugin({
      view: () => ({
        update(view, prevState) {
          if (view.state.selection.eq(prevState.selection)) return;
          activeCodeBlockViews.forEach((nv) => {
            // Only notify views whose `view` matches — protects against
            // cross-editor leakage when multiple editors share the registry.
            if (nv.view === view) nv.notifySelectionChanged();
          });
        },
      }),
    }),
);

/**
 * Combined bundle — register both with one `.use(codeBlockNodeView)` call.
 */
export const codeBlockNodeView = [
  codeBlockNodeViewPlugin,
  codeBlockSelectionWatcherPlugin,
].flat();

export { CodeBlockView, activeCodeBlockViews } from './CodeBlockNodeView';
export { default as CodeBlockShell } from './CodeBlockShell.vue';
