<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
      <CoarRadioGroup v-model="duration" name="fade-duration" orientation="horizontal">
        <CoarRadioButton value="fast">Fast</CoarRadioButton>
        <CoarRadioButton value="normal">Normal</CoarRadioButton>
        <CoarRadioButton value="slow">Slow</CoarRadioButton>
      </CoarRadioGroup>
    </div>
    <div class="demo-area">
      <CoarFade :duration="duration">
        <CoarNote v-if="visible" variant="accent">This content fades in and out.</CoarNote>
      </CoarFade>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFade, CoarButton, CoarNote, CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const visible = ref(true);
const duration = ref('normal');
</script>

<style scoped>
.demo-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.demo-area { min-height: 60px; }
</style>
