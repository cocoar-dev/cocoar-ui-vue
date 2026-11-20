import { provide, type ComputedRef, type InjectionKey } from 'vue';

export interface FormFieldProvided {
  inputId: ComputedRef<string>;
  labelId: ComputedRef<string>;
  messageId: ComputedRef<string>;
  hasError: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
}

/**
 * `Symbol.for` (not `Symbol`) so sister packages like `@cocoar/vue-script-editor` can
 * resolve the same key through the global registry without importing `@cocoar/vue-ui`.
 * If you provide/inject `FORM_FIELD_INJECTION_KEY` in application code, always import it
 * from `@cocoar/vue-ui` — don't call `Symbol.for('coar:form-field')` directly.
 */
export const FORM_FIELD_INJECTION_KEY: InjectionKey<FormFieldProvided> = Symbol.for(
  'coar:form-field',
) as InjectionKey<FormFieldProvided>;

/**
 * Hide the surrounding form field from the calling component's descendants. A
 * control nested in an input (e.g. a select in a suffix action) is a field of its
 * own: it must not take the input's label, message or error state.
 */
export function provideNoFormField(): void {
  provide(FORM_FIELD_INJECTION_KEY, undefined as unknown as FormFieldProvided);
}
