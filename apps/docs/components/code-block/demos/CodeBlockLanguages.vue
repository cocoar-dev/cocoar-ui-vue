<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">TypeScript</p>
      <CoarCodeBlock :code="tsExample" language="typescript" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">HTML / Template</p>
      <CoarCodeBlock :code="htmlExample" language="html" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">CSS</p>
      <CoarCodeBlock :code="cssExample" language="css" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const tsExample = `import { ref, computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;

const htmlExample = `<template>
  <CoarButton
    variant="primary"
    icon-start="plus"
    @click="increment"
  >
    Count: {{ count }}
  </CoarButton>
  <p>Doubled: {{ doubled }}</p>
</template>`;

const cssExample = `.my-component {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  padding: var(--coar-spacing-l);
  border-radius: var(--coar-radius-m);
  background: var(--coar-background-neutral-primary);
  box-shadow: var(--coar-shadow-s);
}`;
</script>
