import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { PageBreakpoint, PageConfig } from '../schema';
import type { RuntimeResolutionContext } from '../runtimeBindings';
import type { CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';
import type { PageCodeRuntimeValues } from '../pageCode';
import type { UsePageBuilderReturn } from './usePageBuilder';
import type { UseSchemaValidationReturn } from './useSchemaValidation';

export const BUILDER_API: InjectionKey<UsePageBuilderReturn> = Symbol('PageBuilderApi');

/** Builder-side config (the same `PageConfig` is also passed to the renderer). */
export const BUILDER_CONFIG: InjectionKey<ComputedRef<PageConfig | undefined>> =
  Symbol('PageBuilderConfig');

/** Reactive validation issues for the current schema, keyed by node id. */
export const BUILDER_VALIDATION: InjectionKey<UseSchemaValidationReturn> =
  Symbol('PageBuilderValidation');

/** Breakpoint currently being authored in the canvas and universal style panel. */
export const BUILDER_BREAKPOINT: InjectionKey<Ref<PageBreakpoint>> =
  Symbol('PageBuilderBreakpoint');

/** Safe runtime sample used by canvas and outline labels during authoring. */
export const BUILDER_RUNTIME: InjectionKey<ComputedRef<RuntimeResolutionContext>> =
  Symbol('PageBuilderRuntime');

export type PageBuilderAuthoringMode = 'properties' | 'code';
export const BUILDER_AUTHORING_MODE: InjectionKey<ComputedRef<PageBuilderAuthoringMode>> =
  Symbol('PageBuilderAuthoringMode');
export const BUILDER_PAGE_CODE_LIBS: InjectionKey<ComputedRef<readonly CoarScriptEditorExtraLib[]>> =
  Symbol('PageBuilderPageCodeLibs');
export const BUILDER_PAGE_CODE_VALUES: InjectionKey<ComputedRef<PageCodeRuntimeValues | undefined>> =
  Symbol('PageBuilderPageCodeValues');

export interface BuilderLocaleContext {
  active: ComputedRef<string>;
  setActive: (locale: string) => void;
}

/** Locale currently authored by localized Quick Properties and the preview. */
export const BUILDER_LOCALE: InjectionKey<BuilderLocaleContext> = Symbol('PageBuilderLocale');

export interface BuilderLogicContext {
  activeBinding: Ref<{ nodeId: string; target: string } | null>;
  /**
   * Opens the single expression editor for a property. If the property does
   * not have a binding yet, `initialExpression` is used as the draft. The
   * document is only patched when the author applies the dialog.
   */
  openBinding: (nodeId: string, target: string, initialExpression?: string) => Promise<boolean>;
  /** Opens the isolated code editor for one existing element. */
  openElementCode: (nodeId: string) => Promise<boolean>;
  /** Opens reactive configuration code for the existing page root. */
  openPageCode: () => Promise<boolean>;
  /** Navigates to the customer-authored Page State editor. */
  openPageState: () => void;
  /** Opens the central page translation catalogue, optionally focused on one key. */
  openTranslations: (key?: string) => void;
}

/** Shared expression-editor entry point used by property rows and Logic overview. */
export const BUILDER_LOGIC: InjectionKey<BuilderLogicContext> = Symbol('PageBuilderLogic');
