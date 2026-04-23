<script lang="ts">
import {
  defineComponent, h, ref, shallowRef, computed, watch, inject, useId,
  onMounted, onBeforeUnmount, Teleport,
  type PropType, type VNodeArrayChildren,
} from 'vue';
import {
  Editor, rootCtx, defaultValueCtx, commandsCtx, editorViewCtx, editorViewOptionsCtx,
} from '@milkdown/core';
import type { $Command } from '@milkdown/utils';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/vue';
import { FORM_FIELD_INJECTION_KEY } from '@cocoar/vue-ui';
import { decideListToggleAction, isToolEnabled } from './toolbar-helpers';
import {
  commonmark,
  toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand,
  wrapInBlockquoteCommand, wrapInBulletListCommand, wrapInOrderedListCommand,
  wrapInHeadingCommand, turnIntoTextCommand, insertHrCommand, createCodeBlockCommand,
  liftListItemCommand, sinkListItemCommand,
} from '@milkdown/preset-commonmark';
import {
  gfm, toggleStrikethroughCommand, insertTableCommand,
  addRowBeforeCommand, addRowAfterCommand, addColBeforeCommand, addColAfterCommand,
  deleteSelectedCellsCommand,
} from '@milkdown/preset-gfm';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';
import { TextSelection, type EditorState } from '@milkdown/prose/state';
import {
  CoarSidebar, CoarSidebarItem, CoarSidebarGroup, CoarSidebarDivider, CoarIcon,
} from '@cocoar/vue-ui';

export type CoarMarkdownEditorToolbarMode = 'floating' | 'fixed' | 'both';
export type CoarMarkdownEditorToolbarPosition = 'left' | 'right';

/**
 * Toolbar tool identifiers — pass an array of these to the `tools` prop to
 * restrict which buttons are shown. When `tools` is undefined, all are shown.
 */
export type CoarMarkdownEditorTool =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'headings'
  | 'bulletList' | 'orderedList' | 'taskList'
  | 'indent' | 'outdent'
  | 'blockquote' | 'horizontalRule'
  | 'codeBlock' | 'table' | 'tableOps'
  | 'clearFormatting'
  | 'undo' | 'redo';

/** Canonical list of all toolbar tools — exported so consumers can build
 *  custom subsets (e.g. `tools: COAR_MARKDOWN_EDITOR_ALL_TOOLS.filter(...)`). */
export const COAR_MARKDOWN_EDITOR_ALL_TOOLS: readonly CoarMarkdownEditorTool[] = [
  'bold', 'italic', 'strikethrough', 'inlineCode',
  'headings',
  'bulletList', 'orderedList', 'taskList',
  'indent', 'outdent',
  'blockquote', 'horizontalRule',
  'codeBlock', 'table', 'tableOps',
  'clearFormatting',
  'undo', 'redo',
];

export interface CoarMarkdownEditorProps {
  modelValue?: string;
  readonly?: boolean;
  /** Disabled state — non-interactive, dimmed. Auto-picked up from CoarFormField. */
  disabled?: boolean;
  /** Error state — auto-picked up from CoarFormField.error. */
  error?: boolean;
  /** HTML id attribute. Auto-generated if omitted; CoarFormField's id takes precedence. */
  id?: string;
  /** HTML name attribute (for form submission tooling). */
  name?: string;
  /** Marks the editor as required for assistive tech. */
  required?: boolean;
  toolbarMode?: CoarMarkdownEditorToolbarMode;
  toolbarPosition?: CoarMarkdownEditorToolbarPosition;
  /**
   * Whitelist of toolbar tools. When omitted, all tools are shown. When set,
   * only the listed tools render (in fixed canonical order — passing order
   * does not influence button order).
   */
  tools?: CoarMarkdownEditorTool[];
}

// `$Command<T>` is invariant in T, so a heterogeneous record of commands (some
// payload-less, some typed) can't share a single concrete T. The runtime only
// reads `command.key` + `payload`, so we erase the payload type at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CmdDef<T = unknown> = { command: $Command<any>; payload?: T };

type EditorContext = 'text' | 'table' | 'col-selection' | 'row-selection';

const cmds = {
  bold: { command: toggleStrongCommand },
  italic: { command: toggleEmphasisCommand },
  strike: { command: toggleStrikethroughCommand },
  code: { command: toggleInlineCodeCommand },
  bulletList: { command: wrapInBulletListCommand },
  orderedList: { command: wrapInOrderedListCommand },
  blockquote: { command: wrapInBlockquoteCommand },
  hr: { command: insertHrCommand },
  codeBlock: { command: createCodeBlockCommand },
  table: { command: insertTableCommand },
  undo: { command: undoCommand },
  redo: { command: redoCommand },
  paragraph: { command: turnIntoTextCommand },
  addRowBefore: { command: addRowBeforeCommand },
  addRowAfter: { command: addRowAfterCommand },
  addColBefore: { command: addColBeforeCommand },
  addColAfter: { command: addColAfterCommand },
  deleteCell: { command: deleteSelectedCellsCommand },
  indent: { command: sinkListItemCommand },
  outdent: { command: liftListItemCommand },
  h1: { command: wrapInHeadingCommand, payload: 1 },
  h2: { command: wrapInHeadingCommand, payload: 2 },
  h3: { command: wrapInHeadingCommand, payload: 3 },
  h4: { command: wrapInHeadingCommand, payload: 4 },
  h5: { command: wrapInHeadingCommand, payload: 5 },
  h6: { command: wrapInHeadingCommand, payload: 6 },
} satisfies Record<string, CmdDef>;

