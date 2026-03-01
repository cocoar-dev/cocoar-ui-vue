<script setup lang="ts">
import { inject } from 'vue';
import { OVERLAY_SERVICE_KEY } from './useOverlay';
import CoarOverlayOutlet from './CoarOverlayOutlet.vue';
import CoarToastContainer from '../toast/CoarToastContainer.vue';
import { TOAST_SERVICE_KEY } from '../toast/toast-service';

const service = inject(OVERLAY_SERVICE_KEY);
const toastService = inject(TOAST_SERVICE_KEY);
</script>

<template>
  <CoarOverlayOutlet
    v-for="instance in service?.instances.value"
    :key="instance.id"
    :instance="instance"
  />
  <CoarToastContainer v-if="toastService" :service="toastService" />
</template>
