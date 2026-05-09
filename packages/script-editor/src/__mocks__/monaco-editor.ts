import { vi } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// Marker registry — used by the DiagnosticsFilter tests to simulate Monaco's
// global marker storage.
// ────────────────────────────────────────────────────────────────────────────

interface StoredMarker {
  owner: string;
  resource: { toString(): string };
  severity: number;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

const markerStore = new Map<string, Map<string, StoredMarker[]>>();
const markerChangeListeners: Array<(uris: Array<{ toString(): string }>) => void> = [];

function getModelMarkersImpl({ resource }: { resource: { toString(): string } }): StoredMarker[] {
  const byOwner = markerStore.get(resource.toString());
  if (!byOwner) return [];
  const out: StoredMarker[] = [];
  for (const list of byOwner.values()) out.push(...list);
  return out;
}

function setModelMarkersImpl(
  model: { uri: { toString(): string } },
  owner: string,
  markers: Array<Omit<StoredMarker, 'owner' | 'resource'>>,
): void {
  const uri = model.uri.toString();
  let byOwner = markerStore.get(uri);
  if (!byOwner) {
    byOwner = new Map();
    markerStore.set(uri, byOwner);
  }
  byOwner.set(
    owner,
    markers.map((m) => ({ ...m, owner, resource: model.uri })),
  );
  // Fire listeners so DiagnosticsFilter's subscription rerun.
  for (const cb of markerChangeListeners) cb([model.uri]);
}

function onDidChangeMarkersImpl(cb: (uris: Array<{ toString(): string }>) => void) {
  markerChangeListeners.push(cb);
  return {
    dispose: () => {
      const idx = markerChangeListeners.indexOf(cb);
      if (idx >= 0) markerChangeListeners.splice(idx, 1);
    },
  };
}

/** Test helper — clear between tests. */
export function __resetMarkerRegistry(): void {
  markerStore.clear();
  markerChangeListeners.length = 0;
}

/** Test helper — push markers as if a language service produced them. */
export function __pushMarkers(
  uri: { toString(): string },
  owner: string,
  markers: Array<Omit<StoredMarker, 'owner' | 'resource'>>,
): void {
  setModelMarkersImpl({ uri }, owner, markers);
}

// ────────────────────────────────────────────────────────────────────────────
// Monaco API surface
// ────────────────────────────────────────────────────────────────────────────

export const editor = {
  createModel: vi.fn((value: string = '') => {
    const listeners: Array<() => void> = [];
    return {
      dispose: vi.fn(),
      getValue: vi.fn(() => value),
      setValue: vi.fn((next: string) => {
        value = next;
        for (const l of listeners) l();
      }),
      onDidChangeContent: vi.fn((cb: () => void) => {
        listeners.push(cb);
        return { dispose: vi.fn() };
      }),
      uri: { toString: () => 'file:///mock.ts' },
    };
  }),
  create: vi.fn(() => ({
    dispose: vi.fn(),
    setValue: vi.fn(),
    updateOptions: vi.fn(),
    getValue: vi.fn(() => ''),
    focus: vi.fn(),
    setHiddenAreas: vi.fn(),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    onDidFocusEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
    onDidBlurEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
    trigger: vi.fn(),
  })),
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
  setModelLanguage: vi.fn(),
  onDidChangeMarkers: onDidChangeMarkersImpl,
  getModelMarkers: getModelMarkersImpl,
  setModelMarkers: setModelMarkersImpl,
};

// Monaco 0.55 promoted `typescript` to a top-level namespace (the old
// `languages.typescript` is still exported for back-compat — both point at
// the same object). The mock mirrors that: one underlying object exposed
// through both surfaces, so tests asserting on either path see the same fns.
const typescriptNs = {
  ScriptTarget: {
    ES3: 0,
    ES5: 1,
    ES2015: 2,
    ES2016: 3,
    ES2017: 4,
    ES2018: 5,
    ES2019: 6,
    ES2020: 7,
    ES2021: 8,
    ES2022: 9,
    ES2023: 10,
    ES2024: 11,
    ESNext: 99,
  },
  typescriptDefaults: {
    addExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
    setDiagnosticsOptions: vi.fn(),
    getDiagnosticsOptions: vi.fn(() => ({ diagnosticCodesToIgnore: [] })),
    setCompilerOptions: vi.fn(),
  },
  javascriptDefaults: {
    addExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
    setDiagnosticsOptions: vi.fn(),
    getDiagnosticsOptions: vi.fn(() => ({ diagnosticCodesToIgnore: [] })),
    setCompilerOptions: vi.fn(),
  },
};

export const typescript = typescriptNs;

export const languages = {
  typescript: typescriptNs,
};

export const Uri = {
  parse: (value: string) => ({ toString: () => value }),
};

export class Range {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number,
  ) {}
}

export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};
