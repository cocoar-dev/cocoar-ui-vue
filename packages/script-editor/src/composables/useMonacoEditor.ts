import * as monaco from 'monaco-editor';
import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import {
  ensureCoarThemes,
  resolveTheme,
  watchAutoTheme,
  type CoarScriptEditorTheme,
} from '../theme';

/**
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS, localhost, file://).
 * A consumer app embedding the editor over plain HTTP would crash at mount without a
 * fallback. The fallback doesn't need to be cryptographic — it's purely a tie-breaker so
 * two editors on the same page don't collide on model URI.
 */
function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through — some sandboxed contexts throw on the call itself
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type CoarScriptEditorLanguage = 'typescript' | 'javascript' | 'json';
export type CoarScriptEditorVariant = 'editor' | 'inline';

const LANGUAGE_EXTENSIONS: Record<CoarScriptEditorLanguage, string> = {
  typescript: 'ts',
  javascript: 'js',
  json: 'json',
};

/**
 * Diagnostic codes suppressed when `scriptMode` is true. These are the TS errors that
 * fire when a .ts file is not a full program but a "script body" — top-level return,
 * await, export-in-non-module, implicit any, etc. Matches the set used by the
 * in-house script editor prototypes.
 */
const SCRIPT_MODE_DIAGNOSTIC_CODES: readonly number[] = [1375, 2695, 1108, 7027, 2304, 1208];

/**
 * Per-variant Monaco option presets. Both presets set the same keys so switching between
 * them via `updateOptions` restores each option's intended value instead of leaving stale
 * state from the previous variant.
 */
const VARIANT_OPTIONS: Record<
  CoarScriptEditorVariant,
  monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions
> = {
  editor: {
    lineNumbers: 'on',
    glyphMargin: true,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'line',
    contextmenu: true,
    overviewRulerLanes: 3,
    overviewRulerBorder: true,
    hideCursorInOverviewRuler: false,
    scrollbar: { vertical: 'auto', horizontal: 'auto' },
    padding: { top: 0, bottom: 0 },
    wordWrap: 'off',
  },
  inline: {
    lineNumbers: 'off',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    renderLineHighlight: 'none',
    contextmenu: false,
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    scrollbar: { vertical: 'auto', horizontal: 'hidden', verticalScrollbarSize: 8 },
    padding: { top: 8, bottom: 8 },
    wordWrap: 'on',
  },
};

