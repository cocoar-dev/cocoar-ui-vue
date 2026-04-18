import { inject, type ComputedRef, type InjectionKey } from 'vue';

/**
 * Contract mirror of `@cocoar/vue-ui`'s `FormFieldProvided`. Duplicated here (rather than
 * imported) so `@cocoar/vue-script-editor` doesn't have to pull `@cocoar/vue-ui` as a
 * package dependency. The key is shared via `Symbol.for('coar:form-field')` — see
 * `packages/ui/src/components/form-field/constants.ts` for the source of truth.
 *
 * When `CoarFormField`'s public shape changes, update both places.
 */
export interface FormFieldContext {
  inputId: ComputedRef<string>;
  messageId: ComputedRef<string>;
  hasError: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
}

const FORM_FIELD_INJECTION_KEY: InjectionKey<FormFieldContext> = Symbol.for(
  'coar:form-field',
) as InjectionKey<FormFieldContext>;

export function useFormFieldContext(): FormFieldContext | undefined {
  return inject(FORM_FIELD_INJECTION_KEY, undefined);
}
