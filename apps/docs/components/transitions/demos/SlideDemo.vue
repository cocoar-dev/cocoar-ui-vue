<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
      <CoarRadioGroup v-model="direction" name="slide-dir" orientation="horizontal">
        <CoarRadioButton value="down">Down</CoarRadioButton>
        <CoarRadioButton value="up">Up</CoarRadioButton>
        <CoarRadioButton value="left">Left</CoarRadioButton>
        <CoarRadioButton value="right">Right</CoarRadioButton>
      </CoarRadioGroup>
    </div>
    <div class="demo-area">
      <CoarSlide :direction="direction">
        <CoarNote v-if="visible" variant="info">This content slides {{ direction }}.</CoarNote>
      </CoarSlide>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSlide, CoarButton, CoarNote, CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const visible = ref(true);
const direction = ref<'up' | 'down' | 'left' | 'right'>('down');
</script>

<style scoped>
.demo-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.demo-area { min-height: 60px; }
</style>
