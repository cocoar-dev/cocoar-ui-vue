<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
    </div>
    <div class="demo-area">
      <CoarScale>
        <CoarCard v-if="visible" variant="outlined" padding="m">
          <strong>Scaled content</strong>
          <p>This card scales in with a subtle bounce and fades out.</p>
        </CoarCard>
      </CoarScale>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarScale, CoarButton, CoarCard } from '@cocoar/vue-ui';

const visible = ref(true);
</script>

<style scoped>
.demo-controls { margin-bottom: 16px; }
.demo-area { min-height: 80px; }
</style>
