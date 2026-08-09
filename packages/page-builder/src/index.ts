export { default as CoarPageRenderer } from './CoarPageRenderer.vue';
export { default as CoarPageBuilder } from './CoarPageBuilder.vue';

export type { ActionValues, ActionHandler, CustomValidator } from './context';
export { FORM_ERROR_KEY } from './context';

export type {
  PageNode,
  PageCompositionReference,
  PageCompositionOrigin,
  ElementType,
  NodeStyle,
  PageBreakpoint,
  ResponsiveNodeStyles,
  PageContextValueType,
  PageContextItemField,
  PageContextField,
  RuntimeBinding,
  RuntimeExpressionBinding,
  RuntimeExpressionValues,
  RuntimeTemplate,
  PropertyBinding,
  LocalizedValue,
  TranslationBinding,
  PageTranslations,
  FieldValidation,
  VisibleWhen,
  ContainerNode,
  BuiltinNode,
  ElementNode,
  ElementProps,
  EmptyProps,
  OptionItem,
  PageRootNode,
  PagePreviewFixture,
  StackNode,
  CardNode,
  SectionNode,
  RepeatNode,
  RepeatSelection,
  DividerNode,
  SpacerNode,
  HeadingNode,
  ParagraphNode,
  NoteNode,
  FeedbackNode,
  TextInputNode,
  PasswordInputNode,
  NumberInputNode,
  CheckboxNode,
  SwitchNode,
  RadioGroupNode,
  SelectNode,
  MultiSelectNode,
  OtpInputNode,
  DateInputNode,
  DateTimeInputNode,
  ActionProps,
  ButtonNode,
  LinkNode,
  ImageNode,
  VisualMarkupNode,
  PageConfig,
  PageVisualFont,
  PageVisualMarkupConfig,
  PageStylePreset,
  PageValueType,
  PageFieldSpec,
} from './schema';

export {
  collectCompositionReferences,
  compilePageCompositions,
  compositionReference,
  compositionTemplateFromInstance,
  createInMemoryPageCompositionRepository,
  detachPageComposition,
  isPageCompositionReference,
  linkExistingCompositionInstance,
  materializePageComposition,
  validatePageCompositionReferences,
  type CreatePageCompositionInput,
  type MaybePromise,
  type PageCompositionDefinition,
  type PageCompositionIssue,
  type PageCompositionRepository,
  type PageCompositionSummary,
  type PublishPageCompositionInput,
} from './compositions';

export { findStylePreset, isSafeStylePreset } from './stylePresets';

export { isContainerNode, isElementAllowed } from './schema';
export { CURRENT_PAGE_SCHEMA_VERSION } from './schema';
export type { PageBuilderAuthoringMode } from './builder/builderContext';
export type { PageCompositionManagement } from './builder/usePageCompositions';

// ─── Browser Page Runtime ────────────────────────────────────────────────────

export {
  PageScriptRuntime,
  withRuntimeEndowmentContext,
  type ContextualRuntimeEndowmentMethod,
  type ContextualRuntimeEndowmentMethodHandler,
  type PageScriptRuntimeContext,
  type RuntimeEndowmentContext,
  type RuntimeEndowmentObject,
  type RuntimeEndowments,
  type RuntimeInvocation,
} from '#page-runtime-worker';
export {
  PageRuntimeHost,
  PageRuntimeSession,
  definePageRuntimeHost,
  type PageRuntimeGrantContext,
  type PageRuntimeHostOptions,
  type PageRuntimeSessionOptions,
} from './runtime/PageRuntimeHost';
export {
  cloneRuntimeValue,
  type MainToRuntimeMessage,
  type RuntimeBindingDefinition,
  type RuntimeBootstrapMetrics,
  type RuntimeDefinition,
  type RuntimeEndowmentDescriptor,
  type RuntimeEndowmentGrants,
  type RuntimeInitializationMetrics,
  type RuntimePath,
  type RuntimeReactiveUpdate,
  type RuntimeResourceDefinition,
  type RuntimeResourceState,
  type RuntimeResourceStatus,
  type RuntimeScriptDefinition,
  type RuntimeStatePatch,
  type RuntimeStateUpdateMetrics,
  type RuntimeToMainMessage,
  type RuntimeValue,
} from './runtime/runtimeProtocol';
export {
  usePageCodeRuntime,
  type PageCodeRuntimeOptions,
} from './runtime/usePageCodeRuntime';
export {
  PAGE_BREAKPOINT_WIDTHS,
  breakpointForWidth,
  resolveNodeStyle,
  localNodeStyle,
} from './responsive';
export { safeAspectRatio, safeCssLength, safeFontVariationSettings } from './styleMapping';
export {
  actionValuesFromProps,
  isJsonSafeActionValue,
  isJsonSafeActionValues,
  isBindableActionValueField,
  isSafeActionValueField,
  mergeActionValues,
} from './actionValues';

