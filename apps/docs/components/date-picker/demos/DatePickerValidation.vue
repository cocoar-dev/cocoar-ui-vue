<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPlainDatePicker
      label="Birth date"
      placeholder="DD.MM.YYYY"
      :required="true"
      hint="Enter your date of birth"
    />
    <CoarPlainDatePicker
      label="Expiry date"
      placeholder="DD.MM.YYYY"
      error="Date is in the past"
    />
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
</script>
