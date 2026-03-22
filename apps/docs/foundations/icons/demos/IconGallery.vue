<template>
  <div>
    <p style="margin: 0 0 8px; font-size: 14px; color: var(--coar-text-neutral-secondary);">
      Browse all {{ allIcons.length }} available icons. Click an icon to copy its name.
    </p>
    <div class="search-wrapper">
      <CoarTextInput v-model="search" placeholder="Search icons..." :clearable="true" />
    </div>

    <div v-if="filteredIcons.length > 0" class="icons-grid">
      <button
        v-for="icon in filteredIcons"
        :key="icon"
        class="icon-item"
        :class="{ 'icon-item--copied': copiedIcon === icon }"
        :title="`Click to copy: ${icon}`"
        @click="copyIconName(icon)"
      >
        <CoarIcon :name="icon" size="l" />
        <span class="icon-name">{{ icon }}</span>
        <span v-if="copiedIcon === icon" class="icon-copied">Copied!</span>
      </button>
    </div>
    <p v-else style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin-top: 16px;">
      No icons match "{{ search }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarTextInput, CoarIcon, CORE_ICONS } from '@cocoar/vue-ui';

const search = ref('');
const copiedIcon = ref<string | null>(null);

const allIcons = Object.keys(CORE_ICONS);

const filteredIcons = computed(() => {
  const q = search.value.toLowerCase().trim();
  return q ? allIcons.filter(name => name.includes(q)) : allIcons;
});

function copyIconName(name: string) {
  navigator.clipboard.writeText(name).catch(() => {});
  copiedIcon.value = name;
  setTimeout(() => { copiedIcon.value = null; }, 1500);
}
</script>

<style scoped>
.search-wrapper {
  margin-bottom: 16px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 4px;
  max-height: 480px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--coar-radius-s);
  cursor: pointer;
  transition: background 100ms ease-out;
  color: var(--coar-text-neutral-primary);
  position: relative;
}

.icon-item:hover {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-border-neutral-secondary);
}

.icon-item--copied {
  background: var(--coar-background-semantic-success-subtle);
  border-color: var(--coar-background-semantic-success-bold);
}

.icon-name {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  text-align: center;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
}

.icon-copied {
  position: absolute;
  bottom: 2px;
  font-size: 9px;
  color: var(--coar-text-neutral-secondary);
  font-weight: 600;
}
</style>
