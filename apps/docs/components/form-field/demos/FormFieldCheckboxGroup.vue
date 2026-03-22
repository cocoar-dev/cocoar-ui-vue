<template>
  <div style="max-width: 400px;">
    <CoarFormField
      label="Permissions"
      :error="permissionsError"
      hint="Select at least one permission"
      required
    >
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <CoarCheckbox v-model="read" label="Read — View content" />
        <CoarCheckbox v-model="write" label="Write — Create and edit content" />
        <CoarCheckbox v-model="admin" label="Admin — Manage users and settings" />
      </div>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';

const read = ref(false);
const write = ref(false);
const admin = ref(false);

const permissionsError = computed(() => {
  if (!read.value && !write.value && !admin.value) {
    return 'At least one permission is required';
  }
  return '';
});
</script>
