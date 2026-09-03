<template>
  <div class="demo">
    <CoarDataList
      v-model:search="search"
      v-model:sort="sort"
      v-model:selected="selected"
      :items="tickets"
      :item-key="(ticket) => ticket.id"
      :search-by="['title', 'customer', 'assignee', 'status']"
      :sort-options="sortOptions"
      selection="multiple"
      show-search
      show-sort
      search-highlight
      :gap="gap"
      :dividers="gap === 0"
      bordered
      height="22rem"
      aria-label="Tickets"
      @item-activate="open"
    >
      <template #toolbar-right>
        <CoarBadge variant="neutral">{{ selected.length }} selected</CoarBadge>
      </template>

      <template #item="{ item }">
        <div class="ticket">
          <div class="ticket__primary">
            <span class="ticket__title">{{ item.title }}</span>
            <CoarTag :variant="statusVariant[item.status]" size="s">{{ item.status }}</CoarTag>
            <span class="ticket__due" :class="{ 'ticket__due--late': item.overdue }">{{ item.due }}</span>
          </div>
          <div class="ticket__secondary">
            <span class="ticket__customer">{{ item.customer }}</span>
            <span class="ticket__assignee">{{ item.assignee }}</span>
            <span class="ticket__summary">{{ item.summary }}</span>
          </div>
        </div>
      </template>
    </CoarDataList>
    <div class="demo__controls">
      <span class="demo__label">Row gap</span>
      <CoarSegmentedControl v-model="gap" :options="gapOptions" size="s" aria-label="Row gap" />
      <p class="demo__hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarDataList, CoarSegmentedControl, CoarTag } from '@cocoar/vue-ui';
import type { CoarDataListItemEvent, CoarDataListKey, CoarDataListSort, CoarDataListSortOption } from '@cocoar/vue-ui';

type Status = 'Open' | 'In progress' | 'Blocked' | 'Done';

interface Ticket {
  id: number;
  title: string;
  customer: string;
  assignee: string;
  status: Status;
  due: string;
  overdue: boolean;
  summary: string;
  priority: number;
}

const customers = ['Vienna Gateway', 'Danube Relay', 'Pacific Node', 'Atlantic Edge', 'Nordic Mesh'];
const people = ['Ada', 'Grace', 'Linus', 'Margaret', 'Tim'];
const statuses: Status[] = ['Open', 'In progress', 'Blocked', 'Done'];
const summaries = [
  'Customer reports intermittent timeouts after the last deployment; logs attached.',
  'Needs a decision on the retention policy before the migration can continue.',
  'Waiting for the vendor to confirm the certificate rotation window.',
  'Short follow-up call requested, no blocking issues.',
];

const tickets: Ticket[] = Array.from({ length: 60 }, (_, index) => {
  const day = 1 + ((index * 7) % 28);
  return {
    id: 1000 + index,
    title: `Ticket #${1000 + index}: ${['Sync failure', 'Access request', 'Billing question', 'Feature wish'][index % 4]}`,
    customer: customers[index % customers.length],
    assignee: people[(index * 3) % people.length],
    status: statuses[index % statuses.length],
    due: `2026-09-${String(day).padStart(2, '0')}`,
    overdue: index % 5 === 0,
    summary: summaries[index % summaries.length],
    priority: (index * 13) % 5,
  };
});

const statusVariant: Record<Status, 'info' | 'warning' | 'error' | 'success'> = {
  Open: 'info',
  'In progress': 'warning',
  Blocked: 'error',
  Done: 'success',
};

const sortOptions: CoarDataListSortOption<Ticket>[] = [
  { key: 'title', label: 'Title' },
  { key: 'customer', label: 'Customer' },
  { key: 'due', label: 'Due date' },
  { key: 'priority', label: 'Priority', defaultDirection: 'desc' },
];

const search = ref('');
const sort = ref<CoarDataListSort | null>({ key: 'due', direction: 'asc' });
const selected = ref<CoarDataListKey[]>([]);
const hint = ref('Double-click or press Enter to open a ticket.');

// Gap is a list prop, not a template margin: the measured row height includes it.
// With a gap, dividers are switched off — the space separates the rows on its own.
const gap = ref(0);
const gapOptions = [
  { value: 0, label: 'None' },
  { value: 4, label: '4 px' },
  { value: 8, label: '8 px' },
  { value: 16, label: '16 px' },
];

function open(event: CoarDataListItemEvent<Ticket>) {
  hint.value = `Opened ${event.item.title}`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__controls {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  flex-wrap: wrap;
}

.demo__label {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin: 0 0 0 auto;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

/* The item template owns its layout. Container queries adapt to the list's width,
   not the viewport's, so the same template works inside a narrow side panel. */
.ticket {
  container-type: inline-size;
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.ticket__primary,
.ticket__secondary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.ticket__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.ticket__due {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
}

.ticket__due--late {
  color: var(--coar-text-error-primary, #c0392b);
}

.ticket__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.ticket__customer,
.ticket__assignee {
  flex-shrink: 0;
}

.ticket__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@container (max-width: 480px) {
  .ticket__summary {
    display: none;
  }
}
</style>
