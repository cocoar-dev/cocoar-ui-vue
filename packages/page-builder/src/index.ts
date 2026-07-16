export { default as CoarPageRenderer } from './CoarPageRenderer.vue';
export { default as CoarPageBuilder } from './CoarPageBuilder.vue';

export type { ActionValues, ActionHandler, CustomValidator } from './context';

export type {
  PageNode,
  ElementType,
  NodeStyle,
  FieldValidation,
  ContainerNode,
  BuiltinNode,
  ElementNode,
  ElementProps,
  EmptyProps,
  OptionItem,
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

export { migrateV1PropsBag } from './builder/schemaMigrateV1';

// ─── Element registry (consumer-facing) ───────────────────────────────────────

export {
  definePageElement,
  mergeElementRegistries,
  PAGE_ELEMENTS_KEY,
  ELEMENT_KEY_PATTERN,
  type PageElementDefinition,
  type PageElementBuilderDefinition,
  type PageElementRegistry,
  type ElementValueSpec,
  type ElementLintIssue,
  type I18nText,
} from './elements/registry';

export { usePageElement, type PageElementContext } from './elements/usePageElement';

/** Shared options-list editor, exported so consumer inspectors can reuse it. */
export { default as OptionsEditor } from './builder/props/OptionsEditor.vue';
export type { EditorOption } from './builder/props/OptionsEditor.vue';
