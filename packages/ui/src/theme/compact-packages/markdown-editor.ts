/**
 * Compact values of @cocoar/vue-markdown-editor: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_MARKDOWN_EDITOR_TOKENS: Record<string, string> = {
  '--coar-markdown-editor-area-padding': '8px 12px',
  '--coar-markdown-editor-source-font-size': '13px',
  '--coar-markdown-editor-source-line-height': '1.5',
  '--coar-markdown-editor-corner-button-size': '28px',
  // Floating toolbar and its heading menu.
  '--coar-markdown-editor-float-padding': '4px',
  '--coar-markdown-editor-float-button-size': '28px',
  '--coar-markdown-editor-float-separator-height': '16px',
  '--coar-markdown-editor-menu-item-padding': '0 10px',
  '--coar-markdown-editor-table-picker-gap': '8px',
  // Image dialog body: fits a narrow sheet instead of forcing 22 rem.
  '--coar-markdown-editor-dialog-gap': '12px',
  '--coar-markdown-editor-dialog-min-width': 'min(22rem, 100%)',
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_MARKDOWN_EDITOR_MOBILE_TOKENS: Record<string, string> = {
  // 16 px keeps iOS from zooming into the focused source textarea.
  '--coar-markdown-editor-source-font-size': 'var(--coar-field-font-size, 16px)',
  '--coar-markdown-editor-corner-button-size': '44px',
  '--coar-markdown-editor-float-button-size': '44px',
  '--coar-markdown-editor-float-separator-height': '24px',
  // The floating toolbar wraps within the viewport instead of growing one 44 px row past it.
  '--coar-markdown-editor-float-wrap': 'wrap',
  '--coar-markdown-editor-float-max-width': 'calc(100vw - 16px)',
  // A finger picks from the size grid: 8 × 28 px + gaps still fits 320 px.
  '--coar-markdown-editor-table-picker-cell-size': '28px',
  '--coar-markdown-editor-table-picker-cell-gap': '4px',
  '--coar-markdown-editor-color-picker-width': '264px',
  '--coar-markdown-editor-color-input-height': '44px',
};
