/**
 * Compact values of @cocoar/vue-mermaid: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_MERMAID_TOKENS: Record<string, string> = {
  '--coar-mermaid-control-size': '28px',
  '--coar-mermaid-padding': '12px',
  '--coar-mermaid-code-font-size': '13px',
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_MERMAID_MOBILE_TOKENS: Record<string, string> = {
  // The zoom buttons are the only way to zoom on touch (no pinch handling): a full target.
  '--coar-mermaid-control-size': '44px',
};
