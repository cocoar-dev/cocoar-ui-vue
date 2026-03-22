<template>
  <div style="display: flex; flex-direction: column; max-width: 360px;">
    <div v-for="(item, i) in settings" :key="item.label" :style="{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: i < settings.length - 1 ? '1px solid var(--coar-border-neutral-secondary)' : 'none'
    }">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 14px; font-weight: 600;">{{ item.label }}</span>
        <span style="font-size: 13px; color: #64748b;">{{ item.description }}</span>
      </div>
      <CoarSwitch :model-value="item.enabled" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';

const settings = [
  { label: 'Email notifications', description: 'Get emails about activity', enabled: true },
  { label: 'Marketing emails', description: 'Promotions and updates', enabled: false },
  { label: 'Two-factor auth', description: 'Enhanced security', enabled: true },
];
</script>
