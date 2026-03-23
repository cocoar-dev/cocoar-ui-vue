<template>
  <CoarCodeBlock :code="code" language="typescript" :show-line-numbers="true" :collapsible="false" />
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const code = `import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;
</script>
