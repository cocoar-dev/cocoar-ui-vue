import { beforeEach, describe, expect, it } from 'vitest';
import * as monacoMock from '../__mocks__/monaco-editor';
import { DiagnosticsFilter } from './DiagnosticsFilter';

// We drive the real DiagnosticsFilter against the shared monaco mock, which emulates a
// tiny global marker registry + onDidChangeMarkers event. If this file diverges from the
// real Monaco surface, the filter implementation would catch it.

type FakeModel = {
  uri: { toString(): string };
  getValue: () => string;
};

type FakeEditor = {
  getModel: () => FakeModel | null;
};

function makeEditor(source: string, uri = 'file:///test.ts'): { editor: FakeEditor; model: FakeModel } {
  const model: FakeModel = {
    uri: { toString: () => uri },
    getValue: () => source,
  };
  const editor: FakeEditor = { getModel: () => model };
  return { editor, model };
}

describe('DiagnosticsFilter — integration with marker registry', () => {
  beforeEach(() => {
    monacoMock.__resetMarkerRegistry();
  });

  it('removes error markers that fall on a locked line', () => {
    const { editor, model } = makeEditor(
      'function f() { // @locked\n  body;\n} // @locked\n',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => false);

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'on locked' },
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 5, message: 'on free' },
    ]);

    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toHaveLength(1);
    expect(after[0].startLineNumber).toBe(2);
  });

  it('keeps warning-severity markers even on locked lines', () => {
    const { editor, model } = makeEditor('x // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => false);

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Warning, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2, message: 'warn' },
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2, message: 'err' },
    ]);

    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toHaveLength(1);
    expect(after[0].severity).toBe(monacoMock.MarkerSeverity.Warning);
  });

  it('stands down when authoring is true (markers pass through unfiltered)', () => {
    const { editor, model } = makeEditor('x // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => true);

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'on locked' },
    ]);

    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toHaveLength(1);
  });

  it('filters per owner independently', () => {
    const { editor, model } = makeEditor('x // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => false);

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'ts err' },
    ]);
    monacoMock.__pushMarkers(model.uri, 'eslint', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'lint err' },
    ]);

    // Both owners' errors on line 1 should be gone.
    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toEqual([]);
  });

  it('ignores marker-change events for other models', () => {
    const { editor, model } = makeEditor('x // @locked', 'file:///ours.ts');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => false);

    const otherUri = { toString: () => 'file:///other.ts' };
    monacoMock.__pushMarkers(otherUri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'not ours' },
    ]);

    const otherAfter = monacoMock.editor.getModelMarkers({ resource: otherUri });
    expect(otherAfter).toHaveLength(1);
    expect(otherAfter[0].message).toBe('not ours');
  });

  it('dispose unsubscribes from marker changes', () => {
    const { editor, model } = makeEditor('x // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter = new DiagnosticsFilter(editor as any, () => false);
    filter.dispose();

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'after dispose' },
    ]);

    // After dispose the filter no longer runs, so the error remains.
    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toHaveLength(1);
  });

  it('does not infinitely recurse when its own setModelMarkers re-fires the event', () => {
    const { editor, model } = makeEditor('x // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new DiagnosticsFilter(editor as any, () => false);

    // Track how many times the filter calls setModelMarkers by spying on the registry.
    // The mock's setModelMarkers dispatches onDidChangeMarkers every time, so without the
    // `filtering` re-entrancy flag the filter would loop: set -> event -> filter -> set -> ...
    let setCount = 0;
    const originalSet = monacoMock.editor.setModelMarkers;
    monacoMock.editor.setModelMarkers = ((m: unknown, o: string, markers: unknown) => {
      setCount++;
      return originalSet(m as { uri: { toString(): string } }, o, markers as Parameters<typeof originalSet>[2]);
    }) as typeof originalSet;

    try {
      monacoMock.__pushMarkers(model.uri, 'typescript', [
        { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'loop-me' },
      ]);
    } finally {
      monacoMock.editor.setModelMarkers = originalSet;
    }

    // `__pushMarkers` itself calls setModelMarkers once. The filter then calls it once more
    // to install the filtered list. Anything beyond 2 means we looped.
    expect(setCount).toBeLessThanOrEqual(2);
  });

  it('refresh() re-filters the current marker set', () => {
    const { editor, model } = makeEditor('initial // @locked');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter = new DiagnosticsFilter(editor as any, () => false);

    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'on locked' },
    ]);

    // Initial filter removes it.
    expect(monacoMock.editor.getModelMarkers({ resource: model.uri })).toHaveLength(0);

    // After a model-content change that would un-lock the line, the filter's internal
    // scan is out of date — but a refresh() call should recompute.
    model.getValue = () => 'no-more-marker';
    filter.refresh();

    // Now the previous error marker is gone (already removed), so there's still nothing.
    // Push a new error on line 1; it should survive since line 1 is no longer locked.
    monacoMock.__pushMarkers(model.uri, 'typescript', [
      { severity: monacoMock.MarkerSeverity.Error, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5, message: 'fresh' },
    ]);
    const after = monacoMock.editor.getModelMarkers({ resource: model.uri });
    expect(after).toHaveLength(1);
  });
});