// Inner component — runs inside <MilkdownProvider>. Bridges Milkdown lifecycle
// to the parent's modelValue/readonly/emit via shared refs passed through props.
const EditorImpl = defineComponent({
  props: {
    initialValue: { type: String, required: true },
    externalValue: { type: Object as PropType<{ value: string }>, required: true },
    readonly: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    toolbarMode: { type: String as PropType<CoarMarkdownEditorToolbarMode>, required: true },
    toolbarPosition: { type: String as PropType<CoarMarkdownEditorToolbarPosition>, required: true },
    tools: { type: Array as PropType<CoarMarkdownEditorTool[] | undefined>, default: undefined },
    inputId: { type: String, required: true },
    hasError: { type: Boolean, required: true },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, required: true },
    onMarkdownChange: { type: Function as PropType<(md: string) => void>, required: true },
  },
  setup(props) {
    // Track last value emitted from inside the editor — so external watch
    // doesn't loop when the parent echoes our own update back.
    const lastEmitted = ref(props.initialValue);

    useEditor((root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, props.initialValue);
          ctx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => !props.readonly,
          }));
          ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
            if (md === lastEmitted.value) return;
            lastEmitted.value = md;
            props.onMarkdownChange(md);
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(listener),
    );

    const [, getInstance] = useInstance();

    // Sync external value → editor when parent updates modelValue
    watch(() => props.externalValue.value, (next) => {
      if (next === lastEmitted.value) return;
      const editor = getInstance();
      if (!editor) return;
      lastEmitted.value = next;
      editor.action(replaceAll(next));
    });

    // Sync readonly → editor view
    watch(() => props.readonly, () => {
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => !props.readonly,
        }));
        // Force the view to re-read editable
        ctx.get(editorViewCtx).update(ctx.get(editorViewCtx).props);
      });
    });

    return () => h(Toolbar, {
      readonly: props.readonly,
      disabled: props.disabled,
      toolbarMode: props.toolbarMode,
      toolbarPosition: props.toolbarPosition,
      tools: props.tools,
      inputId: props.inputId,
      hasError: props.hasError,
      describedBy: props.describedBy,
      name: props.name,
      required: props.required,
    });
  },
});

