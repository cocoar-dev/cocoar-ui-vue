<template>
  <ClientOnly>
    <component :is="Demo" v-if="Demo" />
    <div v-else class="fe-loading">Loading demo…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue';
const Demo = shallowRef<Component | null>(null);
onMounted(async () => {
  const mod = await import('./_internal/LazyModeImpl.vue');
  Demo.value = mod.default;
});
</script>

<style scoped>
.fe-loading {
  height: 320px; display: flex; align-items: center; justify-content: center;
  color: var(--coar-text-neutral-tertiary, #6b7280); font-size: 13px;
}
</style>
