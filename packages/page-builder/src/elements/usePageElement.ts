/**
 * The runtime context available to element renderer components — a curated,
 * stable subset of the renderer's internal context. Element authors (built-in
 * and consumer alike) use this instead of touching `PAGE_RENDERER_KEY`
 * directly, so the internal context can evolve without breaking element
 * contracts.
 */
import { inject } from 'vue';
import type { Ref } from 'vue';
import type { PageConfig } from '../schema';
import { PAGE_RENDERER_KEY } from '../context';

export interface PageElementContext {
  /** Current value of a named field ('' semantics are the element's concern). */
  getValue: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
  /** Error for a field — non-empty only once the field has been touched. */
  getError: (name: string) => string;
  /** Mark a field touched (typically on blur; choose-is-the-interaction inputs mark on change). */
  markTouched: (name: string) => void;
  /** Fire a page action by id; `validates` gates it behind form validation. */
  triggerAction: (id: string, validates?: boolean) => void;
  /** True while an async `onValidate` is in flight — disable submit affordances. */
  isValidating: Readonly<Ref<boolean>>;
  /** Resolve an assetId to a URL; '' when no resolver is configured. */
  resolveAsset: (assetId: string) => string;
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
    resolveAsset: (assetId: string) => ctx.assetResolver?.(assetId) ?? '',
    config: ctx.config,
  };
}