const Toolbar = defineComponent({
  props: {
    readonly: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    toolbarMode: { type: String as PropType<CoarMarkdownEditorToolbarMode>, required: true },
    toolbarPosition: { type: String as PropType<CoarMarkdownEditorToolbarPosition>, required: true },
    tools: { type: Array as PropType<CoarMarkdownEditorTool[] | undefined>, default: undefined },
    inputId: { type: String, required: true },
    hasError: { type: Boolean, required: true },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, required: true },
  },
  setup(props) {
    const [, getInstance] = useInstance();
    const rootEl = ref<HTMLElement | null>(null);
    const floatingVisible = ref(false);
    const floatingStyle = ref({ left: '0px', top: '0px' });
    const floatingContext = ref<EditorContext>('text');
    const headingSubmenuOpen = ref(false);

    // Reactive snapshot of which marks/blocks are active around the current
    // selection. Keys map to ProseMirror schema names (snake_case for Milkdown).
    interface ActiveState {
      strong: boolean;
      emphasis: boolean;
      strike_through: boolean;
      inlineCode: boolean;
      bullet_list: boolean;
      ordered_list: boolean;
      task_list: boolean;
      blockquote: boolean;
      heading: number | null; // level, or null
      table: boolean;
      code_block: boolean;
      /** How many `list_item` ancestors the cursor sits in. 0 = not in any
       *  list, 1 = top-level item, 2+ = nested. Drives indent/outdent enablement. */
      list_item_depth: number;
    }
    const emptyActive: ActiveState = {
      strong: false, emphasis: false, strike_through: false, inlineCode: false,
      bullet_list: false, ordered_list: false, task_list: false, blockquote: false,
      heading: null, table: false, code_block: false, list_item_depth: 0,
    };
    const active = ref<ActiveState>({ ...emptyActive });

    function call<T>(cmd: CmdDef<T>) {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        ctx.get(commandsCtx).call(cmd.command.key, cmd.payload);
      });
      // Re-read active state after the command runs (toggles flip immediately).
      updateActiveState();
    }

    // List toggle: pure decision in `decideListToggleAction`, dispatch happens here.
    function toggleList(target: 'bullet_list' | 'ordered_list') {
      if (props.readonly) return;
      const wrap = target === 'bullet_list' ? cmds.bulletList : cmds.orderedList;
      const action = decideListToggleAction({
        target,
        inBulletList: active.value.bullet_list,
        inOrderedList: active.value.ordered_list,
      });
      if (action === 'lift') {
        // One lift call covers the common case (single list_item → paragraph).
        // Nested lists may need additional clicks, mirroring most editors.
        call({ command: liftListItemCommand });
        return;
      }
      if (action === 'switch') {
        call({ command: liftListItemCommand });
      }
      call(wrap);
    }

    // Whitelist check — pure logic in `isToolEnabled`. We cache the Set so
    // each render avoids a fresh membership conversion.
    const enabledSet = computed<ReadonlySet<CoarMarkdownEditorTool> | undefined>(() =>
      props.tools ? new Set(props.tools) : undefined,
    );
    function enabled(tool: CoarMarkdownEditorTool): boolean {
      return isToolEnabled(tool, enabledSet.value);
    }

    // Clear all inline marks on the current selection AND turn the active
    // block back into a paragraph. Mirrors the `eraser` button most rich-text
    // editors expose. Block-clear runs first so heading/blockquote/etc. become
    // paragraphs; then marks are stripped from the resulting range.
    function clearFormatting() {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        let tr = state.tr;
        const { from, to, empty } = state.selection;
        // Strip every mark in the schema. removeMark with mark=null clears all.
        if (!empty) {
          Object.values(state.schema.marks).forEach((markType) => {
            tr = tr.removeMark(from, to, markType);
          });
        } else {
          // Collapsed cursor — clear stored marks so next typed char isn't formatted
          tr = tr.setStoredMarks([]);
        }
        view.dispatch(tr);
        // Then: convert the block back to a paragraph (heading → text, etc.)
        ctx.get(commandsCtx).call(turnIntoTextCommand.key);
      });
    }

    // Task-list toggle: in task → strip the `checked` attr (becomes plain
    // bullet); in any list_item → set `checked: false` (turns it into a task);
    // outside a list → wrap in bullet, then mark as task.
    function toggleTaskList() {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { $from } = view.state.selection;

        // Find the nearest list_item ancestor (if any)
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === 'list_item') {
            const itemPos = $from.before(d);
            const isTask = node.attrs.checked != null;
            view.dispatch(view.state.tr.setNodeAttribute(itemPos, 'checked', isTask ? null : false));
            return;
          }
        }

        // Not in a list — wrap in bullet list first, then mark as task on next tick
        ctx.get(commandsCtx).call(wrapInBulletListCommand.key);
        // After wrap, find the new list_item we landed in and set checked=false
        queueMicrotask(() => {
          editor.action((ctx2) => {
            const v = ctx2.get(editorViewCtx);
            const { $from: $f } = v.state.selection;
            for (let d = $f.depth; d > 0; d--) {
              const n = $f.node(d);
              if (n.type.name === 'list_item') {
                v.dispatch(v.state.tr.setNodeAttribute($f.before(d), 'checked', false));
                return;
              }
            }
          });
        });
      });
    }

    function updateActiveState() {
      const editor = getInstance();
      if (!editor) return;
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const state: EditorState = view.state;
          const { from, to, empty, $from } = state.selection;
          const storedMarks = state.storedMarks;
          const next: ActiveState = { ...emptyActive };

          // Mark active: collapsed → use storedMarks/cursor marks; range → rangeHasMark
          const checkMark = (name: string) => {
            const type = state.schema.marks[name];
            if (!type) return false;
            if (empty) {
              const marks = storedMarks ?? $from.marks();
              return type.isInSet(marks) != null;
            }
            return state.doc.rangeHasMark(from, to, type);
          };
          next.strong = checkMark('strong');
          next.emphasis = checkMark('emphasis');
          next.strike_through = checkMark('strike_through');
          next.inlineCode = checkMark('inlineCode');

          // Walk ancestors for block-level node detection
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const name = node.type.name;
            if (name === 'bullet_list') next.bullet_list = true;
            else if (name === 'ordered_list') next.ordered_list = true;
            else if (name === 'blockquote') next.blockquote = true;
            else if (name === 'heading') next.heading = (node.attrs.level as number) ?? null;
            else if (name === 'table') next.table = true;
            else if (name === 'code_block') next.code_block = true;
            else if (name === 'list_item') {
              next.list_item_depth += 1;
              // Task list = list_item with the `checked` attr set (true or false).
              // Plain bullet/ordered items have checked == null.
              if (node.attrs.checked != null) next.task_list = true;
            }
          }

          active.value = next;
        });
      } catch {
        active.value = { ...emptyActive };
      }
    }

    // Click on the area's padding (i.e. outside any text) should focus the editor
    // and place the cursor at the end of the document — natural editor behaviour.
    // ProseMirror handles clicks inside its own contenteditable; we only need to
    // catch clicks that miss it.
    function onAreaMouseDown(e: MouseEvent) {
      if (props.readonly) return;
      const target = e.target as HTMLElement;

      // Task list checkbox: clicking the ::before pseudo (within ~18px of the li's
      // left edge) toggles the `checked` attribute. The pseudo isn't a real
      // element, so we detect proximity in coordinate space.
      const taskLi = target.closest('li[data-item-type="task"]') as HTMLElement | null;
      if (taskLi) {
        const liRect = taskLi.getBoundingClientRect();
        if (e.clientX - liRect.left < 18) {
          e.preventDefault();
          toggleTaskItem(taskLi);
          return;
        }
      }

      if (target.closest('.ProseMirror')) return;
      const editor = getInstance();
      if (!editor) return;
      e.preventDefault();
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        view.focus();
        const tr = view.state.tr.setSelection(TextSelection.atEnd(view.state.doc));
        view.dispatch(tr);
      });
    }

    function toggleTaskItem(liEl: HTMLElement) {
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const pos = view.posAtDOM(liEl, 0);
        if (pos < 0) return;
        // Walk up to find the list_item node at this position
        const $pos = view.state.doc.resolve(pos);
        for (let d = $pos.depth; d >= 0; d--) {
          const node = $pos.node(d);
          if (node.type.name === 'list_item') {
            const itemPos = $pos.before(d);
            const current = node.attrs.checked;
            // Cycle: not-task → unchecked → checked → unchecked (mirrors
            // typical task-list UX). For now: toggle checked/unchecked.
            const next = current === true ? false : true;
            view.dispatch(view.state.tr.setNodeAttribute(itemPos, 'checked', next));
            return;
          }
        }
      });
    }

    function detectContext(): EditorContext {
      const editor = getInstance();
      if (!editor) return 'text';
      try {
        let ctx: EditorContext = 'text';
        editor.action((milkCtx) => {
          const view = milkCtx.get(editorViewCtx);
          const { $from } = view.state.selection;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') { ctx = 'table'; break; }
          }
        });
        return ctx;
      } catch { return 'text'; }
    }

    function positionFloating(anchorRect: DOMRect) {
      let left = anchorRect.left + anchorRect.width / 2;
      let top = anchorRect.top - 8;
      // Estimate ~200px toolbar width — clamp to viewport so we don't overflow on edges
      left = Math.max(108, Math.min(left, window.innerWidth - 108));
      // Flip below if too close to top
      if (top < 50) top = anchorRect.bottom + 8;
      floatingStyle.value = { left: `${left}px`, top: `${top}px` };
    }

    function onSelectionChange() {
      // Active state is updated via PM's `selectionUpdated` listener (registered
      // in onMounted) — reading PM state here would be one click stale because
      // browser selectionchange fires *before* PM dispatches its transaction.
      if (props.readonly || props.toolbarMode === 'fixed') {
        floatingVisible.value = false;
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        floatingVisible.value = false;
        headingSubmenuOpen.value = false;
        return;
      }
      const range = sel.getRangeAt(0);
      const editorEl = rootEl.value?.querySelector('.coar-md-area .milkdown');
      if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) {
        floatingVisible.value = false;
        headingSubmenuOpen.value = false;
        return;
      }
      const rect = range.getBoundingClientRect();
      positionFloating(rect);
      floatingContext.value = detectContext();
      floatingVisible.value = true;
      headingSubmenuOpen.value = false;
    }

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('.coar-md-floating-toolbar') || target.closest('.coar-md-float-submenu')) return;
      if (!rootEl.value || !rootEl.value.contains(target)) {
        floatingVisible.value = false;
        headingSubmenuOpen.value = false;
      }
    }

    // PM dispatches its selection-update transaction *after* the browser's
    // selectionchange event, so reading view.state from selectionchange gives
    // stale data (one click behind). Hook PM's own listener to read the fresh
    // state synchronously after every transaction.
    // Track our specific listener so HMR/re-mounts don't accumulate dead
    // closures in the ListenerManager (it has no remove API).
    let myListener: (() => void) | null = null;

    function registerPmListener(retries = 20) {
      const editor = getInstance();
      if (!editor) {
        if (retries > 0) setTimeout(() => registerPmListener(retries - 1), 50);
        return;
      }
      try {
        editor.action((ctx) => {
          const mgr = ctx.get(listenerCtx);
          // selectionUpdated is dispatched from the plugin's `state.apply`,
          // which runs *before* view.state is committed. Defer one microtask
          // so updateActiveState reads the freshly-committed state — otherwise
          // active flags lag one click behind.
          myListener = () => queueMicrotask(updateActiveState);
          mgr.selectionUpdated(myListener);
        });
      } catch {
        if (retries > 0) setTimeout(() => registerPmListener(retries - 1), 50);
      }
    }

    function unregisterPmListener() {
      if (!myListener) return;
      const editor = getInstance();
      if (!editor) return;
      try {
        editor.action((ctx) => {
          const mgr = ctx.get(listenerCtx);
          const arr = mgr.listeners.selectionUpdated;
          const idx = arr.indexOf(myListener!);
          if (idx >= 0) arr.splice(idx, 1);
        });
      } catch { /* editor may already be gone */ }
      myListener = null;
    }

    onMounted(() => {
      document.addEventListener('selectionchange', onSelectionChange);
      document.addEventListener('mousedown', onDocMouseDown, true);
      registerPmListener();
    });
    onBeforeUnmount(() => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mousedown', onDocMouseDown, true);
      unregisterPmListener();
    });

    function sidebarItem<T>(
      icon: string,
      label: string,
      cmd: CmdDef<T>,
      opts: { active?: boolean; disabled?: boolean; onClick?: () => void } = {},
    ) {
      return h(CoarSidebarItem, {
        icon,
        label,
        active: opts.active ?? false,
        disabled: opts.disabled ?? false,
        onClick: opts.disabled ? () => {} : (opts.onClick ?? (() => call(cmd))),
      });
    }

    function renderSidebar() {
      const a = active.value;
      const isHeadingActive = a.heading != null;

      // Helper: append an item if its tool is enabled. Keeps the list flat
      // while respecting the `tools` whitelist.
      function pushIf<T extends CoarMarkdownEditorTool>(
        arr: VNodeArrayChildren,
        tool: T,
        node: VNodeArrayChildren[number],
      ) {
        if (enabled(tool)) arr.push(node);
      }
      function sectionDivider(arr: VNodeArrayChildren) {
        // Only add a divider if the previous item isn't already a divider/empty
        if (arr.length === 0) return;
        const prev = arr[arr.length - 1] as { type?: unknown };
        if (prev?.type === CoarSidebarDivider) return;
        arr.push(h(CoarSidebarDivider));
      }

      const items: VNodeArrayChildren = [];
      pushIf(items, 'bold', sidebarItem('bold', 'Bold', cmds.bold, { active: a.strong }));
      pushIf(items, 'italic', sidebarItem('italic', 'Italic', cmds.italic, { active: a.emphasis }));
      pushIf(items, 'strikethrough', sidebarItem('strikethrough', 'Strikethrough', cmds.strike, { active: a.strike_through }));
      pushIf(items, 'inlineCode', sidebarItem('code', 'Inline Code', cmds.code, { active: a.inlineCode }));
      pushIf(items, 'headings', h(CoarSidebarGroup, {
        icon: 'hash',
        label: isHeadingActive ? `Heading ${a.heading}` : 'Headings',
        mode: 'flyout',
        openOnHover: true,
      }, {
        default: () => [
          h(CoarSidebarItem, { icon: 'pilcrow', label: 'Paragraph', active: !isHeadingActive, onClick: () => call(cmds.paragraph) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 1', active: a.heading === 1, onClick: () => call(cmds.h1) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 2', active: a.heading === 2, onClick: () => call(cmds.h2) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 3', active: a.heading === 3, onClick: () => call(cmds.h3) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 4', active: a.heading === 4, onClick: () => call(cmds.h4) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 5', active: a.heading === 5, onClick: () => call(cmds.h5) }),
          h(CoarSidebarItem, { icon: 'heading', label: 'Heading 6', active: a.heading === 6, onClick: () => call(cmds.h6) }),
        ],
      }));

      sectionDivider(items);
      pushIf(items, 'bulletList', sidebarItem('list', 'Bullet List', cmds.bulletList,
        { active: a.bullet_list, onClick: () => toggleList('bullet_list') }));
      pushIf(items, 'orderedList', sidebarItem('list-ordered', 'Ordered List', cmds.orderedList,
        { active: a.ordered_list, onClick: () => toggleList('ordered_list') }));
      pushIf(items, 'taskList', sidebarItem('clipboard-check', 'Task List', cmds.bulletList,
        { active: a.task_list, onClick: toggleTaskList }));
      // Indent is meaningless outside a list. Outdent stops at the top list
      // level — leaving the list is the list-button's job, not Outdent's.
      pushIf(items, 'outdent', sidebarItem('indent-decrease', 'Outdent', cmds.outdent,
        { disabled: a.list_item_depth < 2 }));
      pushIf(items, 'indent', sidebarItem('indent-increase', 'Indent', cmds.indent,
        { disabled: a.list_item_depth < 1 }));
      pushIf(items, 'blockquote', sidebarItem('text-quote', 'Blockquote', cmds.blockquote, { active: a.blockquote }));
      pushIf(items, 'horizontalRule', sidebarItem('minus', 'Horizontal Rule', cmds.hr));

      sectionDivider(items);
      pushIf(items, 'codeBlock', sidebarItem('square-code', 'Code Block', cmds.codeBlock, { active: a.code_block }));
      pushIf(items, 'table', sidebarItem('table', 'Insert Table', cmds.table, { active: a.table }));

      // When the cursor is inside a table, surface the table operations in the
      // sidebar so users in `fixed`/`both` toolbar mode can edit table structure
      // without relying on the floating toolbar (which can be disabled).
      if (a.table && enabled('tableOps')) {
        sectionDivider(items);
        items.push(sidebarItem('between-vertical-start', 'Insert Row Above', cmds.addRowBefore));
        items.push(sidebarItem('between-vertical-end', 'Insert Row Below', cmds.addRowAfter));
        items.push(sidebarItem('between-horizontal-start', 'Insert Column Left', cmds.addColBefore));
        items.push(sidebarItem('between-horizontal-end', 'Insert Column Right', cmds.addColAfter));
        items.push(sidebarItem('trash-2', 'Delete Cell', cmds.deleteCell));
      }

      if (enabled('clearFormatting')) {
        sectionDivider(items);
        items.push(sidebarItem('eraser', 'Clear Formatting', cmds.bold, { onClick: clearFormatting }));
      }

      sectionDivider(items);
      pushIf(items, 'undo', sidebarItem('undo-2', 'Undo', cmds.undo));
      pushIf(items, 'redo', sidebarItem('redo-2', 'Redo', cmds.redo));

      // Strip a trailing divider if no items followed
      const last = items[items.length - 1] as { type?: unknown } | undefined;
      if (last?.type === CoarSidebarDivider) items.pop();

      return h('div', {
        key: 'sidebar',
        class: 'coar-md-sidebar-wrap',
        // Prevent focus steal from the editor when clicking sidebar items
        onMousedown: (e: MouseEvent) => e.preventDefault(),
      }, [
        h(CoarSidebar, {
          collapsed: true,
          position: props.toolbarPosition,
          size: 's',
          variant: 'secondary',
          borderless: true,
        }, {
          default: () => items,
        }),
      ]);
    }

    function renderFloating() {
      const fb = <T,>(
        icon: string,
        title: string,
        cmd: CmdDef<T>,
        opts: { isActive?: boolean; disabled?: boolean; onClick?: () => void } = {},
      ) =>
        h('button', {
          class: [
            'coar-md-float-btn',
            opts.isActive ? 'coar-md-float-btn--active' : '',
            opts.disabled ? 'coar-md-float-btn--disabled' : '',
          ],
          title, type: 'button',
          disabled: opts.disabled ?? false,
          onMousedown: (e: MouseEvent) => {
            e.preventDefault();
            if (opts.disabled) return;
            (opts.onClick ?? (() => call(cmd)))();
          },
        }, [h(CoarIcon, { name: icon, size: 's' })]);

      const sep = () => h('div', { class: 'coar-md-float-sep' });

      const a = active.value;

      // Build text toolbar with the same enabled() filter as the sidebar.
      function pushFb(arr: VNodeArrayChildren, tool: CoarMarkdownEditorTool, node: VNodeArrayChildren[number]) {
        if (enabled(tool)) arr.push(node);
      }
      function pushSep(arr: VNodeArrayChildren) {
        if (arr.length === 0) return;
        const prev = arr[arr.length - 1] as { props?: { class?: string } };
        if (prev?.props?.class === 'coar-md-float-sep') return;
        arr.push(sep());
      }

      const textToolbar: VNodeArrayChildren = [];
      pushFb(textToolbar, 'bold', fb('bold', 'Bold', cmds.bold, { isActive: a.strong }));
      pushFb(textToolbar, 'italic', fb('italic', 'Italic', cmds.italic, { isActive: a.emphasis }));
      pushFb(textToolbar, 'strikethrough', fb('strikethrough', 'Strikethrough', cmds.strike, { isActive: a.strike_through }));
      pushFb(textToolbar, 'inlineCode', fb('code', 'Inline Code', cmds.code, { isActive: a.inlineCode }));

      if (enabled('headings')) {
        pushSep(textToolbar);
        textToolbar.push(h('div', { class: 'coar-md-float-dropdown' }, [
          h('button', {
            class: [
              'coar-md-float-btn',
              (headingSubmenuOpen.value || a.heading != null) ? 'coar-md-float-btn--active' : '',
            ],
            title: a.heading != null ? `Heading ${a.heading}` : 'Headings',
            type: 'button',
            onMousedown: (e: MouseEvent) => { e.preventDefault(); headingSubmenuOpen.value = !headingSubmenuOpen.value; },
          }, [h(CoarIcon, { name: 'heading', size: 's' })]),
          headingSubmenuOpen.value
            ? h('div', { class: 'coar-md-float-submenu' },
                ([
                  { label: 'Paragraph', cmd: cmds.paragraph, icon: 'pilcrow', activeLevel: 0 },
                  { label: 'Heading 1', cmd: cmds.h1, icon: 'heading', activeLevel: 1 },
                  { label: 'Heading 2', cmd: cmds.h2, icon: 'heading', activeLevel: 2 },
                  { label: 'Heading 3', cmd: cmds.h3, icon: 'heading', activeLevel: 3 },
                  { label: 'Heading 4', cmd: cmds.h4, icon: 'heading', activeLevel: 4 },
                  { label: 'Heading 5', cmd: cmds.h5, icon: 'heading', activeLevel: 5 },
                  { label: 'Heading 6', cmd: cmds.h6, icon: 'heading', activeLevel: 6 },
                ]).map(({ label, cmd, icon, activeLevel }) => {
                  const isActive = activeLevel === 0
                    ? (a.heading == null)
                    : (a.heading === activeLevel);
                  return h('button', {
                    class: ['coar-md-float-submenu-item', isActive ? 'coar-md-float-submenu-item--active' : ''],
                    type: 'button',
                    onMousedown: (e: MouseEvent) => {
                      // Each cmd has a different payload shape (paragraph: unknown, headings: number).
                      // The runtime call only needs the key + payload — narrow via CmdDef<unknown>.
                      e.preventDefault(); call(cmd as CmdDef<unknown>);
                      headingSubmenuOpen.value = false;
                    },
                  }, [h(CoarIcon, { name: icon, size: 'xs' }), h('span', null, label)]);
                }))
            : null,
        ]));
      }

      pushSep(textToolbar);
      pushFb(textToolbar, 'bulletList', fb('list', 'Bullet List', cmds.bulletList,
        { isActive: a.bullet_list, onClick: () => toggleList('bullet_list') }));
      pushFb(textToolbar, 'orderedList', fb('list-ordered', 'Ordered List', cmds.orderedList,
        { isActive: a.ordered_list, onClick: () => toggleList('ordered_list') }));
      pushFb(textToolbar, 'taskList', fb('clipboard-check', 'Task List', cmds.bulletList,
        { isActive: a.task_list, onClick: toggleTaskList }));
      pushFb(textToolbar, 'outdent', fb('indent-decrease', 'Outdent', cmds.outdent,
        { disabled: a.list_item_depth < 2 }));
      pushFb(textToolbar, 'indent', fb('indent-increase', 'Indent', cmds.indent,
        { disabled: a.list_item_depth < 1 }));

      pushSep(textToolbar);
      pushFb(textToolbar, 'blockquote', fb('text-quote', 'Blockquote', cmds.blockquote, { isActive: a.blockquote }));

      if (enabled('clearFormatting')) {
        pushSep(textToolbar);
        textToolbar.push(fb('eraser', 'Clear Formatting', cmds.bold, { onClick: clearFormatting }));
      }

      // Drop a trailing separator if nothing followed
      const last = textToolbar[textToolbar.length - 1] as { props?: { class?: string } } | undefined;
      if (last?.props?.class === 'coar-md-float-sep') textToolbar.pop();

      const tableCursorToolbar: VNodeArrayChildren = enabled('tableOps') ? [
        fb('between-vertical-start', 'Insert Row Above', cmds.addRowBefore),
        fb('between-vertical-end', 'Insert Row Below', cmds.addRowAfter),
        sep(),
        fb('between-horizontal-start', 'Insert Column Left', cmds.addColBefore),
        fb('between-horizontal-end', 'Insert Column Right', cmds.addColAfter),
        sep(),
        fb('trash-2', 'Delete', cmds.deleteCell),
        ...(enabled('bold') || enabled('italic') || enabled('inlineCode') ? [sep()] : []),
        ...(enabled('bold') ? [fb('bold', 'Bold', cmds.bold)] : []),
        ...(enabled('italic') ? [fb('italic', 'Italic', cmds.italic)] : []),
        ...(enabled('inlineCode') ? [fb('code', 'Code', cmds.code)] : []),
      ] : textToolbar;

      const colToolbar: VNodeArrayChildren = enabled('tableOps') ? [
        fb('between-horizontal-start', 'Insert Column Left', cmds.addColBefore),
        fb('between-horizontal-end', 'Insert Column Right', cmds.addColAfter),
        sep(),
        fb('trash-2', 'Delete Column', cmds.deleteCell),
      ] : textToolbar;

      const rowToolbar: VNodeArrayChildren = enabled('tableOps') ? [
        fb('between-vertical-start', 'Insert Row Above', cmds.addRowBefore),
        fb('between-vertical-end', 'Insert Row Below', cmds.addRowAfter),
        sep(),
        fb('trash-2', 'Delete Row', cmds.deleteCell),
      ] : textToolbar;

      const toolbarMap: Record<EditorContext, VNodeArrayChildren> = {
        'text': textToolbar,
        'table': tableCursorToolbar,
        'col-selection': colToolbar,
        'row-selection': rowToolbar,
      };

      return h(Teleport, { to: 'body' },
        h('div', {
          class: 'coar-md-floating-toolbar',
          style: `left:${floatingStyle.value.left};top:${floatingStyle.value.top};`,
        }, toolbarMap[floatingContext.value] || textToolbar),
      );
    }

    return () => {
      const showFixed = props.toolbarMode === 'fixed' || props.toolbarMode === 'both';
      const showFloat = !props.readonly
        && (props.toolbarMode === 'floating' || props.toolbarMode === 'both');

      // Stable keys are critical: without them, switching toolbar mode shifts
      // the editor div's position in the children list, Vue re-creates the DOM,
      // and Milkdown gets remounted (losing PM listeners + the active-state hook).
      const children: VNodeArrayChildren = [];
      if (showFixed && props.toolbarPosition === 'left') children.push(renderSidebar());
      children.push(h('div', {
        key: 'area',
        class: 'coar-md-area',
        onMousedown: onAreaMouseDown,
      }, [h(Milkdown)]));
      if (showFixed && props.toolbarPosition === 'right') children.push(renderSidebar());
      if (floatingVisible.value && showFloat) children.push(renderFloating());

      const rootClass = {
        'coar-md-root': true,
        'coar-md-root--disabled': props.disabled,
        'coar-md-root--readonly': props.readonly && !props.disabled,
        'coar-md-root--error': props.hasError,
      };

      return h('div', {
        class: rootClass,
        ref: rootEl,
        id: props.inputId,
        'aria-invalid': props.hasError ? 'true' : undefined,
        'aria-describedby': props.describedBy,
        'aria-disabled': props.disabled ? 'true' : undefined,
        'aria-readonly': props.readonly && !props.disabled ? 'true' : undefined,
        'aria-required': props.required ? 'true' : undefined,
        'data-name': props.name,
      }, children);
    };
  },
});

