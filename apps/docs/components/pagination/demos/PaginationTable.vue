<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Name</th>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Email</th>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Role</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in 5" :key="i">
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">User {{ (page - 1) * 5 + i }}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">user{{ (page - 1) * 5 + i }}@example.com</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">{{ i % 2 === 0 ? 'Admin' : 'User' }}</td>
        </tr>
      </tbody>
    </table>
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <span style="font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Showing {{ (page - 1) * 5 + 1 }}&ndash;{{ Math.min(page * 5, 100) }} of 100
      </span>
      <CoarPagination v-model="page" :total-items="100" :page-size="5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(1);
</script>
