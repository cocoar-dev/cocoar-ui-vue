<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Default variant</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" :collapsible="false" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Info variant (documentation callout)</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" variant="info" :collapsible="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';
</script>
