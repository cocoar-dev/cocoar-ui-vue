/**
 * Explicit transport contract of compact.css, not a snapshot of every computed
 * CSS property. The contract test reconciles it with that stylesheet. Package
 * profiles re-evaluate their own defaults on the mirrored `.coar-compact` host.
 */
export const COMPACT_APPEARANCE_INPUT_TOKENS = [
  'accent', 'font-body', 'font-title', 'button-radius', 'input-radius', 'card-radius',
].map((role) => `--coar-appearance-${role}`);

export const COMPACT_CONTEXT_TOKENS = [
  ...COMPACT_APPEARANCE_INPUT_TOKENS,
  ...[
    'compact-color-scheme',
    'font-family-body', 'font-family-title',
    'ui-font-size', 'ui-line-height', 'ui-font-weight', 'label-font-weight',
    'field-font-size', 'field-xs-font-size', 'field-s-font-size', 'field-l-font-size',
    'field-xs-default-font-size', 'field-s-default-font-size', 'field-l-default-font-size',
    'field-min-font-size', 'caption-font-size', 'interactive-row-height',
    'panel-padding', 'content-gap', 'control-radius', 'panel-radius',
    'form-label-icon-offset', 'picker-action-size', 'picker-month-height',
    'picker-day-min-height', 'picker-action-opacity', 'picker-context-opacity',
    'picker-panel-radius', 'time-step-size', 'time-cell-height', 'zone-caption-min-offset',
    'choice-row-height', 'checkbox-size', 'checkbox-l-size',
    'checkbox-icon-size', 'checkbox-l-icon-size', 'checkbox-radius',
    'body-base-size', 'body-bold-size', 'body-base-line-height',
    'body-small-base-line-height', 'body-large-size', 'heading-s',
    'component-density', 'field-padding-x', 'field-padding-x-tight',
    'focus-color', 'text-on-bold', 'text-on-brand-primary',
    'button-danger-bg', 'button-danger-bg-hover', 'button-danger-bg-active',
    'background-semantic-error-hover', 'background-semantic-error-active', 'border-semantic-error',
    'surface-input', 'surface-input-disabled', 'surface-accent-secondary', 'border-input', 'border-input-hover',
    'border-neutral', 'text-placeholder',
    'button-radius', 'input-radius', 'tag-radius', 'card-radius', 'menu-radius',
    'popover-radius', 'dropdown-radius', 'dialog-border-radius', 'dialog-padding',
    'dialog-header-gap', 'dialog-close-size', 'sheet-border-radius', 'sheet-padding', 'card-padding',
    'toast-border-radius', 'toast-padding', 'toast-gap', 'navbar-height', 'navbar-padding-x',
    'badge-font-weight', 'popconfirm-title-font-size', 'toast-title-font-size',
    'table-cell-padding', 'tree-checkbox-radius', 'card-outlined-border-color',
    'pane-divider-active-color', 'data-list-surface', 'code-block-border', 'tooltip-padding',
    'scrollbar-handle-bg', 'scrollbar-handle-bg-hover', 'scrollbar-handle-bg-active',
    'breadcrumb-font-size', 'breadcrumb-active-color', 'breadcrumb-link-color',
    'pagination-font-size', 'pagination-active-background', 'pagination-active-color',
    'pagination-hover-background', 'note-bg', 'note-border-color', 'tag-bg', 'tag-border-color',
    'dialog-background', 'toast-background', 'navbar-background', 'navbar-border-color',
    'menu-item-font-family', 'menu-item-font-size', 'menu-item-font-weight',
    'menu-item-line-height', 'menu-heading-font-family', 'menu-heading-font-size',
    'menu-heading-font-weight', 'menu-heading-letter-spacing', 'menu-heading-text-transform',
    'menu-item-padding', 'menu-item-gap', 'menu-heading-padding', 'menu-background',
    'menu-item-color', 'menu-heading-color', 'menu-item-background-hover',
    'menu-item-background-focus', 'menu-item-background-open', 'menu-item-background-active',
    'menu-item-text-active', 'select-option-font-size', 'select-option-padding',
    'select-option-gap', 'select-search-size', 'select-checkbox-indicator',
    'sidebar-background', 'sidebar-border', 'sidebar-header-border', 'sidebar-footer-border',
    'sidebar-header-padding', 'sidebar-icon-size', 'sidebar-item-padding',
    'sidebar-item-gap', 'sidebar-item-radius', 'sidebar-item-hover',
    'sidebar-item-active-color', 'sidebar-item-active-bg', 'scrollbar-thumb',
    'scrollbar-thumb-hover', 'switch-track-width', 'switch-track-height', 'switch-thumb-size',
    'progress-bar-background', 'progress-accent-color', 'progress-success-color',
    'progress-warning-color', 'progress-error-color', 'spinner-color', 'sheet-handle-color',
    'control-min-size', 'control-min-font-size', 'control-min-target-size',
    'control-row-min-height',
  ].map((role) => `--coar-${role}`),
  ...['xs', 's', 'm', 'l'].flatMap((size) =>
    ['height', 'font-size', 'label-font-size', 'scale', 'label-margin']
      .map((role) => `--coar-component-${size}-${role}`)),
  ...['xs', 's', 'm', 'l'].flatMap((size) =>
    [`--coar-control-${size}-height`, `--coar-indicator-${size}-height`]),
  ...['xs', 's', 'm', 'l', 'xl'].map((size) => `--coar-icon-${size}-size`),
  ...['m', 'l'].flatMap((size) =>
    ['track-width', 'track-height', 'thumb-size'].map((role) => `--coar-switch-${size}-${role}`)),
  ...[
    'body-base', 'body-bold', 'body-caption', 'body-footnote',
    'body-small-base', 'body-small-bold',
  ].flatMap((role) => ['family', 'weight'].map((part) => `--coar-${role}-${part}`)),
  ...['body-caption', 'body-footnote', 'body-small-base', 'body-small-bold']
    .map((role) => `--coar-${role}-size`),
  ...[
    'headings-heading', 'headings-subheading',
    'titles-display', 'titles-subtitle', 'titles-title',
  ].flatMap((role) => ['family', 'size', 'weight'].map((part) => `--coar-${role}-${part}`)),
  ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    .map((step) => `--coar-color-accent-${step}`),
  ...['primary', 'secondary', 'tertiary', 'quaternary', 'active', 'disabled']
    .map((role) => `--coar-background-neutral-${role}`),
  ...['text', 'icon'].flatMap((kind) =>
    ['primary', 'secondary', 'tertiary', 'disabled'].map((role) => `--coar-${kind}-neutral-${role}`)),
  ...['primary', 'secondary', 'tertiary', 'quaternary']
    .map((role) => `--coar-border-neutral-${role}`),
  ...['primary', 'hover', 'active', 'secondary', 'tertiary', 'tertiary-active']
    .map((role) => `--coar-background-accent-${role}`),
  ...['text', 'border'].flatMap((kind) =>
    ['primary', 'secondary'].map((role) => `--coar-${kind}-accent-${role}`)),
  '--coar-icon-accent-primary',
  ...['success', 'error', 'warning', 'info'].flatMap((status) => [
    ...['bold', 'subtlest', 'subtle'].map((role) => `--coar-background-semantic-${status}-${role}`),
    ...['text', 'border', 'icon'].flatMap((kind) =>
      ['bold', 'subtle'].map((role) => `--coar-${kind}-semantic-${status}-${role}`)),
  ]),
] as const;
