<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Bash</p>
      <CoarCodeBlock :code="bashExample" language="bash" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">JSON</p>
      <CoarCodeBlock :code="jsonExample" language="json" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const bashExample = `# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build`;

const jsonExample = `{
  "name": "@cocoar/vue-ui",
  "version": "1.0.0",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "import": "./dist/index.js"
    },
    "./styles": "./styles/bundle.css"
  }
}`;
</script>
