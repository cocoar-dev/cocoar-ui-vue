/** Shared types for the panel-layout family (`CoarSplitPane` + `CoarPanelLayout`). */

/**
 * Pane arrangement. `'row'` lays the two panes side by side with a vertical
 * divider (left / right); `'column'` stacks them with a horizontal divider
 * (top / bottom). Mirrors flexbox `flex-direction`.
 */
export type SplitDirection = 'row' | 'column';

/**
 * Which pane carries the controlled `size`. The other pane flexes to fill the
 * remaining space. For a left sidebar use `'first'`; for a right sidebar or a
 * bottom panel use `'second'`.
 */
export type SplitSide = 'first' | 'second';
