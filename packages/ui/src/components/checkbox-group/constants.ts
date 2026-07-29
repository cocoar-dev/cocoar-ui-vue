import type { ComputedRef, InjectionKey } from 'vue';
import type { CoarCheckboxSize } from '../checkbox/CoarCheckbox.vue';

export interface CheckboxGroupContext {
  disabled: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  name: ComputedRef<string | undefined>;
  size: ComputedRef<CoarCheckboxSize>;
  isChecked: (value: string) => boolean;
  setChecked: (value: string, checked: boolean) => void;
  register: (value: string) => void;
  unregister: (value: string) => void;
}

export const CHECKBOX_GROUP_INJECTION_KEY: InjectionKey<CheckboxGroupContext> =
  Symbol('CoarCheckboxGroup');
