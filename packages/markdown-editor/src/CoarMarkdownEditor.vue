<script lang="ts">
/* eslint-disable vue/one-component-per-file --
   Three components share this file by design: the outer `CoarMarkdownEditor`
   (public API + CoarFormField wiring), the inner `EditorImpl` that mounts
   inside `<MilkdownProvider>` (needs the provider's `useEditor` / `useInstance`
   in scope), and the `Toolbar` that talks to the same `useInstance()` to
   issue commands. Splitting them across files would force the shared
   provider context to flow through prop drilling and break the
   `useInstance()` access pattern. */
import {
  defineComponent, h, ref, shallowRef, computed, watch, inject, useId, markRaw,
  onMounted, onBeforeUnmount, Teleport,
  type PropType, type VNodeArrayChildren,
} from 'vue';
import {
  Editor, rootCtx, defaultValueCtx, commandsCtx, editorViewCtx, editorViewOptionsCtx,
} from '@milkdown/core';
import type { $Command } from '@milkdown/utils';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/vue';
import { FORM_FIELD_INJECTION_KEY, menuPreset, useOverlay, useDialog } from '@cocoar/vue-ui';
import type { OverlayRef } from '@cocoar/vue-ui';
import { decideListToggleAction, isToolEnabled, isToolAllowedByCapabilities } from './toolbar-helpers';
import { resolveCapabilities, type CoarMarkdownFlavorInput, type CoarMarkdownCapabilities } from './flavor';
import { codeBlockNodeView } from './code-block-view';
import { textColor } from './text-color';
import { PlaceholderOverlay } from './placeholder';
import { frontmatter } from './frontmatter';
import ColorPickerPanel from './text-color/ColorPickerPanel.vue';
import TableSizePicker from './table/TableSizePicker.vue';
import TableHandles from './table/TableHandles.vue';
import ImageInsertDialog, { type ImageInsertResult } from './image/ImageInsertDialog.vue';
import { imageUpload, type ImageUploader } from './image/imageUpload';
import type { ImagePicker } from './image/pickImage';
import { sanitizeColor } from '@cocoar/vue-markdown-core';
import {
  commonmark,
  toggleStrongCommand, toggleEmphasisCommand, toggleInlineCodeCommand,
  wrapInBlockquoteCommand, wrapInBulletListCommand, wrapInOrderedListCommand,
  wrapInHeadingCommand, turnIntoTextCommand, insertHrCommand, createCodeBlockCommand,
  liftListItemCommand, sinkListItemCommand, insertImageCommand,
} from '@milkdown/preset-commonmark';
import {
  gfm, toggleStrikethroughCommand, insertTableCommand,
  addRowBeforeCommand, addRowAfterCommand, addColBeforeCommand, addColAfterCommand,
  deleteSelectedCellsCommand, selectTableCommand,
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
export type CoarMarkdownEditorToolbarPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * Toolbar tool identifiers — pass an array of these to the `tools` prop to
 * restrict which buttons are shown. When `tools` is undefined, all are shown.
 */
export type CoarMarkdownEditorTool =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'textColor'
  | 'headings'
  | 'bulletList' | 'orderedList' | 'taskList'
  | 'indent' | 'outdent'
  | 'blockquote' | 'horizontalRule'
  | 'codeBlock' | 'table' | 'tableOps'
  | 'image'
  | 'clearFormatting'
  | 'undo' | 'redo';

/** Canonical list of all toolbar tools — exported so consumers can build
 *  custom subsets (e.g. `tools: COAR_MARKDOWN_EDITOR_ALL_TOOLS.filter(...)`). */
export const COAR_MARKDOWN_EDITOR_ALL_TOOLS: readonly CoarMarkdownEditorTool[] = [
  'bold', 'italic', 'strikethrough', 'inlineCode',
  'textColor',
  'headings',
  'bulletList', 'orderedList', 'taskList',
  'indent', 'outdent',
  'blockquote', 'horizontalRule',
  'codeBlock', 'table', 'tableOps',
  'image',
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
  /**
   * Placeholder text shown while the editor is empty. Rendered as a visual
   * decoration only — it is NOT written to `modelValue`, so an untouched
   * editor still emits an empty string (unlike pre-filling the value).
   */
  placeholder?: string;
  /**
   * Show a **Rendered ↔ Source** toggle. In Source mode the entire Markdown
   * document (including the frontmatter YAML) is editable as raw text in a
   * `<textarea>`; switching back re-renders it. Defaults to false.
   */
  sourceToggle?: boolean;
  toolbarMode?: CoarMarkdownEditorToolbarMode;
  toolbarPosition?: CoarMarkdownEditorToolbarPosition;
  /**
   * Whitelist of toolbar tools. When omitted, all tools are shown. When set,
   * only the listed tools render (in fixed canonical order — passing order
   * does not influence button order).
   */
  tools?: CoarMarkdownEditorTool[];
  /**
   * Markdown **flavor** — the portability contract, hard-enforced. Picks which
   * features are available: the editor only registers the matching plugins (so
   * non-flavor constructs can't be typed/pasted — they degrade to plain text)
   * and hides their toolbar buttons.
   *
   * - `'commonmark'` — portable floor: headings, bold/italic, lists, links,
   *   images, code, blockquote, hr. Renders in any Markdown renderer.
   * - `'gfm'` — + tables, task lists, strikethrough (GFM).
   * - `'cocoar'` (default) — + inline text color (non-portable raw HTML).
   *
   * Or pass a partial capability object `{ gfm?, textColor? }` (unspecified =
   * off). Defaults to `'cocoar'` so existing editors are unchanged. Use the
   * separate `tools` prop for soft toolbar curation within a flavor.
   */
  flavor?: CoarMarkdownFlavorInput;
  /**
   * Enables pasting and dragging image files into the editor. The callback
   * receives the dropped/pasted `File`, stores it wherever the consumer wants
   * (CDN, asset service, data-URL, …) and resolves with the resulting `url`
   * (plus optional `alt`). A spinner placeholder is shown until it resolves,
   * then replaced by a standard Markdown image. When omitted, image files fall
   * through to the browser's default handling.
   */
  uploadImage?: ImageUploader;
  /**
   * Override the **Insert Image** toolbar button. When set, clicking it calls
   * this callback (instead of the built-in URL dialog) with an
   * `insertImage(...)` function bound to the cursor position plus the selected
   * text. Open your own asset / gallery modal and call `ctx.insertImage(...)`.
   * Pairs naturally with `uploadImage` (paste / drop). Requires a sidebar
   * toolbar (`toolbarMode` `'fixed'` or `'both'`), like the other insert buttons.
   */
  pickImage?: ImagePicker;
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
    flavor: { type: [String, Object] as PropType<CoarMarkdownFlavorInput>, default: undefined },
    inputId: { type: String, required: true },
    hasError: { type: Boolean, required: true },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, required: true },
    placeholder: { type: String, default: '' },
    sourceToggle: { type: Boolean, default: false },
    uploadImage: { type: Function as PropType<ImageUploader | undefined>, default: undefined },
    pickImage: { type: Function as PropType<ImagePicker | undefined>, default: undefined },
    onMarkdownChange: { type: Function as PropType<(md: string) => void>, required: true },
  },
  setup(props) {
    // Track last value emitted from inside the editor — so external watch
    // doesn't loop when the parent echoes our own update back. `lastEmitted`
    // is the single source of truth for the current markdown: it feeds the
    // Source-mode textarea and re-seeds Milkdown when switching back.
    const lastEmitted = ref(props.initialValue);

    // Rendered (WYSIWYG) ↔ Source (raw markdown) view mode. Milkdown stays
    // mounted in Source mode (just hidden) so the toolbar — and its toggle —
    // stay put; the writing area shows a textarea instead.
    const viewMode = ref<'rendered' | 'source'>('rendered');

    // Resolve the flavor once at mount — plugin registration is a creation-time
    // decision (the hard part of the contract: a disabled plugin means the
    // construct can't be typed or pasted). Changing `flavor` at runtime needs a
    // remount (re-key the component); the toolbar gate below is reactive.
    const capabilities = resolveCapabilities(props.flavor);

    useEditor((root) => {
      const editor = Editor.make()
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
        .use(commonmark);
      // GFM (tables + task lists + strikethrough) — only when the flavor allows
      // it, so e.g. a pasted `| a | b |` stays literal text in a commonmark flavor.
      if (capabilities.gfm) editor.use(gfm);
      editor
        // Frontmatter: parse a leading `---…---` YAML block as an atomic node
        // rendered as a metadata card (instead of a collapsed setext heading).
        .use(frontmatter)
        .use(history)
        .use(clipboard)
        .use(listener);
      // Inline color mark + raw-HTML span round-trip — non-portable, so gated.
      if (capabilities.textColor) editor.use(textColor);
      editor
        // Custom NodeView for `code_block` — Prism-rendered when not focused,
        // editable + language selector when the cursor is inside.
        .use(codeBlockNodeView)
        // Paste / drag-drop image upload. Inert unless `uploadImage` is set;
        // reads the callback lazily so a changed prop is always honoured.
        .use(imageUpload({ getUploader: () => props.uploadImage }));
      return editor;
    });

    const [loading, getInstance] = useInstance();

    // Sync external value → editor when parent updates modelValue.
    // Milkdown initialises asynchronously: until `loading` flips to false,
    // `getInstance()` returns undefined. Without buffering, an external update
    // arriving in that window would be silently dropped — the editor would
    // stay on `defaultValueCtx` (= initialValue captured at setup) and a
    // subsequent save would round-trip the placeholder back to the consumer.
    const pendingExternal = ref<string | null>(null);

    watch(() => props.externalValue.value, (next) => {
      if (next === lastEmitted.value) return;
      // In Source mode Milkdown is hidden; just track the value (the textarea
      // shows it) and re-sync the hidden editor when we switch back to Rendered.
      if (viewMode.value === 'source') {
        lastEmitted.value = next;
        return;
      }
      const editor = getInstance();
      if (!editor) {
        pendingExternal.value = next;
        return;
      }
      pendingExternal.value = null;
      lastEmitted.value = next;
      editor.action(replaceAll(next));
    });

    // Re-seed Milkdown with the current markdown when returning to Rendered, so
    // any edits made in Source mode (incl. the frontmatter YAML) are re-parsed.
    watch(viewMode, (mode) => {
      if (mode !== 'rendered') return;
      const editor = getInstance();
      if (!editor) return;
      editor.action(replaceAll(lastEmitted.value));
    });

    // Flush a buffered external update once Milkdown finishes init.
    watch(loading, (isLoading) => {
      if (isLoading) return;
      if (pendingExternal.value === null) return;
      const editor = getInstance();
      if (!editor) return;
      const next = pendingExternal.value;
      pendingExternal.value = null;
      if (next === lastEmitted.value) return;
      lastEmitted.value = next;
      editor.action(replaceAll(next));
    }, { immediate: true });

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

    // The placeholder is shown by the Toolbar (which owns the writing-area
    // DOM) as a muted overlay of the shared markdown viewer. It must appear
    // only while the document is empty. `lastEmitted` already tracks the
    // current markdown (updated by the markdownUpdated listener and the
    // external-sync watch), so emptiness is a pure read of it — reading it
    // here makes this render reactive to every content change.
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
      placeholder: props.placeholder,
      pickImage: props.pickImage,
      flavor: props.flavor,
      isEmpty: lastEmitted.value.trim() === '',
      sourceToggle: props.sourceToggle,
      viewMode: viewMode.value,
      sourceValue: lastEmitted.value,
      onToggleView: (mode: 'rendered' | 'source') => { viewMode.value = mode; },
      onSourceInput: (md: string) => {
        if (md === lastEmitted.value) return;
        lastEmitted.value = md;
        props.onMarkdownChange(md);
      },
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
    flavor: { type: [String, Object] as PropType<CoarMarkdownFlavorInput>, default: undefined },
    inputId: { type: String, required: true },
    hasError: { type: Boolean, required: true },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, required: true },
    placeholder: { type: String, default: '' },
    pickImage: { type: Function as PropType<ImagePicker | undefined>, default: undefined },
    isEmpty: { type: Boolean, default: false },
    sourceToggle: { type: Boolean, default: false },
    viewMode: { type: String as PropType<'rendered' | 'source'>, default: 'rendered' },
    sourceValue: { type: String, default: '' },
    onToggleView: { type: Function as PropType<(mode: 'rendered' | 'source') => void>, default: undefined },
    onSourceInput: { type: Function as PropType<(md: string) => void>, default: undefined },
  },
  setup(props) {
    const [, getInstance] = useInstance();
    const rootEl = ref<HTMLElement | null>(null);
    const areaEl = ref<HTMLElement | null>(null);
    const floatingVisible = ref(false);
    // Set while a table-handle action menu is open — suppresses the floating
    // toolbar so the two don't overlap (the handle menu has the table actions).
    const tableHandleMenuOpen = ref(false);
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
      /** Active text-color value (sanitized) at the selection, or `null`
       *  when no color mark covers the range. Used by the picker to render
       *  its swatches with an "active" indicator. */
      text_color: string | null;
      bullet_list: boolean;
      ordered_list: boolean;
      task_list: boolean;
      blockquote: boolean;
      heading: number | null; // level, or null
      table: boolean;
      /** Alignment of the table column the cursor is in, or null when not in a
       *  table cell. Drives the active state of the align L/C/R buttons. */
      cell_alignment: 'left' | 'center' | 'right' | null;
      code_block: boolean;
      /** How many `list_item` ancestors the cursor sits in. 0 = not in any
       *  list, 1 = top-level item, 2+ = nested. Drives indent/outdent enablement. */
      list_item_depth: number;
    }
    const emptyActive: ActiveState = {
      strong: false, emphasis: false, strike_through: false, inlineCode: false,
      text_color: null,
      bullet_list: false, ordered_list: false, task_list: false, blockquote: false,
      heading: null, table: false, cell_alignment: null, code_block: false, list_item_depth: 0,
    };
    // Overlay-driven color picker: positioning, viewport flipping, and
    // outside-click + escape dismissal are owned by the shared overlay
    // service (same primitive that powers menus, popovers, and sidebar
    // flyouts). The editor only opens/closes; everything else is handled.
    const overlay = useOverlay();
    const dialog = useDialog();
    let colorPickerRef: OverlayRef | null = null;
    let tablePickerRef: OverlayRef | null = null;
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

    // Set the alignment of the WHOLE column the cursor is in. Milkdown's
    // `setAlignCommand` only touches the current cell, but GFM serializes a
    // column's alignment from its *header* cell — so aligning from a body cell
    // would be a no-op in the markdown. We set every cell in the column instead
    // (header included), so the editor shows it AND it round-trips.
    function setColumnAlignment(align: 'left' | 'center' | 'right') {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { $from } = state.selection;

        // Locate the enclosing table + the depth of the cell we're in.
        let tablePos = -1;
        let tableNode: ReturnType<typeof $from.node> | null = null;
        let cellDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === 'table') { tableNode = node; tablePos = $from.before(d); }
          if ((node.type.name === 'table_cell' || node.type.name === 'table_header') && cellDepth < 0) {
            cellDepth = d;
          }
        }
        if (!tableNode || cellDepth < 0) return;

        // Column index = the cell's index within its row.
        const colIndex = $from.index(cellDepth - 1);

        // setNodeMarkup keeps node sizes, so positions stay valid across edits
        // in the same transaction — compute from the original doc and apply.
        let tr = state.tr;
        tableNode.forEach((row, rowOffset) => {
          row.forEach((cell, cellOffset, cellIndex) => {
            if (cellIndex !== colIndex) return;
            const cellPos = tablePos + 1 + rowOffset + 1 + cellOffset;
            tr = tr.setNodeMarkup(cellPos, undefined, { ...cell.attrs, alignment: align });
          });
        });
        if (tr.docChanged) view.dispatch(tr);
      });
      updateActiveState();
    }

    // Delete the whole table: select every cell, then delete the selection —
    // ProseMirror removes the now-empty table node. Two commands in one action.
    function deleteTable() {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        const commands = ctx.get(commandsCtx);
        commands.call(selectTableCommand.key);
        commands.call(deleteSelectedCellsCommand.key);
      });
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
    // Resolved flavor capabilities (reactive so the toolbar tracks a changed
    // `flavor` prop). Drives the hard capability gate in `enabled()`.
    const capabilities = computed<CoarMarkdownCapabilities>(() => resolveCapabilities(props.flavor));
    function enabled(tool: CoarMarkdownEditorTool): boolean {
      // Capability gate first: a tool the flavor forbids is never shown.
      if (!isToolAllowedByCapabilities(tool, capabilities.value)) return false;
      return isToolEnabled(tool, enabledSet.value);
    }

    /**
     * Apply (or remove) the text-color mark on the current selection.
     *
     * - `null` removes any existing color mark.
     * - A string is run through `sanitizeColor` first; an unsafe value is
     *   treated as "remove" rather than silently writing it through.
     *
     * Collapsed cursor: we toggle stored marks so the next typed character
     * picks up the chosen color. Range: addMark/removeMark on the range.
     */
    function applyTextColor(rawColor: string | null) {
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      const safeColor = rawColor === null ? null : sanitizeColor(rawColor);
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const markType = state.schema.marks['text_color'];
        if (!markType) return;
        const { from, to, empty } = state.selection;
        if (empty) {
          const current = state.storedMarks ?? state.selection.$from.marks();
          const filtered = current.filter((m) => m.type !== markType);
          const next = safeColor ? [...filtered, markType.create({ color: safeColor })] : filtered;
          view.dispatch(state.tr.setStoredMarks(next));
        } else {
          let tr = state.tr.removeMark(from, to, markType);
          if (safeColor) tr = tr.addMark(from, to, markType.create({ color: safeColor }));
          view.dispatch(tr);
        }
      });
      closeColorPicker();
      updateActiveState();
    }

    function toggleColorPicker(triggerEl: HTMLElement | null) {
      if (!triggerEl) return;
      // Re-clicking the trigger while the picker is open closes it. The
      // overlay service's outside-click handles every other dismissal path.
      if (colorPickerRef && !colorPickerRef.isClosed) {
        closeColorPicker();
        return;
      }
      colorPickerRef = overlay.open({
        spec: {
          ...menuPreset,
          anchor: { kind: 'element', element: triggerEl },
        },
        content: { kind: 'component', component: markRaw(ColorPickerPanel) },
        inputs: {
          currentColor: active.value.text_color,
          pick: (color: string | null) => applyTextColor(color),
        },
      });
      colorPickerRef.afterClosed.then(() => {
        // Keep our local handle in sync when the service closes the picker
        // (outside click, escape, scroll-close-strategy, etc.) so the next
        // trigger click reopens instead of trying to close a stale ref.
        if (colorPickerRef?.isClosed) colorPickerRef = null;
      });
    }

    function closeColorPicker() {
      if (colorPickerRef && !colorPickerRef.isClosed) {
        colorPickerRef.close();
      }
      colorPickerRef = null;
    }

    // Insert a table of the chosen size at the cursor. `insertTableCommand`
    // takes total rows (incl. the header) and columns.
    function insertTableSized(rows: number, cols: number) {
      closeTablePicker();
      if (props.readonly) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        ctx.get(commandsCtx).call(insertTableCommand.key, { row: rows, col: cols });
      });
      updateActiveState();
    }

    // Insert Table button → grid size picker (Teleported overlay anchored to the
    // trigger), instead of a fixed-size insert. Re-clicking the trigger closes it.
    function openTablePicker(triggerEl: HTMLElement | null) {
      if (!triggerEl || props.readonly) return;
      if (tablePickerRef && !tablePickerRef.isClosed) {
        closeTablePicker();
        return;
      }
      tablePickerRef = overlay.open({
        spec: { ...menuPreset, anchor: { kind: 'element', element: triggerEl } },
        content: { kind: 'component', component: markRaw(TableSizePicker) },
        inputs: { pick: (rows: number, cols: number) => insertTableSized(rows, cols) },
      });
      tablePickerRef.afterClosed.then(() => {
        if (tablePickerRef?.isClosed) tablePickerRef = null;
      });
    }

    function closeTablePicker() {
      if (tablePickerRef && !tablePickerRef.isClosed) {
        tablePickerRef.close();
      }
      tablePickerRef = null;
    }

    // Dispatch commonmark's `insertImageCommand` at the editor's stored
    // selection (ProseMirror keeps the selection while the editor is blurred,
    // so the image lands where the cursor was). Markdown round-trips as the
    // standard `![alt](url "title")`. Shared by the URL dialog and the
    // consumer `pickImage` hook.
    function doInsertImage(image: { url: string; alt?: string; title?: string }) {
      if (props.readonly || !image.url) return;
      const editor = getInstance();
      if (!editor) return;
      editor.action((ctx) => {
        ctx.get(commandsCtx).call(insertImageCommand.key, {
          src: image.url,
          alt: image.alt || undefined,
          title: image.title || undefined,
        });
      });
    }

    // Read the text covered by the current selection (empty if collapsed) —
    // handed to `pickImage` as a default-alt hint.
    function getSelectedText(): string {
      const editor = getInstance();
      if (!editor) return '';
      let text = '';
      editor.action((ctx) => {
        const { state } = ctx.get(editorViewCtx);
        const { from, to } = state.selection;
        text = state.doc.textBetween(from, to, ' ');
      });
      return text;
    }

    // Insert Image button handler. With a consumer `pickImage` hook, hand off
    // to it (bound `insertImage` + selected text); otherwise open the built-in
    // URL dialog.
    function handleInsertImageClick() {
      if (props.readonly) return;
      const picker = props.pickImage;
      if (picker) {
        picker({ insertImage: doInsertImage, selectedText: getSelectedText() });
        return;
      }
      dialog
        .open(ImageInsertDialog, { title: 'Insert image', size: 's' })
        .result.then((result) => {
          const value = result as ImageInsertResult | undefined;
          if (value?.url) doInsertImage(value);
        });
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

          // Read the text-color mark's color attr from the cursor (collapsed)
          // or from the first occurrence in the range. We don't try to detect
          // mixed colors — the picker's "active" indicator just shows the
          // color the user would replace with another click.
          const colorType = state.schema.marks['text_color'];
          if (colorType) {
            const findColor = (): string | null => {
              if (empty) {
                const marks = storedMarks ?? $from.marks();
                const m = marks.find((mk) => mk.type === colorType);
                const c = typeof m?.attrs['color'] === 'string' ? m.attrs['color'] : null;
                return c ? sanitizeColor(c) : null;
              }
              let found: string | null = null;
              state.doc.nodesBetween(from, to, (node) => {
                if (found) return false;
                const m = node.marks.find((mk) => mk.type === colorType);
                if (m) {
                  const c = typeof m.attrs['color'] === 'string' ? m.attrs['color'] : null;
                  found = c ? sanitizeColor(c) : null;
                }
                return found === null;
              });
              return found;
            };
            next.text_color = findColor();
          }

          // Walk ancestors for block-level node detection
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const name = node.type.name;
            if (name === 'bullet_list') next.bullet_list = true;
            else if (name === 'ordered_list') next.ordered_list = true;
            else if (name === 'blockquote') next.blockquote = true;
            else if (name === 'heading') next.heading = (node.attrs.level as number) ?? null;
            else if (name === 'table') next.table = true;
            else if (name === 'table_cell' || name === 'table_header') {
              // GFM stores per-column alignment on the cell's `alignment` attr.
              const align = node.attrs.alignment;
              if (align === 'left' || align === 'center' || align === 'right') {
                next.cell_alignment = align;
              }
            }
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
      // The color picker lives in an overlay outlet (Teleport-to-body via the
      // overlay service); it has its own outside-click handler and must be
      // exempt here so a click inside the picker doesn't bleed through to
      // the floating toolbar's hide logic.
      if (target.closest('.coar-md-color-picker') || target.closest('.coar-overlay-outlet')) return;
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
      closeColorPicker();
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

      // Source toggle — pinned at the top when `sourceToggle` is on. In Source
      // mode it's the *only* item: the formatting commands act on the hidden
      // rich editor, so showing them would be confusing.
      if (props.sourceToggle) {
        const isSource = props.viewMode === 'source';
        items.push(h(CoarSidebarItem, {
          icon: isSource ? 'eye' : 'code',
          label: isSource ? 'Rendered' : 'Source',
          active: isSource,
          onClick: () => props.onToggleView?.(isSource ? 'rendered' : 'source'),
        }));
        if (isSource) return renderSidebarHost(items);
        sectionDivider(items);
      }

      pushIf(items, 'bold', sidebarItem('bold', 'Bold', cmds.bold, { active: a.strong }));
      pushIf(items, 'italic', sidebarItem('italic', 'Italic', cmds.italic, { active: a.emphasis }));
      pushIf(items, 'strikethrough', sidebarItem('strikethrough', 'Strikethrough', cmds.strike, { active: a.strike_through }));
      pushIf(items, 'inlineCode', sidebarItem('code', 'Inline Code', cmds.code, { active: a.inlineCode }));
      // Text color trigger — opens the same Teleported swatch popover used by
      // the floating toolbar, anchored to the sidebar item so positioning
      // stays correct when the sidebar lives on the right edge etc.
      pushIf(items, 'textColor', h(CoarSidebarItem, {
        icon: 'palette',
        label: 'Text Color',
        active: a.text_color !== null,
        onClick: (e: MouseEvent) => {
          // CoarSidebarItem's keyboard activation synthesises a MouseEvent
          // without a currentTarget; fall back to the click target so the
          // overlay still has a valid anchor element to position against.
          const triggerEl = (e.currentTarget as HTMLElement | null) ??
            (e.target as HTMLElement | null);
          toggleColorPicker(triggerEl);
        },
      }));
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
      pushIf(items, 'table', h(CoarSidebarItem, {
        icon: 'table',
        label: 'Insert Table',
        active: a.table,
        onClick: (e: MouseEvent) => {
          const triggerEl = (e.currentTarget as HTMLElement | null) ?? (e.target as HTMLElement | null);
          openTablePicker(triggerEl);
        },
      }));
      pushIf(items, 'image', sidebarItem('image', 'Insert Image', cmds.bold, { onClick: handleInsertImageClick }));

      // When the cursor is inside a table, surface the table operations in the
      // sidebar so users in `fixed`/`both` toolbar mode can edit table structure
      // without relying on the floating toolbar (which can be disabled).
      if (a.table && enabled('tableOps')) {
        sectionDivider(items);
        items.push(sidebarItem('table-row-plus-above', 'Insert Row Above', cmds.addRowBefore));
        items.push(sidebarItem('table-row-plus-below', 'Insert Row Below', cmds.addRowAfter));
        items.push(sidebarItem('table-column-plus-left', 'Insert Column Left', cmds.addColBefore));
        items.push(sidebarItem('table-column-plus-right', 'Insert Column Right', cmds.addColAfter));
        items.push(sidebarItem('align-left', 'Align Left', cmds.deleteCell, { active: a.cell_alignment === 'left', onClick: () => setColumnAlignment('left') }));
        items.push(sidebarItem('align-center', 'Align Center', cmds.deleteCell, { active: a.cell_alignment === 'center', onClick: () => setColumnAlignment('center') }));
        items.push(sidebarItem('align-right', 'Align Right', cmds.deleteCell, { active: a.cell_alignment === 'right', onClick: () => setColumnAlignment('right') }));
        items.push(sidebarItem('trash-2', 'Delete Cell', cmds.deleteCell));
        items.push(sidebarItem('table', 'Delete Table', cmds.deleteCell, { onClick: deleteTable }));
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

      return renderSidebarHost(items);
    }

    // Wraps a built item list in the collapsed CoarSidebar host. Shared by the
    // normal sidebar and the Source-mode (toggle-only) variant.
    function renderSidebarHost(items: VNodeArrayChildren) {
      return h('div', {
        key: 'sidebar',
        class: 'coar-md-sidebar-wrap',
        // Prevent focus steal from the editor when clicking sidebar items
        onMousedown: (e: MouseEvent) => e.preventDefault(),
      }, [
        h(CoarSidebar, {
          collapsed: true,
          // CoarSidebar's `side` accepts all four edges; the deprecated
          // `position` only handles left/right, so use `side` directly.
          side: props.toolbarPosition,
          size: 's',
          // 'primary' = light grey background (--coar-background-neutral-secondary).
          // 'secondary' is plain white. We want the toolbar to read as a distinct
          // surface separate from the editor's writing area.
          variant: 'primary',
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

      if (enabled('textColor')) {
        const colorActive = a.text_color !== null;
        textToolbar.push(
          h('button', {
            class: [
              'coar-md-float-btn',
              colorActive ? 'coar-md-float-btn--active' : '',
            ],
            type: 'button',
            title: colorActive ? `Text Color (${a.text_color})` : 'Text Color',
            style: colorActive ? `--coar-md-color-indicator: ${a.text_color};` : undefined,
            onMousedown: (e: MouseEvent) => {
              e.preventDefault();
              toggleColorPicker(e.currentTarget as HTMLElement);
            },
          }, [h(CoarIcon, { name: 'palette', size: 's' })]),
        );
      }

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
        fb('table-row-plus-above', 'Insert Row Above', cmds.addRowBefore),
        fb('table-row-plus-below', 'Insert Row Below', cmds.addRowAfter),
        sep(),
        fb('table-column-plus-left', 'Insert Column Left', cmds.addColBefore),
        fb('table-column-plus-right', 'Insert Column Right', cmds.addColAfter),
        sep(),
        fb('align-left', 'Align Left', cmds.deleteCell, { isActive: a.cell_alignment === 'left', onClick: () => setColumnAlignment('left') }),
        fb('align-center', 'Align Center', cmds.deleteCell, { isActive: a.cell_alignment === 'center', onClick: () => setColumnAlignment('center') }),
        fb('align-right', 'Align Right', cmds.deleteCell, { isActive: a.cell_alignment === 'right', onClick: () => setColumnAlignment('right') }),
        sep(),
        fb('trash-2', 'Delete Cell', cmds.deleteCell),
        fb('table', 'Delete Table', cmds.deleteCell, { onClick: deleteTable }),
        ...(enabled('bold') || enabled('italic') || enabled('inlineCode') ? [sep()] : []),
        ...(enabled('bold') ? [fb('bold', 'Bold', cmds.bold)] : []),
        ...(enabled('italic') ? [fb('italic', 'Italic', cmds.italic)] : []),
        ...(enabled('inlineCode') ? [fb('code', 'Code', cmds.code)] : []),
      ] : textToolbar;

      const colToolbar: VNodeArrayChildren = enabled('tableOps') ? [
        fb('table-column-plus-left', 'Insert Column Left', cmds.addColBefore),
        fb('table-column-plus-right', 'Insert Column Right', cmds.addColAfter),
        sep(),
        fb('trash-2', 'Delete Column', cmds.deleteCell),
      ] : textToolbar;

      const rowToolbar: VNodeArrayChildren = enabled('tableOps') ? [
        fb('table-row-plus-above', 'Insert Row Above', cmds.addRowBefore),
        fb('table-row-plus-below', 'Insert Row Below', cmds.addRowAfter),
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
      const isSource = props.sourceToggle && props.viewMode === 'source';
      const showFloat = !props.readonly && !isSource
        && (props.toolbarMode === 'floating' || props.toolbarMode === 'both');

      // Stable keys are critical: without them, switching toolbar mode shifts
      // the editor div's position in the children list, Vue re-creates the DOM,
      // and Milkdown gets remounted (losing PM listeners + the active-state hook).
      const children: VNodeArrayChildren = [];
      // Sidebar appears before the editor for 'left' / 'top' (start of main axis)
      // and after for 'right' / 'bottom' (end of main axis). The actual axis
      // (row / column) is selected by a class on the root element below.
      const sidebarFirst = props.toolbarPosition === 'left' || props.toolbarPosition === 'top';
      const sidebarLast = props.toolbarPosition === 'right' || props.toolbarPosition === 'bottom';
      if (showFixed && sidebarFirst) children.push(renderSidebar());
      // The `coar-markdown` class scopes the shared `--coar-markdown-*` token
      // overrides + baseline rules from `@cocoar/vue-markdown/styles`,
      // so the editor inherits the same typography/colour palette as the viewer.
      // Editor-specific compactness lives in deeper `.coar-md-area .milkdown`
      // selectors and wins via specificity.
      // The placeholder overlay is a muted, click-through render of the shared
      // markdown viewer, shown only while the document is empty. It sits on top
      // of the (empty) ProseMirror doc without affecting layout or the caret.
      const showPlaceholder = props.isEmpty && props.placeholder.length > 0 && !isSource;
      // Milkdown stays mounted in Source mode (hidden via the `--source` class);
      // the raw textarea takes over the writing area. When there is no fixed
      // sidebar to host the toggle (floating mode), a small corner button does.
      children.push(h('div', {
        key: 'area',
        ref: areaEl,
        class: ['coar-md-area', 'coar-markdown', { 'coar-md-area--source': isSource }],
        onMousedown: isSource ? undefined : onAreaMouseDown,
      }, [
        h(Milkdown),
        showPlaceholder
          ? h(PlaceholderOverlay, { key: 'placeholder', source: props.placeholder })
          : null,
        // Hover edge-handles for tables — only when tables are possible (gfm)
        // and the doc is editable. Reads the area element as its hover scope.
        (!props.readonly && !isSource && capabilities.value.gfm)
          ? h(TableHandles, {
              key: 'table-handles',
              area: areaEl.value,
              onMenuToggle: (open: boolean) => { tableHandleMenuOpen.value = open; },
            })
          : null,
        isSource
          ? h('textarea', {
              key: 'source',
              class: 'coar-md-source-area',
              value: props.sourceValue,
              readonly: props.readonly || undefined,
              disabled: props.disabled || undefined,
              spellcheck: 'false',
              placeholder: props.placeholder || undefined,
              onInput: (e: Event) => props.onSourceInput?.((e.target as HTMLTextAreaElement).value),
            })
          : null,
        props.sourceToggle && !showFixed
          ? h('button', {
              key: 'source-corner',
              class: 'coar-md-source-corner',
              type: 'button',
              title: isSource ? 'Show rendered' : 'Edit source',
              'aria-label': isSource ? 'Show rendered' : 'Edit source',
              onMousedown: (e: MouseEvent) => {
                e.preventDefault();
                props.onToggleView?.(isSource ? 'rendered' : 'source');
              },
            }, [h(CoarIcon, { name: isSource ? 'eye' : 'code', size: 's' })])
          : null,
      ]));
      if (showFixed && sidebarLast) children.push(renderSidebar());
      if (floatingVisible.value && showFloat && !tableHandleMenuOpen.value) children.push(renderFloating());

      const rootClass = {
        'coar-md-root': true,
        [`coar-md-root--toolbar-${props.toolbarPosition}`]: true,
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
    placeholder: { type: String, default: '' },
    sourceToggle: { type: Boolean, default: false },
    toolbarMode: { type: String as PropType<CoarMarkdownEditorToolbarMode>, default: 'floating' },
    toolbarPosition: { type: String as PropType<CoarMarkdownEditorToolbarPosition>, default: 'left' },
    tools: { type: Array as PropType<CoarMarkdownEditorTool[]>, default: undefined },
    flavor: { type: [String, Object] as PropType<CoarMarkdownFlavorInput>, default: undefined },
    uploadImage: { type: Function as PropType<ImageUploader | undefined>, default: undefined },
    pickImage: { type: Function as PropType<ImagePicker | undefined>, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // Capture the initial value once; external updates flow through externalValue.
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
        sourceToggle: props.sourceToggle,
        toolbarMode: props.toolbarMode,
        toolbarPosition: props.toolbarPosition,
        tools: props.tools,
        flavor: props.flavor,
        inputId: inputId.value,
        hasError: hasError.value,
        describedBy: describedBy.value,
        name: props.name,
        required: props.required,
        placeholder: props.placeholder,
        uploadImage: props.uploadImage,
        pickImage: props.pickImage,
        onMarkdownChange: (md: string) => emit('update:modelValue', md),
      }),
    );
  },
});
</script>

<style>
/* Shared markdown-block stylesheet — same source as the viewer (`CoarMarkdown`).
   Editor-specific compactness rules below win via deeper-selector specificity. */
@import "@cocoar/vue-markdown/styles";

.coar-md-root {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}

/* Toolbar on top / bottom switches the root to a column layout so the sidebar
   sits as a horizontal toolbar above (or below) the editor area. */
.coar-md-root--toolbar-top,
.coar-md-root--toolbar-bottom {
  flex-direction: column;
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

/* ── Source view (raw markdown) ── */
/* In Source mode Milkdown stays mounted but hidden; a full-bleed textarea
   covers the writing area. The toggle that drives this lives in the sidebar
   (fixed/both) or, with no sidebar, as the corner button below. */
.coar-md-area--source .milkdown {
  display: none;
}
.coar-md-source-area {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  font-family: var(--coar-font-family-mono, monospace);
  font-size: var(--coar-font-size-s, 0.875rem);
  line-height: 1.6;
  tab-size: 2;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}
.coar-md-source-area:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Floating-mode fallback toggle (no sidebar to host it). */
.coar-md-source-corner {
  position: absolute;
  top: var(--coar-spacing-xs);
  right: var(--coar-spacing-xs);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
}
.coar-md-source-corner:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}

.coar-md-sidebar-wrap {
  flex-shrink: 0;
  /* CoarSidebar's default collapsed dimensions are sized for navigation
     contexts. For an icon-only formatting toolbar, ~36px is enough on both
     axes — the sidebar's own paddings still leave breathing room around each
     icon. We override both width and height tokens here so a single rule
     covers all four toolbar positions. */
  --coar-sidebar-collapsed-width: 2.25rem;
  --coar-sidebar-collapsed-height: 2.25rem;
  --coar-sidebar-item-padding: 0.25rem 0.375rem;
}

/* Border lives on the edge between the toolbar and the editor area, so it
   flips depending on toolbarPosition. The selectors target the wrap based on
   its sibling order relative to the editor area. */
.coar-md-root--toolbar-left .coar-md-sidebar-wrap {
  border-right: 1px solid var(--coar-border-neutral);
}

.coar-md-root--toolbar-right .coar-md-sidebar-wrap {
  border-left: 1px solid var(--coar-border-neutral);
}

.coar-md-root--toolbar-top .coar-md-sidebar-wrap {
  border-bottom: 1px solid var(--coar-border-neutral);
}

.coar-md-root--toolbar-bottom .coar-md-sidebar-wrap {
  border-top: 1px solid var(--coar-border-neutral);
}

.coar-md-area {
  flex: 1;
  overflow: auto;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  /* Padding clicks land here and focus the editor (see onAreaMouseDown). */
  cursor: text;
  /* Containing block for the absolutely-positioned placeholder overlay. */
  position: relative;
}

/* Suppress the browser's default focus ring on the contenteditable region.
   The wrapper's own focus-within / form-field error styling provides the
   visible state — the contenteditable's outline would compete with it. */
.coar-md-area .milkdown,
.coar-md-area .milkdown .editor,
.coar-md-area .milkdown [contenteditable] {
  outline: none;
}

/* Typography (heading sizes, paragraph spacing, list indentation, blockquote,
   inline-code, link, table) all live in `@cocoar/vue-markdown/styles` —
   the shared block stylesheet. The selectors there cover both the viewer's
   direct-child layout *and* the editor's PM-managed `.ProseMirror > …`
   structure, so editor and viewer render identically. Adding deeper-
   selector overrides here breaks that parity. */

.coar-md-area .milkdown pre {
  background: var(--coar-background-neutral-secondary);
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-radius: var(--coar-radius-xl);
  overflow-x: auto;
  margin: 0.5em 0;
}
.coar-md-area .milkdown pre code { background: none; padding: 0; }

.coar-md-area .milkdown hr {
  border: none;
  border-top: 1px solid var(--coar-border-neutral);
  margin: 1em 0;
}

/* Inline images keep within the writing column instead of overflowing. The
   viewer styles `.coar-markdown-image`; Milkdown emits a bare `<img>`, so we
   match it here for editor/viewer parity on width. */
.coar-md-area .milkdown img {
  max-width: 100%;
  height: auto;
}

/* ── Upload placeholder (paste / drop) ── */
/* A small inline spinner shown at the insertion point while `uploadImage`
   is in flight, then replaced by the real image node. */
.coar-md-image-uploading {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  vertical-align: text-bottom;
  border: 2px solid var(--coar-border-neutral);
  border-top-color: var(--coar-text-neutral-secondary, currentColor);
  border-radius: 50%;
  animation: coar-md-image-spin 0.7s linear infinite;
}
@keyframes coar-md-image-spin {
  to { transform: rotate(360deg); }
}
/* `strong` and `del` intentionally NOT styled here — browser defaults
   (bold = 700, line-through) match the viewer. The previous `font-weight:
   600` override caused editor strong to render lighter than viewer strong. */

/* GFM task-list checkbox styling lives in `@cocoar/vue-markdown/styles` so
   editor and viewer render the cocoar-style checkbox identically. */

/* ── Empty-state placeholder ── */
/* A muted, click-through overlay of the shared markdown viewer (rendered by
   `PlaceholderOverlay.vue`), shown only while the document is empty. Because
   it's a real `<CoarMarkdown>` render, the placeholder may itself be Markdown
   (**bold**, lists, headings) and matches the editor's own typography. It is
   never document content, so an untouched editor still serialises to '' .
   The overlay shares `.coar-md-area`'s padding so its first line aligns with
   the caret; `pointer-events:none` lets clicks fall through to focus the editor. */
.coar-md-placeholder {
  position: absolute;
  inset: 0;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
/* Mute every rendered node to the placeholder colour. The `.coar-md-placeholder`
   class out-specifies the viewer's `:where(...)` token colours (0,1,0 > 0,0,0). */
.coar-md-placeholder,
.coar-md-placeholder * {
  color: var(--coar-text-placeholder);
}
/* The viewer gives its first block a top margin (esp. headings); the editor's
   empty paragraph has none, so strip it to keep the hint aligned with the caret. */
.coar-md-placeholder .coar-markdown > :first-child {
  margin-top: 0;
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

/* ── Text-color trigger ── */
/* The active-color indicator on the floating-toolbar trigger is a thin bar
   under the icon; the value comes from --coar-md-color-indicator set inline
   when an active color is detected at the selection. The picker panel
   itself lives in `ColorPickerPanel.vue` (rendered via the overlay
   service), with global styles colocated there. */
.coar-md-float-btn[style*='--coar-md-color-indicator']::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  height: 2px;
  border-radius: 1px;
  background: var(--coar-md-color-indicator);
}
.coar-md-float-btn[style*='--coar-md-color-indicator'] {
  position: relative;
}
</style>
