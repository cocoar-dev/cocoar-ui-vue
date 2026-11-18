/**
 * Compact values of @cocoar/vue-document-viewer: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_DOCUMENT_VIEWER_TOKENS: Record<string, string> = {
  // Independent size roles of the viewer chrome.
  '--coar-document-viewer-header-height': '40px',
  '--coar-document-viewer-target-size': '28px',
  '--coar-document-viewer-input-height': '28px',
  // Outline entries are rows: the title is centred in the interactive-row height.
  '--coar-document-viewer-outline-link-display': 'flex',
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_DOCUMENT_VIEWER_MOBILE_TOKENS: Record<string, string> = {
  '--coar-document-viewer-header-height': '48px',
  '--coar-document-viewer-target-size': '44px',
  // Touch fields stand on the shared field target floor of the scope.
  '--coar-document-viewer-input-height': 'var(--coar-control-min-size, 44px)',
  // Color swatches stay below 44px so a palette fits a popover row; 32px plus the 6px gap
  // keeps them well apart (WCAG 2.5.8).
  '--coar-document-viewer-swatch-size': '32px',
  // How far the touch target of a comment pin reaches beyond the pin itself.
  '--coar-document-viewer-pin-target-outset': '11px',
};
