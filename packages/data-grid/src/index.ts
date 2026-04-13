// Builders
export { CoarGridBuilder, type ColumnDefinition, type ColumnPersistenceOptions, type TreeDataConfig, type TreeNodeMeta, type CoarTreeContext, cleanupColumnStates } from './builders';
export { CoarGridColumnBuilder } from './builders';
export { CoarGridColumnFactory } from './builders';

// Cell Renderers
export { TagCellRenderer, IconCellRenderer, DateCellRenderer, TreeCellRenderer } from './cell-renderers';
export type { TagCellRendererConfig, IconCellRendererConfig, DateCellRendererConfig, TreeCellRendererConfig } from './cell-renderers';

// Theme
export { cocoarTheme, createCocoarTheme } from './theme';

// AG Grid type re-exports
export type {
  ColDef,
  GridOptions,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  RowDoubleClickedEvent,
  CellClickedEvent,
  CellDoubleClickedEvent,
  CellContextMenuEvent,
  GridSizeChangedEvent,
  ColumnState,
  GetRowIdFunc,
  RowClassParams,
  ValueFormatterParams,
  ValueGetterParams,
  CellClassParams,
  ICellRendererParams,
  IRowNode,
  PostSortRowsParams,
  GetQuickFilterTextParams,
  RowDragCallback,
  RowDragEndEvent,
} from './models';

// Components & Composable
export { default as CoarDataGrid } from './CoarDataGrid.vue';
export { default as CoarDataGridSearch } from './CoarDataGridSearch.vue';
export { default as CoarDataGridPanel } from './CoarDataGridPanel.vue';
export { useDataGrid } from './useDataGrid';