export default defineComponent({
  name: 'CoarMarkdownEditor',
  props: {
    modelValue: { type: String, default: '' },
    readonly: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    toolbarMode: { type: String as PropType<CoarMarkdownEditorToolbarMode>, default: 'floating' },
    toolbarPosition: { type: String as PropType<CoarMarkdownEditorToolbarPosition>, default: 'left' },
    tools: { type: Array as PropType<CoarMarkdownEditorTool[]>, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // Capture the initial value in a non-reactive ref so reconfiguring the
    // editor doesn't blow it away. External updates flow through externalValue.
    const initialValue = props.modelValue;
    const externalValue = shallowRef({ value: props.modelValue });
    watch(() => props.modelValue, (next) => {
      externalValue.value = { value: next };
    });

    // CoarFormField integration — auto-picks up id / error / disabled / describedBy when wrapped.
    const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);
    const autoId = `coar-markdown-editor-${useId()}`;
    const inputId = computed(() => props.id || formField?.inputId.value || autoId);
    const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
    const describedBy = computed(() => formField?.messageId.value);
    const isDisabled = computed(() => props.disabled || (formField?.disabled.value ?? false));
    const effectiveReadonly = computed(() => props.readonly || isDisabled.value);

    return () => h(MilkdownProvider, null, () =>
      h(EditorImpl, {
        initialValue,
        externalValue: externalValue.value,
        readonly: effectiveReadonly.value,
        disabled: isDisabled.value,
        toolbarMode: props.toolbarMode,
        toolbarPosition: props.toolbarPosition,
        tools: props.tools,
        inputId: inputId.value,
        hasError: hasError.value,
        describedBy: describedBy.value,
        name: props.name,
        required: props.required,
        onMarkdownChange: (md: string) => emit('update:modelValue', md),
      }),
    );
  },
});
</script>

