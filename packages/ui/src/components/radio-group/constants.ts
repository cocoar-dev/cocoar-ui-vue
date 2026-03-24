import type { ComputedRef, InjectionKey } from 'vue';
import type { RadioGroupContext } from './CoarRadioGroup.vue';

export interface RadioGroupProvided {
  name: ComputedRef<string>;
  size: ComputedRef<RadioGroupContext['size']>;
  disabled: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  labelPosition: ComputedRef<'before' | 'after'>;
  modelValue: ComputedRef<unknown>;
  selectValue: (value: unknown) => void;
}

export const RADIO_GROUP_INJECTION_KEY: InjectionKey<RadioGroupProvided> = Symbol('CoarRadioGroup');
