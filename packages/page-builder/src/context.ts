import type { ComputedRef, InjectionKey } from 'vue';
import type { PageConfig } from './schema';

export type ActionValues = Record<string, unknown>;
export type ActionHandler = (values: ActionValues) => void;
export type CustomValidator = (values: ActionValues) => Record<string, string>;

export interface PageRendererContext {
  actions?: Record<string, ActionHandler>
  assetResolver?: (id: string) => string
  /** Optional security/allowlist config. When set, disallowed elements are skipped. */
  config?: PageConfig
  /** Called by PageNode when it skips a disallowed type — used to console.warn once. */
  reportDisallowed?: (type: string) => void
  /** Whether all named fields currently pass validation (quiet, no errors shown). */
  isFormValid: ComputedRef<boolean>
  getValue: (name: string) => unknown
  setValue: (name: string, value: unknown) => void
  /** Returns the error for a field only if it has been touched. */
  getError: (name: string) => string
  /** Mark a field as touched (called on blur). */
  markTouched: (name: string) => void
  triggerAction: (id: string, validates?: boolean) => void
}

export const PAGE_RENDERER_KEY: InjectionKey<PageRendererContext> = Symbol('page-renderer');
