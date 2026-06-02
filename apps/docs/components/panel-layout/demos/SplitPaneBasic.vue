<template>
  <div class="sp-frame">
    <CoarSplitPane v-model:size="size" :min="120" :max="420">
      <template #first>
        <div class="sp-pane sp-pane--a">
          <strong>Sidebar</strong>
          <span>{{ size }}px — drag the divider →</span>
        </div>
      </template>
      <template #second>
        <div class="sp-pane sp-pane--b">
          <strong>Content</strong>
          <span>flexes to fill the rest</span>
        </div>
      </template>
    </CoarSplitPane>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSplitPane } from '@cocoar/vue-ui';

const size = ref(200);
</script>

<style scoped>
.sp-frame {
  height: 220px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.sp-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.sp-pane span {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.sp-pane--a {
  background: var(--vp-c-bg-soft);
}
.sp-pane--b {
  background: var(--vp-c-bg);
}
</style>
