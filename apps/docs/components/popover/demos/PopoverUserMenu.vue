<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="click">
      <CoarAvatar name="John Doe" size="s" style="cursor: pointer" />
      <template #content>
        <div style="min-width: 180px;">
          <div style="padding: 8px 16px; border-bottom: 1px solid var(--coar-border-neutral-secondary); margin-bottom: 4px;">
            <p style="margin: 0; font-weight: 600; font-size: 13px;">John Doe</p>
            <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">john@example.com</p>
          </div>
          <div style="display: flex; flex-direction: column; padding: 4px; gap: 2px;">
            <CoarButton variant="ghost" size="s">Profile</CoarButton>
            <CoarButton variant="ghost" size="s">Settings</CoarButton>
            <CoarButton variant="danger" size="s">Sign Out</CoarButton>
          </div>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover, CoarAvatar } from '@cocoar/vue-ui';
</script>
