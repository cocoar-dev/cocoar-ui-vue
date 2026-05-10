// Builders
export { CoarGridBuilder, type ColumnDefinition, type ColumnPersistenceOptions, type TreeDataConfig, type TreeNodeMeta, type CoarTreeContext, cleanupColumnStates } from './builders';
export { CoarGridColumnBuilder } from './builders';
export { CoarGridColumnFactory } from './builders';
export { CoarGridWrapperColumnBuilder } from './builders';

// Cell Renderers
export {
  TagCellRenderer, IconCellRenderer, DateCellRenderer, TreeCellRenderer, WrapperCellRenderer,
  CoarCheckboxCellRenderer, CoarTextCellEditor, CoarNumberCellEditor,
  CoarSelectCellRenderer, CoarSelectCellEditor,
} from './cell-renderers';
export type {
  TagCellRendererConfig, IconCellRendererConfig, DateCellRendererConfig, TreeCellRendererConfig,
  CheckboxCellRendererConfig, TextCellEditorConfig, NumberCellEditorConfig, SelectCellEditorConfig,
} from './cell-renderers';
export type {
  WrapperSlotConfig,
  WrapperSlotItem,
  WrapperIconSlotConfig,
  WrapperComponentSlotConfig,
  WrapperTextSlotConfig,
  WrapperCellRendererConfig,
  WrapperSlotAccessor,
} from './cell-renderers';

// Configurators
export {
  CheckboxColumnConfigurator, TextColumnConfigurator, NumberColumnConfigurator,
  SelectColumnConfigurator,
} from './configurators';

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
