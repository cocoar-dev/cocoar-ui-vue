<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="hover">
      <CoarButton variant="ghost" icon-start="circle-help" aria-label="More information" />
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">How it works</h4>
          <p style="margin: 0; font-size: 13px;">This feature uses your account's default timezone. You can change this in Settings &rarr; Preferences.</p>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="hover">
      <CoarButton variant="ghost" icon-start="triangle-alert" aria-label="Warning details" />
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">Rate limit approaching</h4>
          <p style="margin: 0; font-size: 13px;">You've used 80% of your monthly API limit. Upgrade to increase your quota.</p>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
