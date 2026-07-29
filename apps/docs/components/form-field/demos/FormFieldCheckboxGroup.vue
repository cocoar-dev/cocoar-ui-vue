<template>
  <div style="max-width: 400px">
    <CoarFormField
      label="Permissions"
      :error="permissionsError"
      hint="Select at least one permission"
      required
    >
      <CoarCheckboxGroup v-model="permissions">
        <CoarCheckbox value="read" label="Read — View content" />
        <CoarCheckbox value="write" label="Write — Create and edit content" />
        <CoarCheckbox value="admin" label="Admin — Manage users and settings" />
      </CoarCheckboxGroup>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup, CoarFormField } from '@cocoar/vue-ui';

const permissions = ref<string[]>([]);

const permissionsError = computed(() => {
  if (permissions.value.length === 0) {
    return 'At least one permission is required';
  }
  return '';
});
</script>
