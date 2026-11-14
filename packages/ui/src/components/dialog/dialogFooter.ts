import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

/** What a dialog or sheet shell offers `CoarDialogFooter`: the element of its fixed footer. */
export interface DialogFooterTarget {
  /** The footer element, once the shell has rendered it. */
  readonly element: Readonly<Ref<HTMLElement | null>>;
  /** Called by each `CoarDialogFooter` on setup; the returned function unregisters it. */
  register(): () => void;
}

export const DIALOG_FOOTER_KEY: InjectionKey<DialogFooterTarget> = Symbol('coar-dialog-footer');

/**
 * Used by the shells: provides the footer target to the body. `element` is the ref the shell
 * binds to its footer element; `used` is true while a `CoarDialogFooter` is mounted, so the
 * shell renders its footer element only then (unused, the DOM stays as it was).
 */
export function provideDialogFooter(): { element: Ref<HTMLElement | null>; used: ComputedRef<boolean> } {
  const element = ref<HTMLElement | null>(null);
  const count = ref(0);
  provide(DIALOG_FOOTER_KEY, {
    element,
    register() {
      count.value++;
      let done = false;
      return () => {
        if (done) return;
        done = true;
        count.value--;
      };
    },
  });
  return { element, used: computed(() => count.value > 0) };
}

/** Used by `CoarDialogFooter`: the footer target of the enclosing shell, if any. */
export function injectDialogFooter(): DialogFooterTarget | null {
  return inject(DIALOG_FOOTER_KEY, null);
}
