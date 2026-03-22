import type { ComputedRef, InjectionKey } from 'vue';

export interface FormFieldProvided {
  inputId: ComputedRef<string>;
  messageId: ComputedRef<string>;
  hasError: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
}

export const FORM_FIELD_INJECTION_KEY: InjectionKey<FormFieldProvided> = Symbol('CoarFormField');
