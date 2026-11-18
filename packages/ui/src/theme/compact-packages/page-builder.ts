/**
 * Compact values of @cocoar/vue-page-builder: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_PAGE_BUILDER_TOKENS: Record<string, string> = {
  '--coar-page-builder-panel-heading-font-size': '16px',
  // Emphasis without blanket bold: 600 only where hierarchy needs it.
  '--coar-page-builder-emphasis-font-weight': '600',
  // Authored content (canvas, preview frame) keeps the builder's historical text,
  // whatever UI size the theme gives the chrome.
  '--coar-page-builder-authored-font-size': '13px',
  '--coar-page-builder-authored-font-weight': '400',
  // Category identity is not the host brand: four independently customizable hues,
  // with readable dark variants instead of dim light inks.
  '--coar-page-builder-palette-container-color': 'light-dark(#52749a, #8caacc)',
  '--coar-page-builder-palette-element-color': 'light-dark(#5f6b72, #9aa8b1)',
  '--coar-page-builder-palette-composition-color': 'light-dark(#806b52, #baa083)',
  '--coar-page-builder-palette-field-color': 'light-dark(#725f88, #b29bcb)',
  // Outline rows: the four action targets are wider than the legacy hover overlay,
  // so the tray sits in the flex row, which may wrap and grow.
  '--coar-page-builder-tree-row-height': 'auto',
  '--coar-page-builder-tree-row-wrap': 'wrap',
  '--coar-page-builder-tree-label-min-width': '8ch',
  '--coar-page-builder-tree-actions-position': 'static',
  '--coar-page-builder-tree-actions-transform': 'none',
  '--coar-page-builder-tree-actions-empty-display': 'none',
  '--coar-page-builder-tree-actions-focus-opacity': '1',
  '--coar-page-builder-tree-issue-reserve': '0',
  // The accent ink already carries hierarchy; fading it again fails text contrast
  // on the selected surface.
  '--coar-page-builder-tree-selected-key-opacity': '1',
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_PAGE_BUILDER_MOBILE_TOKENS: Record<string, string> = {};
