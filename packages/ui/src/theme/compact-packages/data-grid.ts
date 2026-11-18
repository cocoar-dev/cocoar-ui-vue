/**
 * Compact values of @cocoar/vue-data-grid: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_DATA_GRID_TOKENS: Record<string, string> = {
  '--coar-data-grid-cell-padding-x': '12px',
};

/** Where the theme scope meets `.coar-mobile`. Tree toggles get a full 44px target; the indentation step stays 20px. */
export const COMPACT_DATA_GRID_MOBILE_TOKENS: Record<string, string> = {
  '--coar-data-grid-tree-toggle-size': '44px',
};
