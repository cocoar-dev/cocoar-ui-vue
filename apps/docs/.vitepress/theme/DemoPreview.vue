<template>
  <CoarCard variant="outlined" class="demo-card">
    <div class="demo-preview">
      <slot />
    </div>
    <template v-if="decodedCode" #inset>
      <CoarCodeBlock
        borderless
        :code="decodedCode"
        :language="lang"
        :show-line-numbers="false"
        :collapsed="true"
      />
    </template>
  </CoarCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const props = defineProps<{
  title?: string;
  description?: string;
  code?: string;
  showCode?: string;
  suffixName?: string;
  absolutePath?: string;
  relativePath?: string;
}>();

const decodedCode = computed(() => {
  if (!props.code) return '';
  return decodeURI(props.code);
});

const lang = computed(() => props.suffixName || 'html');
</script>

<style scoped>
.demo-card {
  margin: 16px 0;
}

.demo-preview {
  padding: 8px 0;
}
</style>
