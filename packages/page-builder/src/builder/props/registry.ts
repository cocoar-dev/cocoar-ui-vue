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
  /** Title shown above the element section. */
  sectionTitle: string;
}

/**
 * Per-element-type props registry. An entry is absent when an element type has
 * no type-specific properties (`page`, `divider`) — only the universal style
 * section is shown for those.
 */
export const PROPS_REGISTRY: Partial<Record<ElementType, PropsRegistryEntry>> = {
  stack:        { component: StackProps,      sectionTitle: 'Layout' },
  card:         { component: CardProps,       sectionTitle: 'Card' },
  section:      { component: SectionProps,    sectionTitle: 'Section' },
  heading:      { component: HeadingProps,    sectionTitle: 'Heading' },
  paragraph:    { component: ParagraphProps,  sectionTitle: 'Paragraph' },
  spacer:       { component: SpacerProps,     sectionTitle: 'Spacer' },
  'text-input': { component: TextInputProps,  sectionTitle: 'Text input' },
  checkbox:     { component: CheckboxProps,   sectionTitle: 'Checkbox' },
  select:       { component: SelectProps,     sectionTitle: 'Select' },
  button:       { component: ButtonProps,     sectionTitle: 'Button' },
  link:         { component: LinkProps,       sectionTitle: 'Link' },
  image:        { component: ImageProps,      sectionTitle: 'Image' },
};
