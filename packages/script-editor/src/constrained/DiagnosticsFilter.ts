import * as monaco from 'monaco-editor';
import { scanLockedLines } from './LockedLineScanner';

/**
 * Suppresses error-severity TypeScript markers that fall on locked lines.
 *
 * Why: when a user types an incomplete body (e.g. an unbalanced `}`), the TS parser's
 * recovery often flags the surrounding *signature* as a syntax error. For the user that
 * signature appears broken, even though they never touched it — and can't fix it anyway.
 * We hide those errors until the body stabilises.
 *
 * Scope:
 *  - Only the editor's own model is filtered.
 *  - Only severity `Error` markers; warnings and info are left alone.
 *  - When `authoring()` returns true (template authoring), the filter stands down — the
 *    author needs to see every diagnostic.
 */
export class DiagnosticsFilter {
  private readonly disposables: monaco.IDisposable[] = [];
  /** Re-entrancy guard: our own `setModelMarkers` fires `onDidChangeMarkers` again. */
  private filtering = false;

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly authoring: () => boolean,
  ) {
    this.disposables.push(
      monaco.editor.onDidChangeMarkers((uris) => this.handleMarkerChange(uris)),
    );
    // Run once on construction so any already-present markers get filtered immediately.
    this.filterMarkers();
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }

  /** Force a re-scan + re-filter — useful after the markers set changes externally. */
  refresh(): void {
    this.filterMarkers();
  }

  private handleMarkerChange(uris: readonly monaco.Uri[]): void {
    if (this.filtering) return;
    const model = this.editor.getModel();
    if (!model) return;
    if (!uris.some((u) => u.toString() === model.uri.toString())) return;
    this.filterMarkers();
  }

  private filterMarkers(): void {
    if (this.authoring()) return;

    const model = this.editor.getModel();
    if (!model) return;

    const source = model.getValue();
    const lockedLineSet = new Set<number>(
      scanLockedLines(source).map((l) => l.lineIndex + 1 /* 1-based for Monaco */),
    );
    if (lockedLineSet.size === 0) return;

    const allMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
    if (allMarkers.length === 0) return;

    // Group by owner — `setModelMarkers` is keyed by owner.
    const byOwner = new Map<string, monaco.editor.IMarker[]>();
    for (const m of allMarkers) {
      if (!m.owner) continue;
      const list = byOwner.get(m.owner) ?? [];
      list.push(m);
      byOwner.set(m.owner, list);
    }

    this.filtering = true;
    try {
      for (const [owner, markers] of byOwner) {
        const filtered = markers.filter((m) => {
          if (m.severity !== monaco.MarkerSeverity.Error) return true;
          return !lockedLineSet.has(m.startLineNumber);
        });
        if (filtered.length !== markers.length) {
          // Strip the `owner`/`resource` fields — setModelMarkers expects IMarkerData.
          const asMarkerData: monaco.editor.IMarkerData[] = filtered.map((m) => ({
            severity: m.severity,
            code: m.code,
            message: m.message,
            source: m.source,
            startLineNumber: m.startLineNumber,
            startColumn: m.startColumn,
            endLineNumber: m.endLineNumber,
            endColumn: m.endColumn,
            tags: m.tags,
            relatedInformation: m.relatedInformation,
          }));
          monaco.editor.setModelMarkers(model, owner, asMarkerData);
        }
      }
    } finally {
      this.filtering = false;
    }
  }
}