export {
  normalizePageSchema,
  migrateLegacyTypes,
  KNOWN_ELEMENT_TYPES,
  type NormalizeIssue,
  type NormalizeOptions,
  type NormalizeResult,
} from './builder/schemaNormalize';

export { migrateV1PropsBag } from './builder/schemaMigrateV1';

// ─── Element registry (consumer-facing) ───────────────────────────────────────

export {
  definePageElement,
  mergeElementRegistries,
  PAGE_ELEMENTS_KEY,
  ELEMENT_KEY_PATTERN,
  QUICK_PROPERTY_PRESETS,
  PAGE_ROOT_QUICK_PROPERTIES,
  type PageElementDefinition,
  type PageElementBuilderDefinition,
  type PageElementQuickProperty,
  type PageElementQuickPropertyOption,
  type PageElementRegistry,
  type ElementValueSpec,
  type ElementLintIssue,
  type I18nText,
} from './elements/registry';

export { usePageElement, type PageElementContext } from './elements/usePageElement';
export { useResolvedOptions } from './elements/useResolvedOptions';
export { buildVisualDocument } from './elements/visual-markup';

export { evaluateCondition, type ConditionSources } from './conditions';
export {
  safeReadPath,
  matchesContextType,
  readAllowedContext,
  resolveLocalizedValue,
  resolveRuntimeBinding,
  resolvePropertyBinding,
  resolveNodeRuntime,
  resolveExpressionStyle,
  isExpressionBinding,
  isExpressionBindingEnabled,
  runtimeExpressionKey,
  type RuntimeResolutionContext,
} from './runtimeBindings';

export {
  isTranslationBinding,
  translation,
  pageTranslationTemplate,
  resolveTranslation,
  translationKeyFor,
} from './translations';

export { validatePageDocument, type PageDocumentIssue, type PageDocumentValidationResult } from './documentValidation';

export {
  collectPageRuntimeExpressions,
  pageRuntimeExpressionSource,
  type PageRuntimeExpressionDefinition,
} from './runtimeExpressions';
export {
  DEFAULT_PAGE_CODE,
  applyPageCodeValues,
  createPageCodeDrafts,
  normalizePageCodeOutput,
  pageCodeRuntimeSource,
  pageStateRuntimeSource,
  pageRootComputeRuntimeSource,
  elementComputeRuntimeSource,
  elementActionRuntimeSource,
  readElementQuickProperties,
  setElementQuickProperty,
  setPageRootQuickProperty,
  elementBindingId,
  pageRootBindingId,
  elementActionDefinitionId,
  elementClickActionId,
  DEFAULT_PAGE_STATE_CODE,
  DEFAULT_PAGE_ROOT_CODE,
  DEFAULT_ELEMENT_CODE,
  constrainPageStateCode,
  constrainPageRootCode,
  constrainElementCode,
  elementCodeHasClickAction,
  type PageCodeDraftSet,
  type PageCodeElementDraft,
  type PageCodeRuntimeInput,
  type PageCodeRuntimeValues,
} from './pageCode';

export {
  isFieldCompatible,
  compatibleFields,
  compatibleElementTypes,
  defaultElementForField,
  defineFields,
  type TypedFieldSpec,
  type ValueTypeFor,
} from './elements/fieldContract';

/** Shared options-list editor, exported so consumer inspectors can reuse it. */
export { default as OptionsEditor } from './builder/props/OptionsEditor.vue';
export type { EditorOption } from './builder/props/OptionsEditor.vue';
