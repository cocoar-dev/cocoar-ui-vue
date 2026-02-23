// Components
export { CoarButton } from './components/button';
export type { CoarButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { CoarIcon } from './components/icon';
export type { CoarIconProps, CoarIconSize, CoarIconSource, CoarIconSourceEntry, CoarIconRegisteredSource, CoarIconPluginOptions, CoreIconName } from './components/icon';
export { CoarIconService, CoarIconMapSource, CoarHttpIconSource, COAR_ICON_SERVICE_KEY, COAR_BUILTIN_ICON_SOURCE_KEY, PRESET_SIZES, CoarIconPlugin, createCoarIconService, CORE_ICONS } from './components/icon';

export { CoarLabel } from './components/label';
export type { CoarLabelProps, CoarLabelSize } from './components/label';

export { CoarDivider } from './components/divider';
export type { CoarDividerProps, DividerAlign, DividerVariant } from './components/divider';

export { CoarSpinner } from './components/spinner';
export type { CoarSpinnerProps, CoarSpinnerSize } from './components/spinner';

export { CoarBadge } from './components/badge';
export type { CoarBadgeProps, BadgeVariant, BadgeSize } from './components/badge';

export { CoarNote } from './components/note';
export type { CoarNoteProps, NoteVariant, NotePadding } from './components/note';

export { CoarProgressBar } from './components/progress-bar';
export type { CoarProgressBarProps, ProgressBarVariant, ProgressBarSize } from './components/progress-bar';

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

export { CoarPasswordInput } from './components/password-input';
export type { CoarPasswordInputProps, CoarPasswordInputSize } from './components/password-input';

export { CoarNumberInput } from './components/number-input';
export type { CoarNumberInputProps, CoarNumberInputSize, CoarNumberInputStepperButtons, NumberFormatConfig } from './components/number-input';

export { CoarCheckbox } from './components/checkbox';
export type { CoarCheckboxProps, CoarCheckboxSize } from './components/checkbox';

export { CoarRadioGroup, CoarRadioButton, RADIO_GROUP_INJECTION_KEY } from './components/radio-group';
export type { CoarRadioGroupProps, RadioGroupOrientation, RadioGroupSize, CoarRadioButtonProps } from './components/radio-group';

export { CoarSwitch } from './components/switch';
export type { CoarSwitchProps, CoarSwitchSize } from './components/switch';

export { CoarSelect, CoarMultiSelect, CoarTagSelect } from './components/select';
export type { CoarSelectOption, CoarSelectSize, CoarSelectAppearance } from './components/select';

// Overlay System
export { CoarOverlayHost, CoarOverlayOutlet, CoarOverlayPlugin, useOverlay, OVERLAY_SERVICE_KEY, createOverlayService } from './components/overlay';
export { tooltipPreset, modalPreset, menuPreset, selectPreset, hoverMenuPreset, OVERLAY_DEFAULTS, resolveOverlaySpec } from './components/overlay';
export { computeOverlayCoordinates, getViewportRect, getAnchorRect, getContainerRect, getScrollParents } from './components/overlay';
export type { Placement, OverlaySpec, OverlayRef, OverlayService, OverlayInstance, OverlayContent, OverlayOpenOptions } from './components/overlay';
export type { AnchorSpec, PositionSpec, SizeSpec, BackdropSpec, ScrollSpec, DismissSpec, FocusSpec, A11ySpec, AttachmentSpec, ResolvedOverlaySpec } from './components/overlay';
export type { ViewportRect, Rect, OverlaySize, OverlayCoordinates } from './components/overlay';

// Tooltip
export { vTooltip } from './components/tooltip/vTooltip';
export type { TooltipOptions, TooltipPlacement } from './components/tooltip/vTooltip';

// Popconfirm
export { CoarPopconfirm } from './components/popconfirm';
export type { PopconfirmPlacement, PopconfirmVariant } from './components/popconfirm';

// Toast
export { useToast, CoarToastContainer, CoarToastItem } from './components/toast';
export type { ToastConfig, ToastRef, ToastVariant, ToastPosition } from './components/toast';

// Popover
export { CoarPopover } from './components/popover';
export type { PopoverMode } from './components/popover';

// Dialog
export { useDialog, CoarDialogShell } from './components/dialog';
export type { DialogConfig, DialogRef, DialogSize, ConfirmOptions } from './components/dialog';
