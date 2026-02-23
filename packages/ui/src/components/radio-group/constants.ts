import type { ComputedRef, InjectionKey } from 'vue';
import type { RadioGroupContext } from './CoarRadioGroup.vue';

export const RADIO_GROUP_INJECTION_KEY: InjectionKey<ComputedRef<RadioGroupContext>> = Symbol('CoarRadioGroup');
