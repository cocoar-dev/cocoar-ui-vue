<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">C</div>
          <strong style="font-size: var(--coar-body-base-size)">cocoar</strong>
        </div>
      </template>
      <template #center>
        <nav style="display: flex; gap: 16px;">
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Dashboard</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Projects</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Team</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Reports</a>
        </nav>
      </template>
      <template #end>
        <CoarButton variant="ghost" icon-start="triangle-alert" size="s" aria-label="Notifications" />
        <CoarAvatar name="John Doe" size="s" />
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton, CoarAvatar } from '@cocoar/vue-ui';
</script>