<style>
.coar-md-root {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}

.coar-md-root--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.coar-md-root--disabled .coar-md-area .milkdown {
  pointer-events: none;
}

.coar-md-root--error {
  outline: 1px solid var(--coar-text-semantic-error-bold, #b91c1c);
  outline-offset: -1px;
}

.coar-md-sidebar-wrap {
  flex-shrink: 0;
  border-right: 1px solid var(--coar-border-neutral);
}

.coar-md-root > .coar-md-area ~ .coar-md-sidebar-wrap {
  border-right: none;
  border-left: 1px solid var(--coar-border-neutral);
}

.coar-md-area {
  flex: 1;
  overflow: auto;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  /* Padding clicks land here and focus the editor (see onAreaMouseDown). */
  cursor: text;
}

/* Suppress the browser's default focus ring on the contenteditable region.
   The wrapper's own focus-within / form-field error styling provides the
   visible state — the contenteditable's outline would compete with it. */
.coar-md-area .milkdown,
.coar-md-area .milkdown .editor,
.coar-md-area .milkdown [contenteditable] {
  outline: none;
}

/* ── Typography inside the editor ── */
.coar-md-area .milkdown h1 { font-size: 1.75em; font-weight: 700; margin: 0.5em 0 0.3em; line-height: 1.2; }
.coar-md-area .milkdown h2 { font-size: 1.35em; font-weight: 600; margin: 0.5em 0 0.3em; line-height: 1.3; }
.coar-md-area .milkdown h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.2em; }
.coar-md-area .milkdown p { margin: 0.4em 0; line-height: 1.5; }
.coar-md-area .milkdown ul,
.coar-md-area .milkdown ol { margin: 0.4em 0; padding-left: 1.5em; }
.coar-md-area .milkdown li { margin: 0.15em 0; }

