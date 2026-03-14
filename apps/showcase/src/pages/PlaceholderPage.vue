<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">{{ title }}</h1>
      <p class="page-description">This page is coming soon.</p>
    </header>
  </div>
</template>
