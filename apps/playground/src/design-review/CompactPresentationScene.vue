<script setup lang="ts">
import '../../../../packages/ui/src/compact-fonts';
import CorePresentationSamples from './CorePresentationSamples.vue';

withDefaults(defineProps<{
  kind?: 'fields' | 'selection' | 'dates' | 'states' | 'typography';
}>(), { kind: 'fields' });
</script>

<template>
  <section class="coar-compact compact-core-scene">
    <CorePresentationSamples :kind="kind" />
  </section>
</template>

<style scoped>
.compact-core-scene {
  padding: 16px;
  background: var(--coar-background-neutral-primary);
}
</style>
