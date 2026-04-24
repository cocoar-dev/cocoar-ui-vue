/**
 * ProseMirror NodeView that renders a code block as either a Prism-highlighted
 * `CoarCodeBlock` (when the cursor is elsewhere) or a plain editable code area
 * with a language selector (when the cursor is inside this block). Selection
 * state is driven by PM's `selectNode` / `deselectNode` lifecycle.
 *
 * The view is a tiny imperative bridge:
 *   - `dom` is the outer container PM places into the document
 *   - `contentDOM` is the `<code>` element PM writes the user's text into
 *   - A single Vue app owns the chrome (CoarCodeBlock + edit button + language
 *     `<CoarSelect>`) and gets `contentDOM` handed in as a prop so it can
 *     mount it in the right slot when the user enters edit mode
 *
 * We never recreate `contentDOM` or unmount it from the DOM — visibility
 * toggles via the Vue shell's `v-show`, which keeps PM's view tracker happy.
 */
import { createApp, h, ref, type App } from 'vue';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { TextSelection } from '@milkdown/prose/state';
import type {
  EditorView,
  NodeView,
  ViewMutationRecord,
} from '@milkdown/prose/view';

import CodeBlockShell from './CodeBlockShell.vue';

/**
 * Module-scope registry of currently-mounted CodeBlockViews. Populated by
 * each instance's constructor and pruned by `destroy()`. The companion plugin
 * (`codeBlockSelectionWatcherPlugin`) iterates this set on every PM
 * transaction to keep the `editing` ref in sync with the cursor position.
 *
 * Lives at module scope rather than in a ctx slice because the lifecycle is
 * trivially constructor/destructor-bound and there's no per-editor state to
 * isolate — multiple editors on the same page share the registry but each
 * NodeView only ever reacts to its own `view` reference.
 */
export const activeCodeBlockViews = new Set<CodeBlockView>();

export class CodeBlockView implements NodeView {
  /** Outer container PM mounts into the document. */
  dom: HTMLElement;
  /** Editable `<code>` element PM writes into. Lives inside the edit-mode slot. */
  contentDOM: HTMLElement;

  private readonly app: App;
  private readonly text = ref('');
  private readonly language = ref('');
  private readonly editing = ref(false);

  constructor(
    public node: ProseNode,
    public view: EditorView,
    public getPos: () => number | undefined,
  ) {
    activeCodeBlockViews.add(this);

    this.dom = document.createElement('div');
    this.dom.className = 'coar-md-code-host-mount';

    // Build the contentDOM tree the shell will adopt: <pre><code/></pre>.
    // PM writes into the inner <code>; the wrapping <pre> preserves whitespace
    // semantics for native copy/paste behavior.
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.appendChild(code);
    this.contentDOM = code;

    // Sync initial state from the node — these refs drive the Vue shell.
    this.text.value = node.textContent;
    this.language.value = (node.attrs.language as string | undefined) ?? '';

    // A render-function root captures the refs via closure so reactive reads
    // re-run the render when we mutate `text.value` / `language.value` /
    // `editing.value` from the NodeView lifecycle below.
    this.app = createApp({
      name: 'CodeBlockShellRoot',
      setup: () => () =>
        h(CodeBlockShell, {
          text: this.text.value,
          language: this.language.value,
          editing: this.editing.value,
          contentDOM: pre,
          onEnterEdit: this.handleEnterEdit,
          onLanguageChange: this.handleLanguageChange,
        }),
    });
    this.app.mount(this.dom);
  }

  /* ── PM NodeView lifecycle ───────────────────────────────────────── */

  /**
   * PM calls this when the node attrs or content changed. Returning `true`
   * keeps the existing NodeView instance; `false` would force PM to throw
   * away this view and create a new one.
   */
  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.text.value = node.textContent;
    this.language.value = (node.attrs.language as string | undefined) ?? '';
    return true;
  }

  /** PM marks this node as the active selection — switch to edit mode. */
  selectNode(): void {
    this.editing.value = true;
    // Give PM a tick to commit any in-flight transactions before focusing.
    queueMicrotask(() => {
      this.contentDOM.focus();
    });
  }

  /** PM moved selection elsewhere — switch back to render mode. */
  deselectNode(): void {
    this.editing.value = false;
  }

  destroy(): void {
    activeCodeBlockViews.delete(this);
    this.app.unmount();
  }

  /**
   * Called by the editor-level selection watcher whenever PM's selection
   * changes. Recomputes `editing` based on whether the new selection lands
   * inside this node's range. PM's own `selectNode`/`deselectNode` only fire
   * for NodeSelections, not TextSelections — and the user's natural cursor
   * placement (clicking into the code block, arrow keys) is a TextSelection,
   * so we can't rely on those alone.
   */
  notifySelectionChanged(): void {
    const pos = this.getPos();
    if (pos == null) return;
    const sel = this.view.state.selection;
    const start = pos;
    const end = pos + this.node.nodeSize;
    // Inclusive on both ends — clicking at the very start/end of a code
    // block should also count as "inside".
    const inside = sel.from >= start && sel.to <= end;
    if (this.editing.value !== inside) {
      this.editing.value = inside;
    }
  }

  /**
   * PM asks "should I ignore this DOM event?". For code-block child events
   * (typing, paste, etc.) we want PM to handle them, so return false.
   * Returning true would block PM from seeing the event.
   */
  stopEvent(): boolean {
    return false;
  }

  /**
   * PM asks "should I ignore this DOM mutation?". Mutations inside our
   * Vue chrome (re-renders, hover state changes) are not interesting to PM
   * — return true to skip them. Mutations inside contentDOM are PM's
   * business; we let them through (PM checks the target itself).
   */
  ignoreMutation(mutation: ViewMutationRecord): boolean {
    // Only forward mutations that touch the contentDOM subtree. Vue's chrome
    // mutates other parts of `dom` constantly (class toggles, hover button)
    // and PM doesn't care about those.
    return !this.contentDOM.contains(mutation.target);
  }

  /* ── Internal handlers ───────────────────────────────────────────── */

  private handleEnterEdit = (): void => {
    const pos = this.getPos();
    if (pos == null) return;
    // Place PM's cursor at the very start of the code block's text so the
    // editor surface gets focus. PM's `setSelection` will trigger our
    // `selectNode` callback indirectly through the listener wiring in the
    // outer editor.
    const { tr } = this.view.state;
    tr.setSelection(TextSelection.create(this.view.state.doc, pos + 1));
    this.view.dispatch(tr);
    this.view.focus();
  };

  private handleLanguageChange = (lang: string): void => {
    const pos = this.getPos();
    if (pos == null) return;
    this.view.dispatch(
      this.view.state.tr.setNodeAttribute(pos, 'language', lang),
    );
  };
}
