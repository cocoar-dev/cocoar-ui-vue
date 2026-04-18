import type * as monaco from 'monaco-editor';
import {
  computeProtectedRanges,
  editIsProtected,
  scanLockedLines,
  type LockedLine,
  type ProtectedRange,
} from './LockedLineScanner';

export type ChangeGuardRejectReason = 'edit-overlaps-locked-line';

export interface ChangeGuardRejectEvent {
  reason: ChangeGuardRejectReason;
  /** 1-based line range of the rejected edit as reported by Monaco. */
  range?: { startLineNumber: number; endLineNumber: number };
}

export interface ChangeGuardCallbacks {
  onReject?: (event: ChangeGuardRejectEvent) => void;
  onLinesUpdated?: (lines: readonly LockedLine[]) => void;
  onContentChanged?: (value: string) => void;
}

/**
 * Watches content changes on a Monaco model and rejects any edit that overlaps a locked
 * line (including the line's trailing `\n`, so line-merging is blocked).
 *
 * Skipped automatically:
 *  - `event.isFlush` — a full-document replacement via `setValue` from outside; trusted.
 *  - `event.isUndoing` — the editor is replaying an undo (including our own rollback of an
 *    illegal edit). We just refresh our cached scan; the undo itself is trusted.
 *
 * When `authoring()` returns true the guard becomes a passive observer — no rejects.
 */
export class ChangeGuard {
  private readonly disposables: monaco.IDisposable[] = [];
  private lockedLines: LockedLine[];
  private protectedRanges: ProtectedRange[];

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly authoring: () => boolean,
    private readonly callbacks: ChangeGuardCallbacks = {},
  ) {
    const model = editor.getModel();
    if (!model) {
      throw new Error('ChangeGuard requires the editor to have an attached model');
    }
    this.lockedLines = scanLockedLines(model.getValue());
    this.protectedRanges = computeProtectedRanges(this.lockedLines);
    this.disposables.push(model.onDidChangeContent((event) => this.handleChange(event)));
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }

  getLockedLines(): readonly LockedLine[] {
    return this.lockedLines;
  }

  getProtectedRanges(): readonly ProtectedRange[] {
    return this.protectedRanges;
  }

  /** Re-scan the model after an external change that bypassed onDidChangeContent. */
  refresh(): void {
    const model = this.editor.getModel();
    if (!model) return;
    this.lockedLines = scanLockedLines(model.getValue());
    this.protectedRanges = computeProtectedRanges(this.lockedLines);
    this.callbacks.onLinesUpdated?.(this.lockedLines);
  }

  private handleChange(event: monaco.editor.IModelContentChangedEvent): void {
    const model = this.editor.getModel();
    if (!model) return;

    const trustEvent = event.isFlush || event.isUndoing || this.authoring();

    // On a full-document replacement (external `setValue`) push an undo stop so subsequent
    // programmatic edits cannot coalesce with the flush. Without this, our rollback-undo for
    // a later illegal edit could walk back through the flush too. We do NOT push after
    // normal legal edits — doing so would destroy Monaco's native typing coalescing (every
    // keystroke would become its own undo step).
    if (event.isFlush) {
      model.pushStackElement();
    }

    if (!trustEvent) {
      const illegalChange = event.changes.find((change) =>
        editIsProtected(
          { rangeStart: change.rangeOffset, rangeEnd: change.rangeOffset + change.rangeLength },
          this.protectedRanges,
        ),
      );
      if (illegalChange) {
        this.editor.trigger('coar-script-editor-guard', 'undo', null);
        this.callbacks.onReject?.({
          reason: 'edit-overlaps-locked-line',
          range: {
            startLineNumber: illegalChange.range.startLineNumber,
            endLineNumber: illegalChange.range.endLineNumber,
          },
        });
        return;
      }
    }

    this.lockedLines = scanLockedLines(model.getValue());
    this.protectedRanges = computeProtectedRanges(this.lockedLines);
    this.callbacks.onLinesUpdated?.(this.lockedLines);
    this.callbacks.onContentChanged?.(model.getValue());
  }
}
