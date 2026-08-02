<script setup lang="ts">
import { inject } from 'vue';
import { AUTH_LAB_RUNTIME_KEY } from './authLabRuntime';

const runtime = inject(AUTH_LAB_RUNTIME_KEY);
if (!runtime) throw new Error('LabBrandElement requires AuthCustomizationLabView.');
</script>

<template>
  <div class="lab-brand" data-testid="renderer-brand">
    <div class="lab-brand__mark" aria-hidden="true">M</div>
    <h1>{{ runtime.productName.value || 'Modgud' }}</h1>
    <div v-if="runtime.showLegal.value" class="lab-brand__legal">
      <a href="#terms" @click.prevent>Terms</a>
      <a href="#privacy" @click.prevent>Privacy</a>
    </div>
  </div>
</template>

<style scoped>
.lab-brand {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  text-align: center;
}

.lab-brand__mark {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border-radius: 1.1rem;
  background: var(--auth-lab-accent, #1666cc);
  color: white;
  font-size: 1.65rem;
  font-weight: 750;
}

.lab-brand h1 {
  margin: 0;
  color: var(--coar-text-neutral-primary, #1d2433);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.lab-brand__legal {
  display: flex;
  gap: 0.75rem;
  font-size: 0.7rem;
}

.lab-brand__legal a {
  color: var(--coar-text-neutral-tertiary, #737784);
}
</style>
