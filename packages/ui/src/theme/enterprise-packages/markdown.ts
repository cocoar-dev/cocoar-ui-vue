/**
 * Default document presentation. Package inputs take precedence over the common
 * UI roles without replacing the package's locally evaluated private derivation.
 * Compact leaves these inputs unset and keeps its existing common-role fallback.
 */
export const ENTERPRISE_MARKDOWN_TOKENS: Record<string, string> = {
  '--coar-theme-markdown-box-radius': 'var(--coar-radius-xs)',
  '--coar-theme-markdown-inline-code-background': 'transparent',
  '--coar-theme-markdown-inline-code-color': 'var(--coar-text-accent-secondary)',
  '--coar-theme-markdown-table-header-color': 'var(--coar-text-neutral-primary)',
  '--coar-theme-markdown-frontmatter-color': 'var(--coar-color-gray-400, #c0c0c0)',
  '--coar-theme-markdown-embed-placeholder-font-size': '13px',

  '--coar-theme-markdown-editor-writing-font-size': 'var(--coar-body-base-size)',
  '--coar-theme-markdown-editor-menu-font-size': '13px',
  '--coar-theme-markdown-editor-caption-font-size': '12px',
  '--coar-theme-markdown-editor-label-font-weight': '500',
  '--coar-theme-markdown-editor-table-picker-label-font-size': '12px',
  '--coar-theme-markdown-editor-table-picker-label-font-weight': '600',
  '--coar-theme-markdown-editor-table-picker-hint-font-size': '11px',
  '--coar-theme-markdown-editor-selection-outline-color': 'var(--coar-border-accent, #2563eb)',

  // The original form has fixed light colors in both color schemes.
  '--coar-theme-markdown-form-issues-radius': 'var(--coar-radius-m, 6px)',
  '--coar-theme-markdown-form-issues-background': 'var(--coar-color-danger-50, #fef3f2)',
  '--coar-theme-markdown-form-issues-color': 'var(--coar-color-danger-800, #7a271a)',
  '--coar-theme-markdown-form-issues-font-size': '0.85rem',
  '--coar-theme-markdown-form-block-border': '#abc0c7',
  '--coar-theme-markdown-form-block-radius': '3px 10px 3px 10px',
  '--coar-theme-markdown-form-block-background': '#fbfdfd',
  '--coar-theme-markdown-form-focus-border': '#326b8c',
  '--coar-theme-markdown-form-focus-ring': '0 0 0 3px rgba(50, 107, 140, 0.12)',
  '--coar-theme-markdown-form-underline': '#a5b3b8',
  '--coar-theme-markdown-form-value-color': '#1c3c4b',
  '--coar-theme-markdown-form-empty-color': '#9aa5aa',
  '--coar-theme-markdown-form-error-color': 'var(--coar-color-danger-700, #b42318)',
  '--coar-theme-markdown-form-error-border': 'var(--coar-color-danger-500, #b42318)',
  '--coar-theme-markdown-form-error-ring': '0 0 0 2px rgba(180, 35, 24, 0.1)',
  '--coar-theme-markdown-form-error-font-size': '0.7rem',
  '--coar-theme-markdown-form-caption-font-size': '0.78rem',
  '--coar-theme-markdown-form-control-height': '27px',
  '--coar-theme-markdown-form-control-border': '#aebbc0',
  '--coar-theme-markdown-form-control-radius': '3px',
  '--coar-theme-markdown-form-control-background': '#fff',
  '--coar-theme-markdown-form-control-color': '#25353d',
  '--coar-theme-markdown-form-control-font-size': '12px',
  '--coar-theme-markdown-form-control-color-scheme': 'light',
};
