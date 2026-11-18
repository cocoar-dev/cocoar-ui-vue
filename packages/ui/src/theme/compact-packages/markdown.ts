/**
 * Compact values of @cocoar/vue-markdown and @cocoar/vue-markdown-form: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 *
 * Markdown is document content: reading text, headings and code text have their own
 * roles and do not shrink with the UI text role.
 */
export const COMPACT_MARKDOWN_TOKENS: Record<string, string> = {
  // Reading text.
  '--coar-markdown-font-size': '14px',
  '--coar-markdown-line-height': '1.5',
  // Heading hierarchy: page 24 / section 18 / subsection 16, then body-sized levels.
  // 600 marks hierarchy; nothing is 700.
  '--coar-markdown-h1-font-size': '24px',
  '--coar-markdown-h1-font-weight': '600',
  '--coar-markdown-h1-line-height': '1.25',
  '--coar-markdown-h2-font-size': '18px',
  '--coar-markdown-h2-font-weight': '600',
  '--coar-markdown-h2-line-height': '1.3',
  '--coar-markdown-h3-font-size': '16px',
  '--coar-markdown-h3-font-weight': '600',
  '--coar-markdown-h3-line-height': '1.35',
  '--coar-markdown-h4-font-size': '14px',
  '--coar-markdown-h4-font-weight': '600',
  '--coar-markdown-h4-line-height': '1.4',
  '--coar-markdown-h5-font-size': '13px',
  '--coar-markdown-h5-font-weight': '600',
  '--coar-markdown-h5-line-height': '1.4',
  '--coar-markdown-h6-font-size': '12px',
  '--coar-markdown-h6-font-weight': '600',
  '--coar-markdown-h6-line-height': '1.4',
  // Vertical rhythm on a 4 px grid.
  '--coar-markdown-tight-spacing': '8px',
  '--coar-markdown-block-spacing': '12px',
  '--coar-markdown-section-spacing': '24px',
  '--coar-markdown-block-gap': '12px',
  // Inline code: code text role, a quiet chip instead of bare accent text.
  '--coar-markdown-code-font-family': "'Cascadia Code', Consolas, Monaco, 'Courier New', monospace",
  '--coar-markdown-code-font-size': '0.875em',
  '--coar-markdown-inline-code-padding': '0.1em 0.35em',
  '--coar-markdown-inline-code-radius': '4px',
  // Links: a thin underline set off from the text.
  '--coar-markdown-link-underline-thickness': '1px',
  '--coar-markdown-link-underline-offset': '2px',
  // Tables: data text, sentence-case header without tracking.
  '--coar-markdown-table-font-size': '13px',
  '--coar-markdown-table-line-height': '1.45',
  '--coar-markdown-table-cell-padding': '8px 12px',
  '--coar-markdown-table-header-font-size': '12px',
  '--coar-markdown-table-header-font-weight': '600',
  '--coar-markdown-table-header-transform': 'none',
  '--coar-markdown-table-header-letter-spacing': 'normal',
  // Placeholder for an unregistered embed.
  '--coar-markdown-embed-placeholder-gap': '8px',
  '--coar-markdown-embed-placeholder-padding': '8px 12px',
  // Form: issue notice, filled-in values without 700, error text, `design: 'basic'` controls.
  '--coar-markdown-form-issues-padding': '8px 12px',
  '--coar-markdown-form-value-font-weight': '600',
  '--coar-markdown-form-error-line-height': '1.35',
  '--coar-markdown-form-control-padding': '2px 8px',
};

/**
 * Where the theme scope meets `.coar-mobile`: same hierarchy, one step larger reading
 * and table text, roomier cells for touch reading.
 */
export const COMPACT_MARKDOWN_MOBILE_TOKENS: Record<string, string> = {
  '--coar-markdown-font-size': '15px',
  '--coar-markdown-table-font-size': '14px',
  '--coar-markdown-table-cell-padding': '10px 12px',
  '--coar-markdown-embed-placeholder-padding': '10px 12px',
};
