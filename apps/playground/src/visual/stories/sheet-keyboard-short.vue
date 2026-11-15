<script setup lang="ts">
// Less usable height than the fixed header and footer need, as on a landscape phone.
import SheetKeyboard from './sheet-keyboard.vue';
</script>

<template>
  <SheetKeyboard :inset="700" />
</template>
