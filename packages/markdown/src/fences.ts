/**
 * Fenced-code-block renderer registry.
 *
 * A fenced code block with an info string — ` ```mermaid `, ` ```dot `, … —
 * parses (in `markdown-core`) to a `codeBlock` node whose `language` attr is the
 * info string. By default {@link DefaultCodeBlock} renders every code block with
 * `CoarCodeBlock` (syntax-highlighted source). This registry is the **open**
 * lookup that lets a consumer swap in a *rich* renderer for a specific language
 * — e.g. render ` ```mermaid ` as an actual diagram — without the markdown
 * packages ever depending on the diagram engine.
 *
 * It is the exact counterpart of the custom-embed registry ({@link EmbedRegistry}
 * in `./embeds`), for the other diagram-shaped case: where the block's *body IS
 * the content* (a multi-line DSL authored in place) rather than a single-line
 * `:::key{props}` reference. Diagrams live here; the map lives there.
 *
 * The markdown text stays portable either way: a code fence whose language has
 * no registered renderer simply falls back to a readable, syntax-highlighted
 * code block — nothing breaks on a consumer that hasn't opted in (e.g. a strict
 * CommonMark renderer, or a viewer with no diagram engine installed).
 *
 * Resolution: the injected {@link MARKDOWN_FENCE_RENDERERS_KEY} value, set by
 * `<CoarMarkdown>`'s `fenceRenderers` prop or an app-wide `app.provide`.
 */
import type { Component, InjectionKey } from 'vue';

/**
 * Props every registered fence renderer receives.
 *
 * - `code` — the raw text inside the fence (never HTML-interpolated by the
 *   markdown layer; the renderer owns how it treats the string).
 * - `language` — the fence info string, verbatim from the source (e.g.
 *   `'mermaid'`). Handy when one component is registered under several keys.
 */
export interface FenceRendererProps {
  code: string;
  language: string;
}

/**
 * Map of fence language → the Vue component that renders it. Keys are matched
 * case-insensitively (see {@link resolveFenceRenderer}); register with a
 * lowercase key by convention (`{ mermaid: … }`).
 */
export type FenceRegistry = Record<string, Component>;

/** Vue inject key. Set via `<CoarMarkdown :fenceRenderers>` or `app.provide`. */
export const MARKDOWN_FENCE_RENDERERS_KEY: InjectionKey<FenceRegistry> = Symbol.for(
  'coar:markdown-fence-renderers',
);

/**
 * Look up the renderer for a fence language, tolerating an undefined registry.
 * The lookup is case-insensitive so ` ```mermaid `, ` ```Mermaid ` and
 * ` ```MERMAID ` all resolve to a registry entry keyed `mermaid`. Returns
 * `undefined` when nothing is registered — the caller then falls back to the
 * plain code-block presentation.
 */
export function resolveFenceRenderer(
  registry: FenceRegistry | undefined,
  language: string,
): Component | undefined {
  if (!registry) return undefined;
  return registry[language] ?? registry[language.toLowerCase()];
}
