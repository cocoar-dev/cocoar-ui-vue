<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
import type { DividerNode } from '../../schema';

defineProps<{
  node: DividerNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarDivider />
</template>
