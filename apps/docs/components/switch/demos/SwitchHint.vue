<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarFormField hint="Receive notifications about account activity.">
      <CoarSwitch v-model="notifications" label="Push notifications" />
    </CoarFormField>
    <CoarFormField hint="Automatically save changes every 5 minutes.">
      <CoarSwitch v-model="autoSave" label="Auto-save" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch, CoarFormField } from '@cocoar/vue-ui';

const notifications = ref(true);
const autoSave = ref(false);
</script>