.coar-md-area .milkdown blockquote {
  margin: 0.5em 0;
  padding: 0.25em var(--coar-spacing-m);
  border-left: 3px solid var(--coar-border-neutral);
  color: var(--coar-text-neutral-secondary);
}

.coar-md-area .milkdown code {
  background: var(--coar-background-neutral-secondary);
  padding: 0.15em 0.4em;
  border-radius: var(--coar-radius-s);
  font-size: 0.9em;
}

.coar-md-area .milkdown pre {
  background: var(--coar-background-neutral-secondary);
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-radius: var(--coar-radius-xl);
  overflow-x: auto;
  margin: 0.5em 0;
}
.coar-md-area .milkdown pre code { background: none; padding: 0; }

.coar-md-area .milkdown table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.coar-md-area .milkdown th,
.coar-md-area .milkdown td {
  border: 1px solid var(--coar-border-neutral);
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  text-align: left;
}
.coar-md-area .milkdown th {
  background: var(--coar-background-neutral-secondary);
  font-weight: 600;
}

.coar-md-area .milkdown hr {
  border: none;
  border-top: 1px solid var(--coar-border-neutral);
  margin: 1em 0;
}
.coar-md-area .milkdown a {
  color: var(--coar-text-accent-primary);
  text-decoration: underline;
}
.coar-md-area .milkdown strong { font-weight: 600; }
.coar-md-area .milkdown del { text-decoration: line-through; }

