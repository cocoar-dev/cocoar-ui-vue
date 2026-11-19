/**
 * The shipped coar-light/coar-dark Monaco colors, including the inherited
 * widget and diagnostic colors of the lockfile's Monaco version. Explicit
 * pairs also preserve a forced editor scheme inside the opposite page scheme.
 */
export const ENTERPRISE_SCRIPT_EDITOR_TOKENS: Record<string, string> = {
  '--coar-theme-script-editor-radius': 'var(--coar-radius-xs, 4px)',
  '--coar-theme-script-editor-editor-background': 'light-dark(#ffffff, #1a1a1a)',
  '--coar-theme-script-editor-editor-foreground': 'light-dark(#1a1a1a, #f3f4f6)',
  '--coar-theme-script-editor-editor-line-number-foreground': 'light-dark(#9ca3af, #6b7280)',
  '--coar-theme-script-editor-editor-line-number-active-foreground': 'light-dark(#1a1a1a, #f3f4f6)',
  '--coar-theme-script-editor-editor-selection-background': 'light-dark(#dbeafe, #1e40af)',
  '--coar-theme-script-editor-editor-inactive-selection-background': 'light-dark(#e5e7eb, #374151)',
  '--coar-theme-script-editor-editor-cursor-foreground': 'light-dark(#1a1a1a, #f3f4f6)',
  '--coar-theme-script-editor-editor-line-highlight-background': 'light-dark(#f3f4f6, #262626)',
  '--coar-theme-script-editor-editor-indent-guide-background': 'light-dark(#e5e7eb, #374151)',
  '--coar-theme-script-editor-editor-gutter-background': 'light-dark(#ffffff, #1a1a1a)',
  '--coar-theme-script-editor-editor-widget-background': 'light-dark(#f3f3f3, #252526)',
  '--coar-theme-script-editor-editor-widget-foreground': 'light-dark(#616161, #cccccc)',
  '--coar-theme-script-editor-editor-widget-border': 'light-dark(#c8c8c8, #454545)',
  '--coar-theme-script-editor-editor-suggest-widget-background': 'light-dark(#f3f3f3, #252526)',
  '--coar-theme-script-editor-editor-suggest-widget-foreground': 'light-dark(#1a1a1a, #f3f4f6)',
  '--coar-theme-script-editor-editor-suggest-widget-border': 'light-dark(#c8c8c8, #454545)',
  '--coar-theme-script-editor-editor-suggest-widget-selected-background': 'light-dark(#0060c0, #04395e)',
  '--coar-theme-script-editor-editor-suggest-widget-selected-foreground': '#ffffff',
  '--coar-theme-script-editor-editor-hover-widget-background': 'light-dark(#f3f3f3, #252526)',
  '--coar-theme-script-editor-editor-hover-widget-foreground': 'light-dark(#616161, #cccccc)',
  '--coar-theme-script-editor-editor-hover-widget-border': 'light-dark(#c8c8c8, #454545)',
  '--coar-theme-script-editor-editor-error-foreground': 'light-dark(#e51400, #f14c4c)',
  '--coar-theme-script-editor-editor-warning-foreground': 'light-dark(#bf8803, #cca700)',
  '--coar-theme-script-editor-editor-info-foreground': 'light-dark(#1a85ff, #3794ff)',
  '--coar-theme-script-editor-focus-border': 'light-dark(#0090f1, #007fd4)',
};
