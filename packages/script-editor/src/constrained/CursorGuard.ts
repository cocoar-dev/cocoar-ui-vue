import type * as monaco from 'monaco-editor';
import { snapOffsetAwayFromLocked, type ProtectedRange } from './LockedLineScanner';

/**
 * Keeps cursors out of the interior of locked lines. When enforcement is on and a cursor
 * endpoint lands strictly inside a protected range, it is snapped to the closer boundary.
 *
 * Reads protected ranges from a getter so the guard always uses the latest scan — ranges
 * shift whenever content above a locked line changes.
 */
export class CursorGuard {
  private readonly disposables: monaco.IDisposable[] = [];
  private correcting = false;

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly getRanges: () => readonly ProtectedRange[],
    private readonly authoring: () => boolean,
  ) {
    this.disposables.push(
      editor.onDidChangeCursorSelection(() => this.handleSelectionChange()),
    );
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }

  snapCurrent(): void {
    this.handleSelectionChange();
  }

  private handleSelectionChange(): void {
    if (this.correcting || this.authoring()) return;
    const model = this.editor.getModel();
    if (!model) return;

    const selections = this.editor.getSelections();
    if (!selections || selections.length === 0) return;

    const ranges = this.getRanges();
    if (ranges.length === 0) return;

    const SelectionCtor = selections[0].constructor as typeof monaco.Selection;
    const corrected: monaco.Selection[] = [];
    let anyChanged = false;

    for (const sel of selections) {
      const startOffset = model.getOffsetAt(sel.getStartPosition());
      const endOffset = model.getOffsetAt(sel.getEndPosition());
      const snappedStart = snapOffsetAwayFromLocked(startOffset, ranges);
      const snappedEnd = snapOffsetAwayFromLocked(endOffset, ranges);

      if (snappedStart === startOffset && snappedEnd === endOffset) {
        corrected.push(sel);
        continue;
      }

      const startPos = model.getPositionAt(snappedStart);
      const endPos = model.getPositionAt(snappedEnd);
      const newSel =
        snappedStart === snappedEnd
          ? new SelectionCtor(startPos.lineNumber, startPos.column, startPos.lineNumber, startPos.column)
          : new SelectionCtor(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
      corrected.push(newSel);
      anyChanged = true;
    }

    if (!anyChanged) return;

    this.correcting = true;
    try {
      this.editor.setSelections(corrected);
    } finally {
      this.correcting = false;
    }
  }
}
