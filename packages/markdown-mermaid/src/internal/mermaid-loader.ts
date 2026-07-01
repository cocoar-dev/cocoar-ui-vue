/**
 * Lazy, one-time loader for the Mermaid engine.
 *
 * Mermaid is heavy (it pulls in d3, dagre, …) and DOM-bound, so it is *never*
 * imported eagerly: the first diagram that mounts triggers a dynamic
 * `import('mermaid')`, which the consumer's bundler splits into its own chunk.
 * Subsequent diagrams reuse the same resolved instance.
 *
 * Mermaid is initialized exactly once, with `startOnLoad: false` (we drive
 * rendering imperatively) and `securityLevel: 'strict'` (author diagram text is
 * untrusted — strict mode sanitizes HTML in labels and blocks click bindings).
 * The theme config is captured at that first initialization; a reactive
 * theme-swap at runtime is a deliberate follow-up, not part of this slice.
 */

/** The slice of Mermaid's API this package uses. */
export interface MermaidApi {
  render(
    id: string,
    text: string,
  ): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

/** Init config passed to Mermaid — kept loose to stay version-tolerant. */
export type MermaidInitConfig = Record<string, unknown>;

let loadPromise: Promise<MermaidApi> | null = null;

/**
 * Resolve the initialized Mermaid instance, importing + initializing it on the
 * first call. `configFactory` runs once, on that first call, and must read any
 * runtime theme tokens it needs then (it is not re-consulted afterward).
 */
export function loadMermaid(configFactory: () => MermaidInitConfig): Promise<MermaidApi> {
  if (loadPromise) return loadPromise;

  loadPromise = import('mermaid')
    .then((mod) => {
      const mermaid = ((mod as { default?: unknown }).default ?? mod) as MermaidApi & {
        initialize(config: MermaidInitConfig): void;
      };
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        ...configFactory(),
      });
      return mermaid;
    })
    .catch((err) => {
      // Don't cache a rejected import — allow a later retry (e.g. transient
      // network failure loading the chunk).
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

// Serializes render() calls across ALL diagram instances. `mermaid.render` is
// NOT concurrency-safe — it mutates shared parser + DOM state keyed by a global
// id, so two diagrams rendering at once (the common case: several on one page,
// all mounting together) corrupt each other (one blanks, another shows Mermaid's
// error graphic). Chaining every render behind the previous one fixes it; a
// failed render doesn't break the chain for the next.
let renderChain: Promise<unknown> = Promise.resolve();
let renderSeq = 0;

/**
 * Render one diagram to an SVG string, serialized against every other render.
 * Loads + initializes Mermaid on first use (via {@link loadMermaid}); rejects if
 * the source is invalid so the caller can show a fallback.
 */
export function renderMermaid(
  configFactory: () => MermaidInitConfig,
  code: string,
): Promise<string> {
  const run = async (): Promise<string> => {
    const mermaid = await loadMermaid(configFactory);
    const id = `coar-mermaid-${renderSeq++}`;
    try {
      const { svg } = await mermaid.render(id, code);
      return svg;
    } finally {
      // On a parse error Mermaid leaves an orphan render/error element attached
      // to <body> (its "Syntax error" bomb). Remove anything left under our id
      // so a broken diagram never drops a stray graphic into the page. Harmless
      // on success — the elements won't exist.
      if (typeof document !== 'undefined') {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
    }
  };
  // Queue behind whatever is currently rendering, regardless of its outcome.
  const result = renderChain.then(run, run);
  renderChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Test-only hook: forget the cached instance so a fresh load can be asserted. */
export function resetMermaidForTests(): void {
  loadPromise = null;
}
