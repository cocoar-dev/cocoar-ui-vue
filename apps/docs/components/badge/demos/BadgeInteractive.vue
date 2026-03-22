<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="position: relative; display: inline-flex; width: 40px;">
      <span style="font-size: 24px;">&#x1F514;</span>
      <CoarBadge :content="notifCount" :max="99" variant="error" :pulse="pulsing" style="position: absolute; top: -4px; right: -4px;" />
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      <CoarButton variant="primary" size="s" @click="notifCount++">Add Notification</CoarButton>
      <CoarButton variant="secondary" size="s" @click="notifCount = 0">Clear All</CoarButton>
    </div>
    <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; cursor: pointer;">
      <input type="checkbox" v-model="pulsing" />
      Pulse Animation
    </label>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Current count: {{ notifCount }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarButton } from '@cocoar/vue-ui';

const notifCount = ref(5);
const pulsing = ref(true);
</script>
