import type { Component } from 'vue';
import type { ElementType } from '../../schema';

import StackProps from './StackProps.vue';
import CardProps from './CardProps.vue';
import SectionProps from './SectionProps.vue';
import HeadingProps from './HeadingProps.vue';
import ParagraphProps from './ParagraphProps.vue';
import SpacerProps from './SpacerProps.vue';
import TextInputProps from './TextInputProps.vue';
import CheckboxProps from './CheckboxProps.vue';
import SelectProps from './SelectProps.vue';
import ButtonProps from './ButtonProps.vue';
import LinkProps from './LinkProps.vue';
import ImageProps from './ImageProps.vue';

export interface PropsRegistryEntry {
  /** Component to render for the element-specific props section. */
  component: Component;
  /** i18n key for the title shown above the element section. */
  sectionTitleKey: string;
  /** English fallback for the section title (used when no translation is registered). */
  sectionTitleFallback: string;
}

/**
 * Per-element-type props registry. An entry is absent when an element type has
 * no type-specific properties (`page`, `divider`) — only the universal style
 * section is shown for those.
 */
export const PROPS_REGISTRY: Partial<Record<ElementType, PropsRegistryEntry>> = {
  stack:        { component: StackProps,      sectionTitleKey: 'coar.pageBuilder.props.section.layout',    sectionTitleFallback: 'Layout' },
  card:         { component: CardProps,       sectionTitleKey: 'coar.pageBuilder.props.section.card',      sectionTitleFallback: 'Card' },
  section:      { component: SectionProps,    sectionTitleKey: 'coar.pageBuilder.props.section.section',   sectionTitleFallback: 'Section' },
  heading:      { component: HeadingProps,    sectionTitleKey: 'coar.pageBuilder.props.section.heading',   sectionTitleFallback: 'Heading' },
  paragraph:    { component: ParagraphProps,  sectionTitleKey: 'coar.pageBuilder.props.section.paragraph', sectionTitleFallback: 'Paragraph' },
  spacer:       { component: SpacerProps,     sectionTitleKey: 'coar.pageBuilder.props.section.spacer',    sectionTitleFallback: 'Spacer' },
  'text-input': { component: TextInputProps,  sectionTitleKey: 'coar.pageBuilder.props.section.textInput', sectionTitleFallback: 'Text input' },
  checkbox:     { component: CheckboxProps,   sectionTitleKey: 'coar.pageBuilder.props.section.checkbox',  sectionTitleFallback: 'Checkbox' },
  select:       { component: SelectProps,     sectionTitleKey: 'coar.pageBuilder.props.section.select',    sectionTitleFallback: 'Select' },
  button:       { component: ButtonProps,     sectionTitleKey: 'coar.pageBuilder.props.section.button',    sectionTitleFallback: 'Button' },
  link:         { component: LinkProps,       sectionTitleKey: 'coar.pageBuilder.props.section.link',      sectionTitleFallback: 'Link' },
  image:        { component: ImageProps,      sectionTitleKey: 'coar.pageBuilder.props.section.image',     sectionTitleFallback: 'Image' },
};