export interface UseMonacoEditorOptions {
  host: Ref<HTMLElement | null>;
  initialValue: () => string;
  language: () => CoarScriptEditorLanguage;
  readonly: () => boolean;
  minimap: () => boolean;
  theme: () => CoarScriptEditorTheme;
  variant?: () => CoarScriptEditorVariant;
  /**
   * Hidden + locked prefix prepended to the model content for per-editor type context.
   * `setHiddenAreas` hides it from view, and an internal guard rejects any edit whose
   * change offset falls inside the preamble range. Emitted value is the user-script
   * portion only — preamble never round-trips through `modelValue`.
   */
  preamble?: () => string;
  /**
   * When true, sets `diagnosticCodesToIgnore` on Monaco's TS/JS defaults to suppress the
   * errors that normally fire on "script body" code (top-level return/await/export, etc).
   * **Global side-effect** — affects all TS/JS editors on the page. Consumers needing
   * granular control should manage `monaco.languages.typescript.typescriptDefaults`
   * directly.
   */
  scriptMode?: () => boolean;
  autofocus?: () => boolean;
  /**
   * Optional override for where Monaco renders overflow widgets (IntelliSense popups,
   * hover, parameter hints). When the editor is mounted inside a modal/overlay with its
   * own stacking context, the default body-level container often ends up behind the modal
   * or in the wrong stacking context. Pass an element from inside the modal to put the
   * widgets there. Returning `null` means "use Monaco's default body-level container".
   */
  overflowWidgetsDomNode?: () => HTMLElement | null;
  onContentChange: (value: string) => void;
  onFocused?: () => void;
  onBlurred?: () => void;
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export interface UseMonacoEditorResult {
  editor: Readonly<Ref<monaco.editor.IStandaloneCodeEditor | null>>;
  model: Readonly<Ref<monaco.editor.ITextModel | null>>;
  /**
   * Replace the editor value without re-emitting a change event. Used for external v-model updates.
   */
  setValue: (value: string) => void;
  /**
   * Temporarily suppresses `onContentChange` callbacks during the given mutation. Useful when
   * higher-level logic (e.g. constrained regions) rolls back an illegal edit and does not want
   * the rollback to echo back to the host.
   */
  withSuppressedChange: <T>(fn: () => T) => T;
}

function preamblePrefix(preamble: string): string {
  return preamble ? `${preamble}\n` : '';
}

function preambleLineCount(preamble: string): number {
  return preamble ? preamble.split('\n').length : 0;
}

function prependPreamble(value: string, preamble: string): string {
  return preamble ? preamblePrefix(preamble) + value : value;
}

function stripPreamble(modelContent: string, preamble: string): string {
  if (!preamble) return modelContent;
  const prefix = preamblePrefix(preamble);
  return modelContent.startsWith(prefix) ? modelContent.slice(prefix.length) : modelContent;
}

function updateHiddenAreas(
  editor: monaco.editor.IStandaloneCodeEditor,
  preamble: string,
): void {
  const lines = preambleLineCount(preamble);
  const hidden = lines === 0 ? [] : [new monaco.Range(1, 1, lines, Number.MAX_SAFE_INTEGER)];
  // `setHiddenAreas` is marked @internal in Monaco's public types but has been stable for
  // years and is the only mechanism to visually hide lines without modifying the model.
  (editor as unknown as { setHiddenAreas: (ranges: monaco.IRange[]) => void }).setHiddenAreas(
    hidden,
  );
}

function applyScriptMode(language: CoarScriptEditorLanguage, enabled: boolean): void {
  if (!enabled) return;
  if (language !== 'typescript' && language !== 'javascript') return;
  const defaults =
    language === 'javascript'
      ? monaco.languages.typescript.javascriptDefaults
      : monaco.languages.typescript.typescriptDefaults;
  const current =
    typeof (defaults as { getDiagnosticsOptions?: () => { diagnosticCodesToIgnore?: number[] } })
      .getDiagnosticsOptions === 'function'
      ? (defaults as { getDiagnosticsOptions: () => { diagnosticCodesToIgnore?: number[] } })
          .getDiagnosticsOptions()
      : {};
  const existing = new Set<number>(current.diagnosticCodesToIgnore ?? []);
  for (const code of SCRIPT_MODE_DIAGNOSTIC_CODES) existing.add(code);
  defaults.setDiagnosticsOptions({
    ...current,
    diagnosticCodesToIgnore: Array.from(existing),
  });
}

export function useMonacoEditor(options: UseMonacoEditorOptions): UseMonacoEditorResult {
  const editorRef = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = shallowRef<monaco.editor.ITextModel | null>(null);
  let suppressChange = false;
  let contentDisposable: monaco.IDisposable | null = null;
  let focusDisposable: monaco.IDisposable | null = null;
  let blurDisposable: monaco.IDisposable | null = null;
  let disposeAutoWatcher: (() => void) | null = null;
  let mounted = false;

  function resolveVariant(): CoarScriptEditorVariant {
    return options.variant?.() ?? 'editor';
  }

  function setupAutoThemeIfNeeded() {
    disposeAutoWatcher?.();
    disposeAutoWatcher = null;
    if (options.theme() === 'auto') {
      disposeAutoWatcher = watchAutoTheme(() => {
        if (editorRef.value) monaco.editor.setTheme(resolveTheme(options.theme()));
      });
    }
  }

  function mount() {
    if (mounted || !options.host.value) return;
    mounted = true;
    ensureCoarThemes(monaco);

    const language = options.language();
    const preamble = options.preamble?.() ?? '';
    applyScriptMode(language, options.scriptMode?.() ?? false);

    // Use `file:///` scheme so Monaco's language services actually analyse the model.
    // With `inmemory://` they silently skip, so diagnostics + cross-reference with
    // extraLibs/schemas never kick in.
    const model = monaco.editor.createModel(
      prependPreamble(options.initialValue(), preamble),
      language,
      monaco.Uri.parse(
        `file:///coar-script-editor/${randomId()}.${LANGUAGE_EXTENSIONS[language]}`,
      ),
    );
    modelRef.value = model;

    // Consumer may override where IntelliSense / hover / parameter-hint widgets render.
    // Otherwise `fixedOverflowWidgets: true` is the safe default — widgets use `position:
    // fixed` and resolve against the viewport. (Cocoar's overlay system uses `top`/`left`
    // positioning rather than `transform`, so there's no containing-block trap in modals.)
    const overflowHost = options.overflowWidgetsDomNode?.() ?? null;

    const editor = monaco.editor.create(options.host.value, {
      model,
      theme: resolveTheme(options.theme()),
      readOnly: options.readonly(),
      minimap: { enabled: options.minimap() },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
      tabSize: 2,
      fixedOverflowWidgets: true,
      ...VARIANT_OPTIONS[resolveVariant()],
      ...(overflowHost ? { overflowWidgetsDomNode: overflowHost } : {}),
    });
    editorRef.value = editor;

    updateHiddenAreas(editor, preamble);

    // If the initial theme is 'auto', start watching the environment so the Monaco theme
    // follows a later `.dark-mode` toggle on <html>/<body> or an OS-level change.
    setupAutoThemeIfNeeded();

    // Coalesce change events within the same microtask so we emit once per synchronous
    // burst instead of once per intermediate state. This matters specifically when the
    // constrained-mode `ChangeGuard` rolls back an illegal edit via `editor.trigger('undo')`:
    // without coalescing, the consumer's v-model briefly sees the illegal value before
    // the rollback emit. With coalescing, the microtask reads `getValue()` after the
    // rollback has settled, so only the final state is emitted.
    let emitPending = false;
    contentDisposable = editor.onDidChangeModelContent((event) => {
      // Preamble protection: if any edit touches the hidden prefix range, undo and skip
      // the emit. Runs before coalescing so the undo settles before the microtask reads.
      const currentPreamble = options.preamble?.() ?? '';
      if (currentPreamble && !event.isFlush && !event.isUndoing) {
        const prefixLen = preamblePrefix(currentPreamble).length;
        const hitsPreamble = event.changes.some((change) => change.rangeOffset < prefixLen);
        if (hitsPreamble) {
          editor.trigger('coar-script-editor-preamble', 'undo', null);
          return;
        }
      }

      if (suppressChange) return;
      if (emitPending) return;
      emitPending = true;
      queueMicrotask(() => {
        emitPending = false;
        if (!editorRef.value) return;
        const raw = editor.getValue();
        options.onContentChange(stripPreamble(raw, options.preamble?.() ?? ''));
      });
    });

    if (options.onFocused) {
      focusDisposable = editor.onDidFocusEditorWidget(() => options.onFocused?.());
    }
    if (options.onBlurred) {
      blurDisposable = editor.onDidBlurEditorWidget(() => options.onBlurred?.());
    }

    if (options.autofocus?.()) {
      // Defer to microtask so focus happens after Vue has settled the initial render —
      // calling it synchronously inside mount() races with the browser's own focus
      // management when the editor host has just been attached to the DOM.
      queueMicrotask(() => editorRef.value?.focus());
    }

    options.onEditorReady?.(editor);
  }

  // Mount as soon as the host element is available. `host` is a template ref that becomes
  // populated after the first render, so we watch for it rather than using onMounted.
  watch(
    options.host,
    (el) => {
      if (el) mount();
    },
    { immediate: true, flush: 'post' },
  );

  onBeforeUnmount(() => {
    disposeAutoWatcher?.();
    disposeAutoWatcher = null;
    contentDisposable?.dispose();
    contentDisposable = null;
    focusDisposable?.dispose();
    focusDisposable = null;
    blurDisposable?.dispose();
    blurDisposable = null;
    editorRef.value?.dispose();
    modelRef.value?.dispose();
    editorRef.value = null;
    modelRef.value = null;
    mounted = false;
  });

  function setValue(value: string) {
    const editor = editorRef.value;
    if (!editor) return;
    const preamble = options.preamble?.() ?? '';
    const wrapped = prependPreamble(value, preamble);
    if (editor.getValue() === wrapped) return;
    suppressChange = true;
    try {
      editor.setValue(wrapped);
      updateHiddenAreas(editor, preamble);
    } finally {
      suppressChange = false;
    }
  }

  function withSuppressedChange<T>(fn: () => T): T {
    const prev = suppressChange;
    suppressChange = true;
    try {
      return fn();
    } finally {
      suppressChange = prev;
    }
  }

  // Reactive option bindings — language, readonly, minimap, theme all propagate through
  // Monaco's own API without needing a remount.
  watch(
    () => options.language(),
    (language) => {
      const model = modelRef.value;
      if (model) monaco.editor.setModelLanguage(model, language);
      applyScriptMode(language, options.scriptMode?.() ?? false);
    },
  );

  watch(
    () => options.readonly(),
    (readonly) => editorRef.value?.updateOptions({ readOnly: readonly }),
  );

  watch(
    () => options.minimap(),
    (enabled) => editorRef.value?.updateOptions({ minimap: { enabled } }),
  );

  if (options.variant) {
    watch(
      () => resolveVariant(),
      (variant) => editorRef.value?.updateOptions(VARIANT_OPTIONS[variant]),
    );
  }

  if (options.scriptMode) {
    watch(
      () => options.scriptMode!(),
      (enabled) => applyScriptMode(options.language(), enabled),
    );
  }

  if (options.preamble) {
    watch(
      () => options.preamble!(),
      (nextPreamble, prevPreamble) => {
        const editor = editorRef.value;
        if (!editor) return;
        const raw = editor.getValue();
        const userValue = stripPreamble(raw, prevPreamble ?? '');
        const wrapped = prependPreamble(userValue, nextPreamble);
        suppressChange = true;
        try {
          editor.setValue(wrapped);
          updateHiddenAreas(editor, nextPreamble);
        } finally {
          suppressChange = false;
        }
      },
    );
  }

  // Theme wiring. Two signals feed into what Monaco renders:
  //   1. The `theme` prop itself ('auto' | 'light' | 'dark').
  //   2. When prop === 'auto', the environment: `.dark-mode` class on html/body,
  //      `data-theme` attribute, and the OS `prefers-color-scheme` media query. Any of
  //      those changing must push a fresh `setTheme` call.
  // Initial theme is applied by `editor.create({ theme })` in mount(); these watchers
  // cover subsequent changes only.
  watch(
    () => options.theme(),
    (theme) => {
      if (editorRef.value) monaco.editor.setTheme(resolveTheme(theme));
      setupAutoThemeIfNeeded();
    },
  );

  return {
    editor: editorRef,
    model: modelRef,
    setValue,
    withSuppressedChange,
  };
}
