<template>
  <CoarDataList :builder="builder">
    <!-- The whole item is the template: box, states, controls. -->
    <template #item="{ item, selected, focused, dragging, expanded, hasChildren, depth, toggle, toggleExpanded }">
      <div
        class="ticket"
        :class="{
          'ticket--selected': selected,
          'ticket--focused': focused,
          'ticket--dragging': dragging,
          'ticket--child': depth > 0,
        }"
      >
        <CoarCheckbox :model-value="selected" size="s" @update:model-value="toggle()" @click.stop />
        <div class="ticket__body">
          <div class="ticket__head">
            <span class="ticket__title">{{ item.title }}</span>
            <CoarTag :variant="item.done ? 'success' : 'warning'" size="s">{{ item.done ? 'Done' : 'Open' }}</CoarTag>
          </div>
          <span class="ticket__meta">{{ item.owner }} · {{ item.due }}</span>
        </div>
        <CoarButton
          v-if="hasChildren"
          variant="ghost"
          size="xs"
          :icon-start="expanded ? 'chevron-up' : 'chevron-down'"
          :aria-label="expanded ? 'Hide sub-tasks' : `Show ${item.subTasks!.length} sub-tasks`"
          @click.stop="toggleExpanded()"
        />
      </div>
    </template>
  </CoarDataList>
</template>

<script setup lang="ts">
import { CoarButton, CoarCheckbox, CoarDataList, CoarTag, useDataList } from '@cocoar/vue-ui';

interface Ticket {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
  subTasks?: Ticket[];
}

const tickets: Ticket[] = [
  { id: 't1', title: 'Rework the onboarding mail', owner: 'Ada', due: '2026-09-12', done: false, subTasks: [
    { id: 't1a', title: 'Draft copy', owner: 'Ada', due: '2026-09-08', done: true },
    { id: 't1b', title: 'Review with legal', owner: 'Grace', due: '2026-09-10', done: false },
  ] },
  { id: 't2', title: 'Fix the login timeout', owner: 'Linus', due: '2026-09-09', done: true },
  { id: 't3', title: 'Design the empty state', owner: 'Margaret', due: '2026-09-15', done: false },
  { id: 't4', title: 'Update dependencies', owner: 'Tim', due: '2026-09-20', done: false },
];

const { builder } = useDataList<Ticket>();
builder
  .items(tickets)
  .itemKey((ticket) => ticket.id)
  .children((ticket) => ticket.subTasks)
  .expanded(['t1'])
  .selection('multiple')
  .unstyledItems()
  .hideExpandToggle()
  .nestingStyle('none')
  .gap(6)
  .height('20rem')
  .ariaLabel('Tickets');
</script>

<style scoped>
.ticket {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral);
  border-left: 3px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, #fff);
  min-width: 0;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.ticket--child {
  padding-block: var(--coar-spacing-xs);
  border-style: dashed;
}

.ticket--selected {
  border-left-color: var(--coar-border-accent-primary);
  background: var(--coar-background-accent-tertiary);
}

.ticket--focused {
  box-shadow: 0 0 0 2px var(--coar-focus-color);
}

.ticket--dragging {
  opacity: 0.5;
}

.ticket__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.ticket__head {
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

.ticket__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
