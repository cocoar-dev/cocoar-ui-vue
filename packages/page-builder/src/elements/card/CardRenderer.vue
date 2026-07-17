<script setup lang="ts">
import { computed } from 'vue';
import { CoarCard } from '@cocoar/vue-ui';
import type { CardNode } from '../../schema';
import { containerLayoutStyle } from '../../styleMapping';

const props = defineProps<{ node: CardNode }>();

const layoutStyle = computed(() => containerLayoutStyle(props.node.style));
</script>

<template>
  <CoarCard :title="node.props.title">
    <div class="pb-card-body" :style="layoutStyle">
      <slot />
    </div>
  </CoarCard>
</template>

<style scoped>
.pb-card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
