/**
 * Compact values of @cocoar/vue-script-editor: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_SCRIPT_EDITOR_TOKENS: Record<string, string> = {
  // The placeholder overlays Monaco's first line: same code font as Monaco (the
  // default lists Fira Code first, which Monaco does not use).
  '--coar-script-editor-placeholder-font-family':
    "'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace",
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_SCRIPT_EDITOR_MOBILE_TOKENS: Record<string, string> = {};
