<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Collapsed by default (click to expand)</p>
      <CoarCodeBlock :code="code" language="typescript" :collapsed="true" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Non-collapsible (always visible)</p>
      <CoarCodeBlock :code="shortCode" language="bash" :collapsible="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const code = `import { ref, computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;

const shortCode = `# Install dependencies
pnpm install

# Start development server
pnpm dev`;
</script>
