<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info">
      <strong>Did you know?</strong> The Temporal API is the modern JavaScript standard for date/time handling.
      It provides <code>PlainDate</code>, <code>PlainDateTime</code>, and <code>ZonedDateTime</code> types
      for precise date and time manipulation without timezone ambiguity.
    </CoarNote>
    <CoarNote variant="warning">
      <strong>Breaking Change in v2.0:</strong> The <code>value</code> prop has been renamed to <code>modelValue</code>
      to align with Vue 3's composition API conventions. Update your code before upgrading.
    </CoarNote>
    <CoarNote variant="success">
      <strong>Migration Complete:</strong> Your project has been successfully upgraded to the latest version.
      All components have been updated and tests are passing.
    </CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
