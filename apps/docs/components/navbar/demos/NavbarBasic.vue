<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <strong style="font-size: var(--coar-body-base-size)">MyApp</strong>
      </template>
      <template #center>
        <nav style="display: flex; gap: 16px;">
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Home</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Features</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Pricing</a>
          <a href="javascript:void(0)" style="color: var(--coar-text-neutral-secondary); text-decoration: none; font-size: var(--coar-body-small-base-size);">Docs</a>
        </nav>
      </template>
      <template #end>
        <CoarButton variant="ghost" size="s">Sign In</CoarButton>
        <CoarButton variant="primary" size="s">Get Started</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
