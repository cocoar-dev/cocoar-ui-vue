<script setup lang="ts">
import { CoarLink, CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <div class="banner-frame">
    <div class="fake-header">Application header</div>
    <CoarNotice placement="banner" variant="warning" label="Temporary storage">
      Uploaded files are retained until the next restart.
      <template #cta>
        <CoarLink size="s">Configure storage →</CoarLink>
      </template>
    </CoarNotice>
    <div class="fake-content">Application content</div>
  </div>
</template>

<style scoped>
.banner-frame {
  overflow: hidden;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
}

.fake-header {
  padding: 14px 24px;
  background: var(--coar-background-semantic-info-bold);
  color: var(--coar-text-on-bold);
  font-weight: 600;
}

.fake-content {
  min-height: 92px;
  padding: 24px;
  color: var(--coar-text-neutral-secondary);
}
</style>
