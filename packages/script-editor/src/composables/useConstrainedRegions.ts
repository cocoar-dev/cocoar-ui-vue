import type * as monaco from 'monaco-editor';
import { onBeforeUnmount, watch, type Ref } from 'vue';
import {
  ChangeGuard,
  type ChangeGuardRejectEvent,
} from '../constrained/ChangeGuard';
import { CursorGuard } from '../constrained/CursorGuard';
import { DiagnosticsFilter } from '../constrained/DiagnosticsFilter';
import {
  hasLockedMarkers,
  type LockedLine,
} from '../constrained/LockedLineScanner';

export interface UseConstrainedRegionsOptions {
  editor: Readonly<Ref<monaco.editor.IStandaloneCodeEditor | null>>;
  value: () => string;
  /** When true, guards observe but do not reject. Markers stay visible. */
  authoring: () => boolean;
  onReject?: (event: ChangeGuardRejectEvent) => void;
}

const LINE_DECORATION_CLASS = 'coar-script-editor-locked-line';
const MARKER_DECORATION_CLASS = 'coar-script-editor-locked-marker';

const LOCKED_MARKER_IN_LINE = /\/\/\s*@locked\b/g;

/**
 * Attaches change + cursor guards when the source contains locked-line markers, and draws
 * decorations for each locked line (whole-line background tint + shrunk marker text).
 * Tears itself down when no markers are present.
 */
export function useConstrainedRegions(options: UseConstrainedRegionsOptions): void {
  let changeGuard: ChangeGuard | null = null;
  let cursorGuard: CursorGuard | null = null;
  let diagnosticsFilter: DiagnosticsFilter | null = null;
  let decorations: monaco.editor.IEditorDecorationsCollection | null = null;

  function teardown() {
    changeGuard?.dispose();
    changeGuard = null;
    cursorGuard?.dispose();
    cursorGuard = null;
    diagnosticsFilter?.dispose();
    diagnosticsFilter = null;
    decorations?.clear();
    decorations = null;
  }

  function drawDecorations(
    editor: monaco.editor.IStandaloneCodeEditor,
    lines: readonly LockedLine[],
  ) {
    const model = editor.getModel();
    if (!model) return;

    const decs: monaco.editor.IModelDeltaDecoration[] = [];
    for (const line of lines) {
      const lineNumber = line.lineIndex + 1; // Monaco is 1-based
      const lineLength = model.getLineLength(lineNumber);
      // Whole-line tint on the locked line.
      decs.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: lineLength + 1,
        } as monaco.IRange,
        options: {
          className: LINE_DECORATION_CLASS,
          isWholeLine: true,
          stickiness: 1,
        },
      });
      // Shrink + dim every marker occurrence on the line. Uses the /g flag so multiple
      // `// @locked` comments on the same line are all styled.
      const lineText = model.getLineContent(lineNumber);
      const lineMarkerRe = new RegExp(LOCKED_MARKER_IN_LINE.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = lineMarkerRe.exec(lineText)) !== null) {
        decs.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: match.index + 1,
            endLineNumber: lineNumber,
            endColumn: match.index + match[0].length + 1,
          } as monaco.IRange,
          options: {
            inlineClassName: MARKER_DECORATION_CLASS,
            stickiness: 1,
            hoverMessage: { value: 'Locked line marker' },
          },
        });
      }
    }

    if (!decorations) {
      decorations = editor.createDecorationsCollection(decs);
    } else {
      decorations.set(decs);
    }
  }

  function setup(editor: monaco.editor.IStandaloneCodeEditor) {
    teardown();

    // Disable Monaco auto-features whose edits routinely span multiple lines. Without this,
    // a format-on-paste / linked-rename operation that happens to cross a locked line gets
    // rejected atomically and leaves the user with "nothing happened, why?". Disabling them
    // in constrained mode keeps behaviour predictable. Auto-Import quickfix (lightbulb) is
    // deliberately left enabled — its edits go to the file top, which is nearly always
    // outside any lock.
    editor.updateOptions({
      formatOnType: false,
      formatOnPaste: false,
      linkedEditing: false,
    });

    changeGuard = new ChangeGuard(editor, options.authoring, {
      onReject: options.onReject,
      onLinesUpdated: (lines) => {
        drawDecorations(editor, lines);
        // Locked-line set may have shifted — re-filter markers against the new state.
        diagnosticsFilter?.refresh();
      },
    });
    cursorGuard = new CursorGuard(
      editor,
      () => changeGuard?.getProtectedRanges() ?? [],
      options.authoring,
    );
    diagnosticsFilter = new DiagnosticsFilter(editor, options.authoring);
    drawDecorations(editor, changeGuard.getLockedLines());
    cursorGuard.snapCurrent();
  }

  // Watch only the presence-of-markers signal and the editor ref. The actual content
  // changes are handled inside `ChangeGuard.onDidChangeContent` — keying this watch off
  // `options.value()` directly would re-run (scan + decoration redraw) on every keystroke,
  // doubling the work the guard already does.
  watch(
    [options.editor, () => hasLockedMarkers(options.value())],
    ([editor, hasMarkers]) => {
      if (!editor) {
        teardown();
        return;
      }
      if (!hasMarkers) {
        teardown();
        return;
      }
      if (!changeGuard) {
        setup(editor);
      }
      // When markers were already present and still are, no resetup is needed — the guard
      // keeps its own state in sync via the model's change event (including `isFlush`).
    },
    { immediate: true, flush: 'post' },
  );

  // When authoring toggles, cursor may now be allowed inside a previously-forbidden line —
  // no action needed. But when re-locking, any cursor still inside a locked line should
  // snap. We trigger that explicitly.
  watch(
    () => options.authoring(),
    (authoring) => {
      if (!authoring) cursorGuard?.snapCurrent();
    },
  );

  onBeforeUnmount(() => teardown());
}
