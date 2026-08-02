<script setup lang="ts">
import { inject } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';
import { AUTH_LAB_RUNTIME_KEY } from './authLabRuntime';

const runtime = inject(AUTH_LAB_RUNTIME_KEY);
if (!runtime) throw new Error('LabConsentScopesElement requires the auth-lab runtime.');

function updateScope(name: string, value: boolean) {
  runtime.approvedScopes.value = { ...runtime.approvedScopes.value, [name]: value };
}
</script>

<template>
  <div class="consent-scopes" data-testid="renderer-consent-scopes">
    <article v-for="scope in runtime.consentScopes.value" :key="scope.name" class="scope-row">
      <CoarCheckbox
        :model-value="runtime.approvedScopes.value[scope.name] ?? false"
        :disabled="scope.required"
        :label="scope.displayName"
        @update:model-value="updateScope(scope.name, $event)"
      />
      <p>{{ scope.description }}</p>
      <small v-if="scope.required">Required</small>
    </article>
  </div>
</template>

<style scoped>
.consent-scopes {
  display: grid;
  gap: 0.5rem;
}

.scope-row {
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.45rem;
  background: var(--coar-surface-default, white);
}

.scope-row p,
.scope-row small {
  margin: 0.25rem 0 0 1.75rem;
  overflow-wrap: anywhere;
  color: var(--coar-text-neutral-secondary, #626773);
  font-size: 0.72rem;
}

.scope-row small {
  color: var(--coar-text-neutral-tertiary, #7b7f89);
  font-size: 0.65rem;
}
</style>
