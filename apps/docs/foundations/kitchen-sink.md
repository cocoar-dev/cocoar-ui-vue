---
layout: page
sidebar: false
description: "Every Cocoar component rendered on a single page for side-by-side inspection and light versus dark theme comparison."
---

<script setup>
import KitchenSink from './kitchen-sink/demos/KitchenSink.vue'
</script>

<div class="ks-page">
  <div class="ks-header">
    <h1>Kitchen Sink</h1>
    <p>All components in one view. Toggle dark mode (top right) to compare themes.</p>
  </div>
  <KitchenSink />
</div>

<style>
.ks-page {
  max-width: var(--vp-layout-max-width, 1376px);
  margin: 0 auto;
  padding: 24px 32px;
}

.ks-header {
  margin-bottom: 24px;
}

.ks-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.ks-header p {
  margin: 0;
  color: var(--vp-c-text-2);
}
</style>
