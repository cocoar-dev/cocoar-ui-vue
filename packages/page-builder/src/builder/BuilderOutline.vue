<script setup lang="ts">
import { inject } from 'vue';
import { BUILDER_API } from './builderContext';
import BuilderOutlineNode from './BuilderOutlineNode.vue';

defineOptions({ name: 'BuilderOutline' });

const builder = inject(BUILDER_API)!;
</script>

<template>
  <div class="pb-outline-wrap">
    <BuilderOutlineNode :node="builder.schema.value" :path="[]" :depth="0" />
  </div>
</template>

<style scoped>
.pb-outline-wrap {
  overflow-y: auto;
  height: 100%;
  padding: 4px 0;
}
</style>
