<template>
  <div class="demo">
    <CoarDataList
      ref="listRef"
      v-model:search="search"
      :items="entries"
      :item-key="(entry) => entry.id"
      :search-by="['message', 'level']"
      :sort-options="sortOptions"
      selection="single"
      show-search
      show-sort
      dividers
      bordered
      height="20rem"
      :item-size="44"
    >
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" @click="listRef?.scrollToIndex(entries.length - 1, 'end')">
          Jump to last
        </CoarButton>
      </template>

      <template #item="{ item }">
        <div class="log" :class="`log--${item.level}`">
          <span class="log__time">{{ item.time }}</span>
          <span class="log__level">{{ item.level }}</span>
          <span class="log__message">{{ item.message }}</span>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ entries.length.toLocaleString() }} rows, heights measured per row — only the visible window is in the DOM.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarDataList } from '@cocoar/vue-ui';
import type { CoarDataListSortOption } from '@cocoar/vue-ui';

type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  id: number;
  time: string;
  level: Level;
  message: string;
}

const messages = [
  'Connection established',
  'Retrying request after transient failure; backoff window increased to 4 seconds while the upstream recovers',
  'Cache miss',
  'Certificate expires in 14 days — rotation scheduled by the platform team, no action required from tenants',
  'Queue drained',
];

const entries: LogEntry[] = Array.from({ length: 20000 }, (_, index) => ({
  id: index,
  time: new Date(Date.UTC(2026, 8, 1, 0, 0, index)).toISOString().slice(11, 19),
  level: index % 47 === 0 ? 'error' : index % 11 === 0 ? 'warn' : 'info',
  message: messages[index % messages.length],
}));

const sortOptions: CoarDataListSortOption<LogEntry>[] = [
  { key: 'time', label: 'Time' },
  { key: 'level', label: 'Level' },
];

const search = ref('');
const listRef = ref<InstanceType<typeof CoarDataList> | null>(null);
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.log {
  display: grid;
  grid-template-columns: 5rem 3.5rem minmax(0, 1fr);
  gap: var(--coar-spacing-s);
  align-items: baseline;
  font-family: var(--coar-font-family-mono, monospace);
  font-size: var(--coar-body-caption-size);
}

.log__time {
  color: var(--coar-text-neutral-secondary);
  font-variant-numeric: tabular-nums;
}

.log__level {
  text-transform: uppercase;
  font-weight: var(--coar-font-weight-semibold);
}

.log--warn .log__level {
  color: var(--coar-text-warning-primary, #b26a00);
}

.log--error .log__level {
  color: var(--coar-text-error-primary, #c0392b);
}

.log__message {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
