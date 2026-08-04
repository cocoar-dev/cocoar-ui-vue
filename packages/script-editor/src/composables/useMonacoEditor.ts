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

/**
 * Languages the editor recognises. Three groups:
 *
 *   - **TS/JS/JSON** — full language-service treatment: type checking,
 *     IntelliSense, `extraLibs` for ambient declarations, script-mode
 *     diagnostic suppression, JSON schema hooks.
 *   - **Markup / config / shell** (yaml, css, html, xml, sql, shell,
 *     dockerfile, ini, plaintext) — Monaco's built-in tokenizers; bracket
 *     matching + find/replace + multi-cursor without a language service.
 *   - **Other source code** (csharp, cpp, java, python, go, rust, …) —
 *     same as markup: syntax-highlighting only via Monaco's bundled
 *     grammars. No language service — `extraLibs` is ignored.
 *
 * Adding more languages from Monaco's bundle: extend the union, add a file
 * extension to `LANGUAGE_EXTENSIONS` (or omit — the lookup falls back to
 * the language name as the extension).
 */
export type CoarScriptEditorLanguage =
  // TS / JS / JSON (with language service)
  | 'typescript'
  | 'javascript'
  | 'json'
  // Plain + markup + config + shell (tokenizer-only)
  | 'plaintext'
  | 'yaml'
  | 'css'
  | 'html'
  | 'xml'
  | 'sql'
  | 'shell'
  | 'dockerfile'
  | 'ini'
  | 'markdown'
  // Source code (tokenizer-only)
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'java'
  | 'python'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'lua'
  | 'perl'
  | 'dart'
  | 'fsharp'
  | 'vb'
  | 'r'
  | 'powershell'
  | 'objective-c'
  | 'solidity'
  | 'protobuf'
  | 'graphql'
  // Templating
  | 'razor'
  | 'pug'
  | 'handlebars'
  | 'twig';
export type CoarScriptEditorVariant = 'editor' | 'inline';

/**
 * Filename extension used when constructing the Monaco model URI. Monaco
 * picks up file-based heuristics from the URI even when we explicitly set
 * `language`, so a `.ts` URI keeps TS path-mapping etc. working. For
 * languages without a meaningful extension difference (or none distinct
 * from the language name) the lookup falls back to the language name.
 */
const LANGUAGE_EXTENSIONS: Partial<Record<CoarScriptEditorLanguage, string>> = {
  typescript: 'ts',
  javascript: 'js',
  json: 'json',
  plaintext: 'txt',
  yaml: 'yaml',
  shell: 'sh',
  markdown: 'md',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  python: 'py',
  ruby: 'rb',
  rust: 'rs',
  kotlin: 'kt',
  fsharp: 'fs',
  powershell: 'ps1',
  'objective-c': 'm',
  solidity: 'sol',
  protobuf: 'proto',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  // Remaining languages (css, html, xml, sql, java, go, swift, scala, lua,
  // perl, dart, vb, r, php, ini, razor, pug, handlebars, twig) fall back
  // to the language name — Monaco accepts that as the extension.
};
function extensionFor(lang: CoarScriptEditorLanguage): string {
  return LANGUAGE_EXTENSIONS[lang] ?? lang;
}

/**
 * Diagnostic codes suppressed when `scriptMode` is true. These are structural wrapper
 * artefacts — errors that fire because a script body is not a full module/program
 * (top-level return/await, isolatedModules complaint, unreachable-after-return, unused
 * comma-LHS). Name-resolution errors like 2304 `Cannot find name` are deliberately NOT
 * in this set: they are legitimate semantic errors that must stay visible so undeclared
 * identifiers surface as squiggles instead of silently falling back to `any`.
 */
const SCRIPT_MODE_DIAGNOSTIC_CODES: readonly number[] = [1375, 2695, 1108, 7027, 1208];

/**
 * Monaco's default lib set is `es5 + dom + webworker.importscripts + scripthost` —
 * surfacing ~5500 browser APIs in IntelliSense that don't exist in Cocoar's script runtime
 * (a .NET Jint engine with no DOM, no Web Workers, no WSH). Autocompleting `document.*`,
 * `fetch`, `localStorage`, `WScript`, etc. would lure users into writing code that crashes
 * at execution time.
 *
 * We force Monaco's TS/JS defaults to `lib: ['es2024']` so only APIs that Jint actually
 * provides show up. Project-specific globals (e.g. host-provided `fetch`, `require`,
 * `exit`, `NewObject`) are layered on top via `useExtraLibs` / `addExtraLib` by the
 * consumer — opt-in and explicit.
 *
 * Applied once per page (Monaco's options are module-global); subsequent calls are no-ops.
 * Consumers who want different libs can call `monaco.languages.typescript.*Defaults.
 * setCompilerOptions(...)` themselves before mounting an editor — their override then wins.
 */
const COAR_MONACO_LIB: readonly string[] = ['es2024'];
let compilerLibsConfigured = false;

