<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarSwitch v-model="notifications" label="Push notifications" hint="Receive notifications about account activity." />
    <CoarSwitch v-model="autoSave" label="Auto-save" hint="Automatically save changes every 5 minutes." />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';

const notifications = ref(true);
const autoSave = ref(false);
</script>
