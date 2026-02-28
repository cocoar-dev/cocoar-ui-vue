// Builders
export { CoarGridBuilder, type ColumnDefinition } from './builders';
export { CoarGridColumnBuilder } from './builders';
export { CoarGridColumnFactory } from './builders';

// Cell Renderers
export { TagCellRenderer, IconCellRenderer, DateCellRenderer } from './cell-renderers';
export type { TagCellRendererConfig, IconCellRendererConfig, DateCellRendererConfig } from './cell-renderers';

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
} from './models';

// Component & Composable
export { default as CoarDataGrid } from './CoarDataGrid.vue';
export { useDataGrid } from './useDataGrid';
