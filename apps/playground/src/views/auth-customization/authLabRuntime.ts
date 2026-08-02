import type { ComputedRef, InjectionKey, Ref } from 'vue';

export interface AuthLabProvider {
  id: string;
  name: string;
  color: string;
}

export interface AuthLabConsentScope {
  name: string;
  displayName: string;
  description: string;
  required: boolean;
}

export interface AuthLabRuntime {
  productName: Ref<string>;
  showLegal: Ref<boolean>;
  providers: ComputedRef<AuthLabProvider[]>;
  consentScopes: ComputedRef<AuthLabConsentScope[]>;
  approvedScopes: Ref<Record<string, boolean>>;
}

export const AUTH_LAB_RUNTIME_KEY: InjectionKey<AuthLabRuntime> = Symbol('auth-lab-runtime');
