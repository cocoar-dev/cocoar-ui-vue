<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Birth date" hint="Enter your date of birth" required>
      <CoarPlainDatePicker
        placeholder="DD.MM.YYYY"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField label="Expiry date" error="Date is in the past">
      <CoarPlainDatePicker
        placeholder="DD.MM.YYYY"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
