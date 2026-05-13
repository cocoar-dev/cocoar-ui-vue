import type { ComputedRef, InjectionKey } from 'vue';
import type { PageConfig } from '../schema';
import type { UsePageBuilderReturn } from './usePageBuilder';
import type { UseSchemaValidationReturn } from './useSchemaValidation';

export const BUILDER_API: InjectionKey<UsePageBuilderReturn> = Symbol('PageBuilderApi');

/** Builder-side config (the same `PageConfig` is also passed to the renderer). */
export const BUILDER_CONFIG: InjectionKey<ComputedRef<PageConfig | undefined>> =
  Symbol('PageBuilderConfig');

/** Reactive validation issues for the current schema, keyed by node id. */
export const BUILDER_VALIDATION: InjectionKey<UseSchemaValidationReturn> =
  Symbol('PageBuilderValidation');
