// Composables
export {
  useVirtualList,
  useDragDrop,
  detectDragEngine,
  setCoarDragImageFromElement,
  setCoarDragImageFromHtml,
} from './composables';
export type {
  UseVirtualListOptions,
  UseVirtualListReturn,
  VirtualRow,
  UseDragDropOptions,
  UseDragDropReturn,
  DropPayload,
  DragEngine,
  DragPoint,
  PointerDragOptions,
  CoarDragImageOptions,
} from './composables';

// Layout
export { CoarFormField } from './components/form-field';
export type {
  CoarFormFieldProps,
  CoarFormFieldRule,
  CoarFormFieldRulePassMode,
  CoarFormFieldRuleFailMode,
  CoarFormFieldLayout,
  CoarFormFieldLabelPosition,
  FormFieldProvided,
} from './components/form-field';
export { FORM_FIELD_INJECTION_KEY } from './components/form-field';

// Transitions
export { CoarFade, CoarSlide, CoarScale, CoarCollapse } from './components/transitions';

// Components
export { CoarThemeScope } from './components/theme-scope';
export type { CoarTheme, CoarThemeMode } from './components/theme-scope';

export { CoarButton } from './components/button';
export type { CoarButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { CoarLink } from './components/link';
export type { CoarLinkProps, CoarLinkSize, CoarLinkVariant } from './components/link';

export { CoarIcon } from './components/icon';
export type {
  CoarIconProps,
  CoarIconSize,
  CoarIconSource,
  CoarIconSourceEntry,
  CoarIconRegisteredSource,
  CoarIconPluginOptions,
  CoreIconName,
} from './components/icon';
export {
  CoarIconService,
  CoarIconMapSource,
  CoarHttpIconSource,
  COAR_ICON_SERVICE_KEY,
  COAR_BUILTIN_ICON_SOURCE_KEY,
  PRESET_SIZES,
  CoarIconPlugin,
  createCoarIconService,
  CORE_ICONS,
} from './components/icon';

export { CoarDivider } from './components/divider';
export type { CoarDividerProps, DividerAlign, DividerVariant } from './components/divider';

export { CoarSpinner } from './components/spinner';
export type { CoarSpinnerProps, CoarSpinnerSize } from './components/spinner';

export { CoarBadge } from './components/badge';
export type { CoarBadgeProps, BadgeVariant, BadgeSize } from './components/badge';

export { CoarNote } from './components/note';
export type { CoarNoteProps, NoteVariant, NotePadding } from './components/note';

export { CoarNotice } from './components/notice';
export type { CoarNoticeProps, NoticePlacement, NoticeVariant } from './components/notice';

export { CoarProgressBar } from './components/progress-bar';
export type {
  CoarProgressBarProps,
  ProgressBarVariant,
  ProgressBarSize,
} from './components/progress-bar';

export { CoarCard } from './components/card';
export type { CoarCardProps, CardVariant, CardPadding } from './components/card';

export { CoarCodeBlock } from './components/code-block';
export type { CoarCodeBlockProps, CodeBlockVariant } from './components/code-block';

export { CoarTag } from './components/tag';
export type { CoarTagProps, TagVariant, TagSize } from './components/tag';

export { CoarAvatar } from './components/avatar';
export type { CoarAvatarProps, AvatarSize, AvatarShape } from './components/avatar';

export { CoarTable } from './components/table';
export type { CoarTableProps, CoarTableVariant } from './components/table';

// Form Controls
export { CoarTextInput } from './components/text-input';
export type { CoarTextInputProps, CoarTextInputSize } from './components/text-input';
export { CoarOtpInput } from './components/otp-input';
export type { CoarOtpInputProps, CoarOtpInputSize, CoarOtpInputType } from './components/otp-input';

export { CoarPasswordInput } from './components/password-input';
export type { CoarPasswordInputProps, CoarPasswordInputSize } from './components/password-input';

export { CoarNumberInput } from './components/number-input';
export type {
  CoarNumberInputProps,
  CoarNumberInputSize,
  CoarNumberInputStepperButtons,
  NumberFormatConfig,
} from './components/number-input';

export { CoarCheckbox } from './components/checkbox';
export type { CoarCheckboxProps, CoarCheckboxSize } from './components/checkbox';
export { CoarCheckboxGroup, CHECKBOX_GROUP_INJECTION_KEY } from './components/checkbox-group';
export type {
  CoarCheckboxGroupProps,
  CheckboxGroupModel,
  CheckboxGroupModelType,
  CheckboxGroupOrientation,
  CheckboxGroupContext,
} from './components/checkbox-group';

export {
  CoarRadioGroup,
  CoarRadioButton,
  RADIO_GROUP_INJECTION_KEY,
} from './components/radio-group';
export type {
  CoarRadioGroupProps,
  RadioGroupOrientation,
  RadioGroupSize,
  CoarRadioButtonProps,
} from './components/radio-group';

export { CoarSwitch } from './components/switch';
export type { CoarSwitchProps, CoarSwitchSize } from './components/switch';

export { CoarSelect, CoarMultiSelect, CoarTagSelect } from './components/select';
export type { CoarSelectOption, CoarSelectSize, CoarSelectAppearance } from './components/select';

export { CoarListbox } from './components/listbox';
export type {
  CoarListboxProps,
  CoarListboxOption,
  CoarListboxSide,
  CoarListboxItemComponents,
  CoarListboxItemComponentProps,
  CoarListboxItemApi,
  CoarListboxSortGroups,
  CoarListboxSortOptions,
  CoarListboxSearchField,
  CoarListboxExposed,
} from './components/listbox';

export { CoarDualListbox } from './components/dual-listbox';
export type { CoarDualListboxProps } from './components/dual-listbox';

// Overlay System
export {
  CoarOverlayHost,
  CoarOverlayOutlet,
  CoarOverlayPlugin,
  useOverlay,
  useOverlayParent,
  getOverlayService,
  OVERLAY_SERVICE_KEY,
  OVERLAY_PARENT_KEY,
  createOverlayService,
} from './components/overlay';
export {
  tooltipPreset,
  modalPreset,
  menuPreset,
  selectPreset,
  hoverMenuPreset,
  dialogPreset,
  popconfirmPreset,
  popoverPreset,
  datepickerPreset,
  subFlyoutPreset,
  contextMenuPreset,
  sidebarFlyoutPreset,
  OVERLAY_DEFAULTS,
  resolveOverlaySpec,
} from './components/overlay';
export {
  computeOverlayCoordinates,
  getViewportRect,
  getAnchorRect,
  getContainerRect,
  getScrollParents,
} from './components/overlay';
export type {
  Placement,
  OverlaySpec,
  OverlayRef,
  OverlayService,
  OverlayInstance,
  OverlayContent,
  OverlayOpenOptions,
} from './components/overlay';
export type {
  AnchorSpec,
  PositionSpec,
  SizeSpec,
  BackdropSpec,
  ScrollSpec,
  DismissSpec,
  FocusSpec,
  A11ySpec,
  AttachmentSpec,
  ResolvedOverlaySpec,
} from './components/overlay';
export type { ViewportRect, Rect, OverlaySize, OverlayCoordinates } from './components/overlay';

// Tooltip
export { vTooltip } from './components/tooltip/vTooltip';
export type { TooltipOptions, TooltipPlacement } from './components/tooltip/vTooltip';

// Popconfirm
export { CoarPopconfirm, CoarPopconfirmPanel } from './components/popconfirm';
export type { PopconfirmPlacement, PopconfirmVariant } from './components/popconfirm';

// Toast
export { useToast, CoarToastContainer, CoarToastItem } from './components/toast';
export { createToastService, getToastService, TOAST_SERVICE_KEY } from './components/toast';
export type { ToastService } from './components/toast';
export type { ToastConfig, ToastRef, ToastVariant, ToastPosition } from './components/toast';

// Popover
export { CoarPopover } from './components/popover';
export type { PopoverMode } from './components/popover';

// Dialog
export { useDialog, CoarDialogShell } from './components/dialog';
export type { DialogConfig, DialogRef, DialogSize, ConfirmOptions } from './components/dialog';

// Menu
export {
  CoarMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarSubExpand,
  CoarSubFlyout,
  CoarSubmenuItem, // deprecated alias
  CoarContextMenu,
  useContextMenu,
  MenuCascade,
  provideMenuCascade,
  useMenuCascade,
  provideMenuClose,
  useMenuClose,
} from './components/menu';
export type {
  MenuItemClickEvent,
  MenuAimPoint,
  MenuAimDirection,
  MenuAimConfig,
  ContextMenuContext,
} from './components/menu';

// Tabs
export { CoarTabGroup, CoarTab } from './components/tabs';

// Tree
export {
  CoarTree,
  CoarTreeNodeLabel,
  COAR_TREE_DRAG_MIME,
  COAR_TREE_RENAME_KEY,
  COAR_TREE_ROW_ID_KEY,
  DEFAULT_TREE_LABELS,
  useTree,
  TreeBuilder,
} from './components/tree';
export type {
  CoarTreeCreateEvent,
  CoarTreeCreateKind,
  CoarTreeDataDropEvent,
  CoarTreeDensity,
  CoarTreeDraftSlotProps,
  CoarTreeDropPosition,
  CoarTreeFilesDropEvent,
  CoarTreeFilterMode,
  CoarTreeLabels,
  CoarTreeLoadChildrenContext,
  CoarTreeLoadErrorEvent,
  CoarTreeNodeMoveEvent,
  CoarTreeNodeSlotProps,
  CoarTreeRenameContext,
  CoarTreeRenameEvent,
  CoarTreeSelectEvent,
  CoarTreeSelectionMode,
  CoarTreeStartCreateOptions,
  CoarTreeMenuItem,
  CoarTreeMenuEntry,
  CoarTreeVirtualizeProp,
  CoarTreeVirtualOptions,
  TreeApi,
  TreeBuilderState,
} from './components/tree';

// Data List (virtualized, sortable, searchable record list with a free item template)
export {
  CoarDataList,
  useDataList,
  DataListBuilder,
  useDataListModel,
  createValueComparator,
  normalizeSearchText,
  searchTerms,
  matchesSearchTerms,
  DATA_LIST_HIGHLIGHT_NAME,
} from './components/data-list';
export type {
  CoarDataListProps,
  CoarDataListDensity,
  CoarDataListDragEngine,
  CoarDataListDropEvent,
  CoarDataListDropPosition,
  CoarDataListDropTarget,
  CoarDataListFilesDropEvent,
  CoarDataListItemsRemoveEvent,
  CoarDataListEntry,
  CoarDataListGroupSlotProps,
  CoarDataListItemEvent,
  CoarDataListItemSlotProps,
  CoarDataListKey,
  CoarDataListLayout,
  CoarDataListMenuEntry,
  CoarDataListMenuItem,
  CoarDataListSearchBy,
  CoarDataListSelection,
  CoarDataListSelectionMode,
  CoarDataListSort,
  CoarDataListSortDirection,
  CoarDataListSortGroups,
  CoarDataListSortOption,
  DataListApi,
  DataListBuilderState,
  UseDataListModelOptions,
  UseDataListModelReturn,
  ValueComparator,
} from './components/data-list';

// Panel Layout (resizable workbench + split-pane primitive)
export { CoarSplitPane, CoarPanelLayout } from './components/panel-layout';
export type { SplitDirection, SplitSide } from './components/panel-layout';

// Segmented Control
export { CoarSegmentedControl } from './components/segmented-control';
export type {
  CoarSegmentedControlOption,
  CoarSegmentedControlProps,
  SegmentedControlSize,
} from './components/segmented-control';

// Wizard
export { CoarWizard } from './components/wizard';
export type { CoarWizardProps, CoarWizardStep, WizardIndicatorPosition } from './components/wizard';

// Breadcrumb
export { CoarBreadcrumb, CoarBreadcrumbItem } from './components/breadcrumb';
export type { CoarBreadcrumbSize } from './components/breadcrumb';

// Pagination
export { CoarPagination } from './components/pagination';
export type { PaginationPageItem } from './components/pagination';

// Sidebar
export {
  CoarSidebar,
  CoarSidebarItem,
  CoarSidebarGroup,
  CoarSidebarHeading,
  CoarSidebarDivider,
  CoarSidebarSpacer,
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_ICON_SIZE_KEY,
} from './components/sidebar';

// Navbar
export { CoarNavbar } from './components/navbar';

// Date/Time
export { CoarTimePicker } from './components/date-time/time-picker';
export type { CoarTimePickerSize } from './components/date-time/time-picker';
export { CoarScrollableCalendar } from './components/date-time/scrollable-calendar';
export { CoarMonthList } from './components/date-time/month-list';
export { CoarPlainDatePicker } from './components/date-time/plain-date-picker';
export type { CoarPlainDatePickerSize } from './components/date-time/plain-date-picker';
export { CoarPlainDateTimePicker } from './components/date-time/plain-date-time-picker';
export type { CoarPlainDateTimePickerSize } from './components/date-time/plain-date-time-picker';
export { CoarZonedDateTimePicker } from './components/date-time/zoned-date-time-picker';
export type { CoarZonedDateTimePickerSize } from './components/date-time/zoned-date-time-picker';
export { CoarZonedDateTimeOrDatePicker } from './components/date-time/zoned-date-time-or-date-picker';
export type { CoarZonedDateTimeOrDatePickerSize } from './components/date-time/zoned-date-time-or-date-picker';
export { CoarPlainDateTimeOrDatePicker } from './components/date-time/plain-date-time-or-date-picker';
export type { CoarPlainDateTimeOrDatePickerSize } from './components/date-time/plain-date-time-or-date-picker';
export { CoarPlainDateView } from './components/date-time/plain-date-view';
export type {
  CoarPlainDateViewProps,
  CoarPlainDateViewSize,
} from './components/date-time/plain-date-view';
export { CoarPlainDateTimeView } from './components/date-time/plain-date-time-view';
export type {
  CoarPlainDateTimeViewProps,
  CoarPlainDateTimeViewSize,
} from './components/date-time/plain-date-time-view';
export { CoarZonedDateTimeView } from './components/date-time/zoned-date-time-view';
export type {
  CoarZonedDateTimeViewProps,
  CoarZonedDateTimeViewSize,
} from './components/date-time/zoned-date-time-view';
export type {
  DateFormatConfig,
  CoarDateMarker,
  CoarTimeValue,
  CoarTimePeriod,
  TimeFormatConfig,
  CoarCalendarGridCell,
} from './components/date-time/_shared/types';
export {
  COAR_DEFAULT_TIME_FORMAT,
  COAR_DATE_FORMAT_TO_MASKITO_MODE,
} from './components/date-time/_shared/types';

// Scrollbar
export { vScrollbar, getScrollbarInstance } from './components/scrollbar';
export type {
  ScrollbarOptions,
  ScrollbarTheme,
  ScrollbarAutoHide,
  ScrollbarOverflow,
} from './components/scrollbar';