function configureCompilerLibs(): void {
  if (compilerLibsConfigured) return;
  compilerLibsConfigured = true;
  const target = monaco.typescript.ScriptTarget.ES2020;
  // `ES2024` is the semantic target, but Monaco's bundled TS lib may not expose that
  // enum value depending on version — fall back to the highest available.
  const ts = monaco.typescript.typescriptDefaults;
  const js = monaco.typescript.javascriptDefaults;
  const scriptTarget = monaco.typescript.ScriptTarget as unknown as Record<string, number>;
  const resolvedTarget =
    scriptTarget.ES2024 ?? scriptTarget.ES2023 ?? scriptTarget.ES2022
      ?? scriptTarget.ES2021 ?? scriptTarget.ES2020 ?? target;
  const options = {
    target: resolvedTarget,
    lib: [...COAR_MONACO_LIB],
    allowNonTsExtensions: true,
  };
  ts.setCompilerOptions(options);
  // Monaco otherwise treats JavaScript as syntax-only input: completion works,
  // but undeclared identifiers such as `username2` do not produce semantic
  // diagnostics. Page Code relies on those diagnostics to catch stale or
  // non-destructured element names before the sandbox executes them.
  js.setCompilerOptions({ ...options, allowJs: true, checkJs: true });
}

/**
 * Font settings mirrored from `CoarCodeBlock`'s `.coar-code` rule so code rendered in
 * either component has the same typographic feel. Keep in sync with
 * `packages/ui/src/components/code-block/CoarCodeBlock.vue` — if the design token
 * `--coar-component-s-font-size` or the code font stack changes, update both places.
 * Monaco does not read CSS vars from the host, so the values are passed as plain JS.
 *
 * Cascadia Code is bundled via `@cocoar/vue-ui/fonts`. Consumers that import the Cocoar
 * font stylesheet get the ligature-enabled version automatically; otherwise Monaco falls
 * back to Consolas / Monaco / Courier New.
 */
const COAR_EDITOR_FONT_FAMILY =
  "'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace";
const COAR_EDITOR_FONT_SIZE = 13;
const COAR_EDITOR_LINE_HEIGHT = 1.5;
const COAR_EDITOR_FONT_LIGATURES = true;

/**
 * Per-variant Monaco option presets. Both presets set the same keys so switching between
 * them via `updateOptions` restores each option's intended value instead of leaving stale
 * state from the previous variant.
 *
 * `lineNumbers`, `lineNumbersMinChars`, and `lineDecorationsWidth` are intentionally NOT
 * part of this preset — they're resolved together by `resolveLineNumbersOptions` so the
 * `lineNumbers` prop (when set) can override the variant default without the preset
 * clobbering it back.
 */
const VARIANT_OPTIONS: Record<
  CoarScriptEditorVariant,
  monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions
> = {
  editor: {
    glyphMargin: true,
    folding: true,
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
    glyphMargin: false,
    folding: false,
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

/**
 * Resolve line-numbers state and the adjacent space so "line numbers off" does NOT glue
 * the text to the left border. Monaco's `lineDecorationsWidth` reserves a pixel column
 * for decorations (breakpoints, folding icons) — it stays visible even with no decorations
 * present, so we repurpose it as the left-padding when line numbers are hidden. When line
 * numbers are visible the column still renders, separating the gutter from the text.
 *
 * `props.lineNumbers === undefined` (the default) defers to the variant: line numbers on
 * for `'editor'`, off for `'inline'`.
 */
function resolveLineNumbersOptions(
  variant: CoarScriptEditorVariant,
  lineNumbers: boolean | undefined,
): Pick<
  monaco.editor.IEditorOptions,
  'lineNumbers' | 'lineNumbersMinChars' | 'lineDecorationsWidth'
> {
  const enabled = lineNumbers ?? variant === 'editor';
  return enabled
    ? { lineNumbers: 'on', lineNumbersMinChars: 3, lineDecorationsWidth: 10 }
    : { lineNumbers: 'off', lineNumbersMinChars: 0, lineDecorationsWidth: 12 };
}

export interface UseMonacoEditorOptions {
  host: Ref<HTMLElement | null>;
  initialValue: () => string;
  language: () => CoarScriptEditorLanguage;
  readonly: () => boolean;
  minimap: () => boolean;
  theme: () => CoarScriptEditorTheme;
  variant?: () => CoarScriptEditorVariant;
  /**
   * Explicitly toggle line numbers. When undefined, defers to the variant default
   * (`'editor'` → on, `'inline'` → off). When line numbers are off, a small decoration
   * column still renders as a visual left-margin so the text does not touch the border.
   */
  lineNumbers?: () => boolean | undefined;
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
      ? monaco.typescript.javascriptDefaults
      : monaco.typescript.typescriptDefaults;
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
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: Array.from(existing),
  });
}

export function useMonacoEditor(options: UseMonacoEditorOptions): UseMonacoEditorResult {
  configureCompilerLibs();
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
        `file:///coar-script-editor/${randomId()}.${extensionFor(language)}`,
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
      fontFamily: COAR_EDITOR_FONT_FAMILY,
      fontSize: COAR_EDITOR_FONT_SIZE,
      lineHeight: COAR_EDITOR_LINE_HEIGHT,
      fontLigatures: COAR_EDITOR_FONT_LIGATURES,
      tabSize: 2,
      fixedOverflowWidgets: true,
      ...VARIANT_OPTIONS[resolveVariant()],
      ...resolveLineNumbersOptions(resolveVariant(), options.lineNumbers?.()),
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
      (variant) =>
        editorRef.value?.updateOptions({
          ...VARIANT_OPTIONS[variant],
          ...resolveLineNumbersOptions(variant, options.lineNumbers?.()),
        }),
    );
  }

  if (options.lineNumbers) {
    watch(
      () => options.lineNumbers!(),
      (ln) =>
        editorRef.value?.updateOptions(resolveLineNumbersOptions(resolveVariant(), ln)),
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