/* ── GFM task list items ── */
.coar-md-area .milkdown li[data-item-type="task"] {
  list-style: none;
  margin-left: -1.25em;
  padding-left: 1.5em;
  position: relative;
}

.coar-md-area .milkdown li[data-item-type="task"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45em;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--coar-border-neutral-secondary, var(--coar-border-neutral));
  border-radius: var(--coar-radius-xs, 2px);
  background: var(--coar-background-neutral-primary);
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.1s, border-color 0.1s;
}

.coar-md-area .milkdown li[data-item-type="task"][data-checked="true"]::before {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

.coar-md-area .milkdown li[data-item-type="task"][data-checked="true"]::after {
  content: '';
  position: absolute;
  left: 3px;
  top: calc(0.45em + 2px);
  width: 8px;
  height: 5px;
  border-left: 2px solid var(--coar-text-on-bold, #fff);
  border-bottom: 2px solid var(--coar-text-on-bold, #fff);
  transform: rotate(-45deg);
  pointer-events: none;
}

.coar-md-area .milkdown li[data-item-type="task"][data-checked="true"] > p {
  color: var(--coar-text-neutral-tertiary);
  text-decoration: line-through;
}

/* Hide any native input that the schema may inject */
.coar-md-area .milkdown li[data-item-type="task"] input[type="checkbox"] {
  display: none;
}

/* ── Floating toolbar ── */
.coar-md-floating-toolbar {
  position: fixed;
  transform: translate(-50%, -100%);
  display: flex;
  gap: 2px;
  padding: var(--coar-spacing-xs) 6px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  box-shadow: var(--coar-shadow-m, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 10000;
  animation: coar-md-float-in 0.12s ease-out;
}

.coar-md-float-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: var(--coar-radius-s);
  background: transparent;
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  user-select: none;
}
.coar-md-float-btn:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}
.coar-md-float-btn:active,
.coar-md-float-btn--active {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

.coar-md-float-btn--disabled,
.coar-md-float-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.coar-md-float-btn--disabled:hover,
.coar-md-float-btn:disabled:hover {
  background: transparent;
  color: var(--coar-text-neutral-secondary);
}

.coar-md-float-sep {
  width: 1px;
  height: 18px;
  background: var(--coar-border-neutral);
  margin: 0 2px;
  align-self: center;
}

.coar-md-float-dropdown { position: relative; }

.coar-md-float-submenu {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  padding: var(--coar-spacing-xs);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  box-shadow: var(--coar-shadow-m, 0 4px 12px rgba(0, 0, 0, 0.12));
  min-width: 140px;
  z-index: 10001;
  animation: coar-md-float-in 0.1s ease-out;
}

.coar-md-float-submenu-item {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: var(--coar-radius-m);
  background: transparent;
  color: var(--coar-text-neutral-secondary);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  text-align: left;
}
.coar-md-float-submenu-item:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}
.coar-md-float-submenu-item:active,
.coar-md-float-submenu-item--active {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

@keyframes coar-md-float-in {
  from { opacity: 0; transform: translate(-50%, -100%) translateY(4px); }
  to { opacity: 1; transform: translate(-50%, -100%) translateY(0); }
}
</style>
