<template>
  <CoarCard elevated style="max-width: 400px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
      <h4 style="margin: 0;">New Feature Release</h4>
      <span style="font-size: 14px; color: #64748b;">2 hours ago</span>
    </div>
    <p style="margin: 8px 0; font-size: 14px;">
      We've just released a major update to the date picker component. It now supports timezone-aware datetime selection using the Temporal API.
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
      <CoarTag variant="info">New</CoarTag>
      <CoarTag variant="success">Stable</CoarTag>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <CoarButton variant="primary" size="s">Read More</CoarButton>
      <CoarButton variant="ghost" size="s">Dismiss</CoarButton>
    </div>
  </CoarCard>
</template>

<script setup lang="ts">
import { CoarCard, CoarTag, CoarButton } from '@cocoar/vue-ui';
</script>
