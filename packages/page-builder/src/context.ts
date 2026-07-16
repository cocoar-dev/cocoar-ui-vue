import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { PageConfig } from './schema';
import type { PageElementRegistry } from './elements/registry';

export type ActionValues = Record<string, unknown>;
export type ActionHandler = (values: ActionValues) => void;
/**
 * Submit-time cross-field/server validation. Runs when a `validates: true`
 * button fires, AFTER the declarative rules pass; may be async. Return
 * fieldName → error message; the action only runs when the result is empty.
 */
export type CustomValidator = (
  values: ActionValues,
) => Record<string, string> | Promise<Record<string, string>>;

export interface PageRendererContext {
  actions?: Record<string, ActionHandler>
  assetResolver?: (id: string) => string
  /** Optional security/allowlist config. When set, disallowed elements are skipped. */
  config?: PageConfig
  /** Merged element registry (built-ins + consumer registrations) — the render dispatch table. */
  elements: ComputedRef<PageElementRegistry>
  /** Called by PageNode when it skips a disallowed type — used to console.warn once. */
  reportDisallowed?: (type: string) => void
  /** Called by PageNode when it skips an unregistered type — used to console.warn once. */
  reportUnknown?: (type: string) => void
  /** Whether all named fields currently pass validation (quiet, no errors shown). */
  isFormValid: ComputedRef<boolean>
  /** True while an async `onValidate` is in flight — validating buttons disable to block double-submit. */
  isValidating: Ref<boolean>
  getValue: (name: string) => unknown
  setValue: (name: string, value: unknown) => void
  /** Returns the error for a field only if it has been touched. */
  getError: (name: string) => string
  /** Mark a field as touched (called on blur). */
  markTouched: (name: string) => void
  triggerAction: (id: string, validates?: boolean) => void
}

export const PAGE_RENDERER_KEY: InjectionKey<PageRendererContext> = Symbol('page-renderer');
