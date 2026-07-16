<script setup lang="ts">
import { computed } from 'vue';
import type { SpacerNode } from '../../schema';

const props = defineProps<{ node: SpacerNode }>();

const sizeStyle = computed(() =>
  props.node.props.size
    ? { height: props.node.props.size, width: props.node.props.size }
    : { flex: '1' },
);
</script>

<template>
  <div class="pb-spacer" :style="sizeStyle" />
</template>

<style scoped>
.pb-spacer {
  flex-shrink: 0;
}
</style>
