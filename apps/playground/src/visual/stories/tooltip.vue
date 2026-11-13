<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Tooltip of the focused trigger (one at a time), wrapping text</h2>
    <div style="padding: 24px 0 0 200px">
      <CoarButton
        v-tooltip="{
          content: 'Saves the draft. Published versions stay as they are until you publish again.',
          placement: 'bottom',
        }"
        data-tooltip
        variant="secondary"
        icon-start="save"
      >
        Save draft
      </CoarButton>
    </div>
  </section>
</template>
