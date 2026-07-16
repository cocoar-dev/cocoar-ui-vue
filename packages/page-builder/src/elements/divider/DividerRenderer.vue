<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
import type { DividerNode } from '../../schema';

defineProps<{ node: DividerNode }>();
</script>

<template>
  <CoarDivider />
</template>
