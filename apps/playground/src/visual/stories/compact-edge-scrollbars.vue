<script setup lang="ts">
import './compact-fonts';
import { CoarButton, vScrollbar } from '@cocoar/vue-ui';
</script>

<template>
  <div class="vs-row" style="align-items: start; gap: 24px">
    <section v-for="profile in ['legacy', 'compact']" :key="profile"
      :class="{ 'coar-compact': profile === 'compact' }"
      :data-scrollbar="profile" style="width: 320px"
    >
      <h2 class="vs-title">{{ profile }} · real OverlayScrollbars</h2>
      <div v-scrollbar="{ autoHide: 'never', overflowX: 'hidden', defer: false }"
        data-scroll-host
        style="height: 220px; overflow: auto; background: var(--coar-background-neutral-primary)"
      >
        <div class="vs-stack">
          <CoarButton v-for="index in 24" :key="index" variant="ghost" size="s" icon-start="file-text">Eintrag {{ index }}</CoarButton>
        </div>
      </div>
    </section>
  </div>
</template>
