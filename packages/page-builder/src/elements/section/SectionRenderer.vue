<script setup lang="ts">
import { computed } from 'vue';
import type { SectionNode } from '../../schema';
import { containerLayoutStyle } from '../../styleMapping';

const props = defineProps<{ node: SectionNode }>();

const layoutStyle = computed(() => containerLayoutStyle(props.node.style));
</script>

<template>
  <section class="pb-section">
    <h3 v-if="node.props.title" class="pb-section__title">{{ node.props.title }}</h3>
    <div class="pb-section__body" :style="layoutStyle">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.pb-section {
  display: block;
}

.pb-section__title {
  margin: 0 0 var(--coar-spacing-s, 8px);
  font-size: var(--coar-body-base-size, 14px);
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-section__body {
  display: flex;
  flex-direction: column;
}
</style>
