/**
 * The four scenes (light/dark × desktop/mobile = 16 comparisons) accepted by the
 * maintainer on 2026-11-18. Build the expected image from the actual no-theme page
 * plus ONLY these fixed deltas. Never read the theme under test to build it.
 *
 * This is not a mask: every resulting pixel is still compared exactly. Apart
 * from the accepted 12px tree counters, typography and geometry stay unchanged.
 * Existing Docker stories, screenshots and comparison settings are untouched.
 */
export function approvedEnterpriseReference(scene: string, scheme: string): string {
  const dark = scheme === 'dark';
  const border = dark ? '#71717a' : '#d6d6d6';
  const icon = dark ? '#e4e4e7' : '#5a5a5a';
  switch (scene) {
    case 'data-grid':
      return `.ag-theme-cocoar { --ag-checkbox-unchecked-border-color: ${border}; }`;
    case 'data-grid-tree':
      return `.ag-theme-cocoar {
        --coar-data-grid-search-highlight-color: #1183cd;
      }
      .coar-tree-cell__count { font-size: 12px; }`;
    case 'data-grid-states': {
      const shadow = dark
        ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
        : '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.08)';
      return `.ag-theme-cocoar {
        --ag-input-border: solid 1px ${border};
        --ag-icon-color: ${icon};
        --ag-browser-color-scheme: ${scheme};
        --ag-popup-shadow: ${shadow};
      }
      [data-scene-action="column-menu"] { color-scheme: ${scheme}; }`;
    }
    case 'composition':
      return `.ag-theme-cocoar {
        --ag-input-border: solid 1px ${border};
        --ag-icon-color: ${icon};
      }`;
    default:
      return '';
  }
}
