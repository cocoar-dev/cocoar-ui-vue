<script setup lang="ts">
import { inject } from 'vue';
import { OVERLAY_SERVICE_KEY } from './useOverlay';
import CoarOverlayOutlet from './CoarOverlayOutlet.vue';

const service = inject(OVERLAY_SERVICE_KEY);
</script>

<template>
  <CoarOverlayOutlet
    v-for="instance in service?.instances.value"
    :key="instance.id"
    :instance="instance"
  />
</template>
