export { default as CoarPageRenderer } from './CoarPageRenderer.vue';
export { default as CoarPageBuilder } from './CoarPageBuilder.vue';

export type { ActionValues, ActionHandler, CustomValidator } from './context';

export type {
  PageNode,
  ElementType,
  NodeStyle,
  FieldValidation,
  ContainerNode,
  PageRootNode,
  StackNode,
  CardNode,
  SectionNode,
  DividerNode,
  SpacerNode,
  HeadingNode,
  ParagraphNode,
  NoteNode,
  TextInputNode,
  NumberInputNode,
  CheckboxNode,
  SwitchNode,
  RadioGroupNode,
  SelectNode,
  MultiSelectNode,
  OtpInputNode,
  DateInputNode,
  DateTimeInputNode,
  ButtonNode,
  LinkNode,
  ImageNode,
  PageConfig,
} from './schema';

export { isContainerNode, isElementAllowed } from './schema';

export {
  normalizePageSchema,
  migrateLegacyTypes,
  KNOWN_ELEMENT_TYPES,
  type NormalizeIssue,
  type NormalizeResult,
} from './builder/schemaNormalize';
