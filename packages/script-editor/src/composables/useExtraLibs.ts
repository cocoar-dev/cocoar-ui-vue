import * as monaco from 'monaco-editor';
import { onBeforeUnmount, watch } from 'vue';
import type { CoarScriptEditorLanguage } from './useMonacoEditor';

export interface CoarScriptEditorExtraLib {
  /** TypeScript declaration source (`.d.ts` contents). */
  content: string;
  /**
   * Virtual file path the declarations live under. **Must start with `file:///`** —
   * Monaco's TypeScript language service keys entries on the path and silently ignores
   * non-`file://` URIs, so a bare `'types/foo.d.ts'` will compile without error but
   * produce no IntelliSense.
   *
   * Examples: `'file:///types/order.d.ts'`, `'file:///node_modules/foo/index.d.ts'`.
   */
  filePath: string;
}

export interface UseExtraLibsOptions {
  language: () => CoarScriptEditorLanguage;
  libs: () => readonly CoarScriptEditorExtraLib[];
}

export function useExtraLibs(options: UseExtraLibsOptions): void {
  const disposables: monaco.IDisposable[] = [];

  const warnedPaths = new Set<string>();
  const warnedNonTs = new Set<string>();

  function apply() {
    while (disposables.length) {
      disposables.pop()?.dispose();
    }
    const language = options.language();

    // `extraLibs` targets Monaco's TypeScript/JavaScript services only —
    // nothing in Monaco's other language APIs (JSON, YAML, CSS, HTML, XML,
    // SQL, shell, plaintext) consumes them. We bail early and surface a
    // one-shot warning per language so consumers passing libs to a non-TS
    // editor find out before debugging silently-missing IntelliSense.
    if (language !== 'typescript' && language !== 'javascript') {
      if (options.libs().length > 0 && !warnedNonTs.has(language)) {
        warnedNonTs.add(language);
        const hint =
          language === 'json'
            ? 'Use monaco.languages.json.jsonDefaults.setDiagnosticsOptions for JSON schema configuration.'
            : `Monaco has no extra-libs concept for '${language}'. Remove the libs prop or switch to a TS/JS-backed editor.`;
        console.warn(
          `[coar-script-editor] extraLibs has entries but language is '${language}' — extraLibs are ignored. ${hint}`,
        );
      }
      return;
    }

    const defaults =
      language === 'javascript'
        ? monaco.typescript.javascriptDefaults
        : monaco.typescript.typescriptDefaults;
    for (const lib of options.libs()) {
      // Dev-mode warning: Monaco silently ignores extraLibs whose path doesn't use the
      // `file:///` scheme, and the result is "no compile error, no IntelliSense either" —
      // notoriously hard to debug. Surface it once per path at registration.
      if (!lib.filePath.startsWith('file:///') && !warnedPaths.has(lib.filePath)) {
        warnedPaths.add(lib.filePath);
        console.warn(
          `[coar-script-editor] extraLib filePath '${lib.filePath}' does not start with ` +
            `'file:///' — Monaco will register it but IntelliSense may not pick it up. ` +
            `Prefix with 'file:///' for reliable resolution.`,
        );
      }
      disposables.push(defaults.addExtraLib(lib.content, lib.filePath));
    }
  }

  // Shallow watch on the libs reference — deep traversal is pointless here because libs
  // are immutable `.d.ts` blobs, and deep-tracking the strings costs for no benefit.
  watch(
    [() => options.language(), () => options.libs()],
    () => apply(),
    { immediate: true },
  );

  onBeforeUnmount(() => {
    while (disposables.length) {
      disposables.pop()?.dispose();
    }
  });
}
