/**
 * The runtime context available to element renderer components — a curated,
 * stable subset of the renderer's internal context. Element authors (built-in
 * and consumer alike) use this instead of touching `PAGE_RENDERER_KEY`
 * directly, so the internal context can evolve without breaking element
 * contracts.
 */
import { inject } from 'vue';
import type { Ref } from 'vue';
import type { PageConfig, RuntimeBinding } from '../schema';
import { PAGE_RENDERER_KEY } from '../context';
import type { ActionValues } from '../context';

export interface PageElementContext {
  /** Current value of a named field ('' semantics are the element's concern). */
  getValue: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
  /** Error for a field — non-empty only once the field has been touched. */
  getError: (name: string) => string;
  /** Mark a field touched (typically on blur; choose-is-the-interaction inputs mark on change). */
  markTouched: (name: string) => void;
  /** Fire a page action by id; `validates` gates it behind form validation. */
  triggerAction: (id: string, validates?: boolean, actionValues?: ActionValues) => void;
  /** True while an async `onValidate` is in flight — disable submit affordances. */
  isValidating: Readonly<Ref<boolean>>;
  /** True while an action handler's Promise is pending — disable submit affordances. */
  isSubmitting: Readonly<Ref<boolean>>;
  /**
   * Action id whose trigger is currently in flight (validate + action phase),
   * null when idle — action-firing elements show their busy state (spinner)
   * when it matches their own action.
   */
  pendingAction: Readonly<Ref<string | null>>;
  /**
   * Form-level error (`_form` key from onValidate, or an action rejection).
   * The renderer shows it in a banner above the page by default; elements can
   * read it here to present it elsewhere.
   */
  formError: Readonly<Ref<string>>;
  /** Resolve an assetId to a URL; '' when no resolver is configured. */
  resolveAsset: (assetId: string) => string;
  resolveBinding: (binding: RuntimeBinding, item?: unknown, allowedItemPaths?: ReadonlySet<string>) => unknown;
  config?: Readonly<PageConfig>;
}

export function usePageElement(): PageElementContext {
  const ctx = inject(PAGE_RENDERER_KEY);
  if (!ctx) {
    throw new Error(
      'usePageElement() requires a <CoarPageRenderer> ancestor — element renderers only run inside the page renderer.',
    );
  }
  return {
    getValue: ctx.getValue,
    setValue: ctx.setValue,
    getError: ctx.getError,
    markTouched: ctx.markTouched,
    triggerAction: ctx.triggerAction,
    isValidating: ctx.isValidating,
    isSubmitting: ctx.isSubmitting,
    pendingAction: ctx.pendingAction,
    formError: ctx.formError,
    resolveAsset: (assetId: string) => ctx.assetResolver?.(assetId) ?? '',
    resolveBinding: ctx.resolveBinding,
    // A getter, not a snapshot — a config supplied or replaced after this
    // element mounted (late-arriving optionsSource, swapped allow-list) must
    // reach the element, and reactive readers (watchEffect) must re-track it.
    get config() {
      return ctx.config;
    },
  };
}
