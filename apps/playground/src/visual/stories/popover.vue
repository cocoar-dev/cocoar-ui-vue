<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Popover opened by its trigger (click mode, interactive)</h2>
    <div style="padding-left: 160px">
      <CoarPopover mode="click" interactive>
        <CoarButton variant="secondary" icon-start="info">Details</CoarButton>
        <template #content>
          <div style="width: 260px; padding: 12px">
            <strong>Shared with 3 people</strong>
            <p style="margin: 8px 0 12px">Everyone with the link can view. Only owners can edit.</p>
            <CoarButton size="s" variant="tertiary">Manage access</CoarButton>
          </div>
        </template>
      </CoarPopover>
    </div>
  </section>
</template>
