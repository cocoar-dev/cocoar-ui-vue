<script setup lang="ts">
import { inject } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import type { ElementNode } from '@cocoar/vue-page-builder';
import { AUTH_LAB_RUNTIME_KEY } from './authLabRuntime';

defineProps<{
  node: ElementNode<'lab-provider-buttons', { prefix?: string }>;
}>();

const runtime = inject(AUTH_LAB_RUNTIME_KEY);
if (!runtime) throw new Error('LabProviderButtonsElement requires AuthCustomizationLabView.');
</script>

<template>
  <div v-if="runtime.providers.value.length" class="providers" data-testid="renderer-providers">
    <CoarButton
      v-for="provider in runtime.providers.value"
      :key="provider.id"
      type="button"
      variant="secondary"
      full-width
      :style="{ borderColor: provider.color, color: provider.color }"
    >
      {{ node.props.prefix || 'Sign in with' }} {{ provider.name }}
    </CoarButton>
  </div>
</template>

<style scoped>
.providers {
  display: grid;
  gap: 0.75rem;
  width: 100%;
}
</style>
