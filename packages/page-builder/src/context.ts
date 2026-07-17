import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { PageConfig, PageNode } from './schema';
import type { PageElementRegistry } from './elements/registry';

export type ActionValues = Record<string, unknown>;
/**
 * A returned Promise is awaited: `isSubmitting` stays true (buttons disable,
 * the triggering one spins) until it settles, and clicks are ignored while it
 * is in flight. A rejection surfaces in the form-level error banner — throw an
 * `Error` whose `message` is user-facing (e.g. "Invalid credentials"); any
 * other rejection shows a localized generic message.
 */
export type ActionHandler = (values: ActionValues) => void | Promise<unknown>;
/**
 * Submit-time cross-field/server validation. Runs when a `validates: true`
 * button fires, AFTER the declarative rules pass; may be async. Return
 * fieldName → error message; the action only runs when the result is empty.
 * The reserved key `_form` (`FORM_ERROR_KEY`) addresses no field — it shows
 * in the form-level error banner (e.g. "Invalid credentials").
 */
export type CustomValidator = (
  values: ActionValues,
) => Record<string, string> | Promise<Record<string, string>>;

/**
 * Reserved key in `CustomValidator` results for an error that belongs to the
 * form as a whole, not to a single field. Blocks the action like any field
 * error, but renders in the renderer's banner (default or `#form-error` slot).
 */
export const FORM_ERROR_KEY = '_form';

export interface PageRendererContext {
  actions?: Record<string, ActionHandler>
  assetResolver?: (id: string) => string
  /** Optional security/allowlist config. When set, disallowed elements are skipped. */
  config?: PageConfig
  /** Merged element registry (built-ins + consumer registrations) — the render dispatch table. */
  elements: ComputedRef<PageElementRegistry>
  /** `visibleWhen` gate, evaluated against the live value model — PageNode skips hidden subtrees. */
  isVisible: (node: PageNode) => boolean
  /** Called by PageNode when it skips a disallowed type — used to console.warn once. */
  reportDisallowed?: (type: string) => void
  /** Called by PageNode when it skips an unregistered type — used to console.warn once. */
  reportUnknown?: (type: string) => void
  /** Whether all named fields currently pass validation (quiet, no errors shown). */
  isFormValid: ComputedRef<boolean>
  /** True while an async `onValidate` is in flight — validating buttons disable to block double-submit. */
  isValidating: Ref<boolean>
  /** True while an action handler's Promise is pending — all action buttons disable. */
  isSubmitting: Ref<boolean>
  /**
   * Action id whose trigger is in flight (validate phase + action phase),
   * null when idle — lets the triggering button spin while the others merely
   * disable.
   */
  pendingAction: Ref<string | null>
  /**
   * Form-level error: the `_form` key of an `onValidate` result or an action
   * rejection. Cleared on any field edit and at the start of each trigger.
   */
  formError: Ref<string>
  getValue: (name: string) => unknown
  setValue: (name: string, value: unknown) => void
  /** Returns the error for a field only if it has been touched. */
  getError: (name: string) => string
  /** Mark a field as touched (called on blur). */
  markTouched: (name: string) => void
  triggerAction: (id: string, validates?: boolean) => void
}

export const PAGE_RENDERER_KEY: InjectionKey<PageRendererContext> = Symbol('page-renderer');
