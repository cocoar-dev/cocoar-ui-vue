<template>
  <CoarCodeBlock :code="code" language="bash" :show-line-numbers="false" :collapsible="false" />
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const code = `# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build`;
</script>
