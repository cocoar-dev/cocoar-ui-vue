import type { ComputedRef, InjectionKey } from 'vue';

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
