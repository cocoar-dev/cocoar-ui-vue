/**
 * The single catalog of per-element-type presentation: icon, palette group,
 * and the i18n key + English fallback for the human label. The palette, the
 * outline's add-child menu, both type-icon maps and the drag ghosts all used
 * to carry their own copies of this knowledge — they now derive from here.
 *
 * Labels are (key, fallback) pairs instead of finished strings because this is
 * a plain module: the `t()` call needs a component's injection context, so the
 * consuming components translate at render time.
 */
import type { CoreIconName } from '@cocoar/vue-ui';
import type { ElementType } from '../schema';

export interface ElementTypeMeta {
  icon: CoreIconName;
  /** Palette/add-menu grouping; `none` = not user-placeable (the page root). */
  group: 'container' | 'element' | 'none';
  labelKey: string;
  labelFallback: string;
}

// Exhaustiveness-checked: adding a new ElementType without meta is a type error.
export const ELEMENT_TYPE_META: Record<ElementType, ElementTypeMeta> = {
  page: {
    icon: 'file',
    group: 'none',
    labelKey: 'coar.pageBuilder.type.page',
    labelFallback: 'Page',
  },
  stack: {
    icon: 'layers',
    group: 'container',
    labelKey: 'coar.pageBuilder.type.stack',
    labelFallback: 'Stack',
  },
  card: {
    icon: 'square-dashed',
    group: 'container',
    labelKey: 'coar.pageBuilder.type.card',
    labelFallback: 'Card',
  },
  section: {
    icon: 'panel-left',
    group: 'container',
    labelKey: 'coar.pageBuilder.type.section',
    labelFallback: 'Section',
  },
  divider: {
    icon: 'minus',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.divider',
    labelFallback: 'Divider',
  },
  spacer: {
    icon: 'more-horizontal',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.spacer',
    labelFallback: 'Spacer',
  },
  heading: {
    icon: 'heading',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.heading',
    labelFallback: 'Heading',
  },
  paragraph: {
    icon: 'pilcrow',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.paragraph',
    labelFallback: 'Paragraph',
  },
  note: {
    icon: 'info',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.note',
    labelFallback: 'Note',
  },
  'text-input': {
    icon: 'file-text',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.textInput',
    labelFallback: 'Text Input',
  },
  'number-input': {
    icon: 'hash',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.numberInput',
    labelFallback: 'Number Input',
  },
  checkbox: {
    icon: 'check-circle-2',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.checkbox',
    labelFallback: 'Checkbox',
  },
  switch: {
    icon: 'check',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.switch',
    labelFallback: 'Switch',
  },
  'radio-group': {
    icon: 'rows',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.radioGroup',
    labelFallback: 'Radio Group',
  },
  select: {
    icon: 'list',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.select',
    labelFallback: 'Select',
  },
  'multi-select': {
    icon: 'list-ordered',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.multiSelect',
    labelFallback: 'Multi Select',
  },
  'otp-input': {
    icon: 'key-round',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.otpInput',
    labelFallback: 'OTP Input',
  },
  'date-input': {
    icon: 'calendar',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.dateInput',
    labelFallback: 'Date',
  },
  'datetime-input': {
    icon: 'calendar-days',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.dateTimeInput',
    labelFallback: 'Date & Time',
  },
  button: {
    icon: 'zap',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.button',
    labelFallback: 'Button',
  },
  link: {
    icon: 'link',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.link',
    labelFallback: 'Link',
  },
  image: {
    icon: 'image',
    group: 'element',
    labelKey: 'coar.pageBuilder.type.image',
    labelFallback: 'Image',
  },
};

/** User-placeable types in palette/add-menu order. */
export const PLACEABLE_TYPES: readonly ElementType[] = [
  'stack', 'card', 'section',
  'heading', 'paragraph', 'note', 'divider', 'spacer',
  'text-input', 'number-input', 'checkbox', 'switch', 'radio-group',
  'select', 'multi-select', 'otp-input', 'date-input', 'datetime-input',
  'button', 'link', 'image',
];

/** Icon for a type string — open-union tolerant; unknown types get the alert icon. */
export function typeIcon(type: string): CoreIconName {
  return ELEMENT_TYPE_META[type as ElementType]?.icon ?? 'circle-alert';
}
