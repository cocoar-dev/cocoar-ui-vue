<script setup lang="ts">
import { Temporal, type CalendarEvent } from '@cocoar/vue-calendar';
import CoarEventAssignees from '../../../../../packages/calendar/src/components/internal/CoarEventAssignees.vue';
import CoarTimeAxisMarker from '../../../../../packages/calendar/src/components/internal/time-grid/CoarTimeAxisMarker.vue';
import CoarTimeSelectionLayer from '../../../../../packages/calendar/src/components/internal/time-grid/CoarTimeSelectionLayer.vue';

const orientations = ['vertical', 'horizontal'] as const;
const colours = ['#b53373', '#1c805d'];
const part = new URLSearchParams(location.search).get('part') ?? 'marker';
const toPx = (minute: number) => minute;
const sizes = ['xs', 's', 'm'] as const;
const event: CalendarEvent = {
  id: 'assignees',
  start: Temporal.PlainDate.from('2026-04-15'),
  meta: {
    assignees: [
      { id: 'ada', displayName: 'Ada Lovelace' },
      { id: 'grace', displayName: 'Grace Hopper' },
      { id: 'linus', displayName: 'Linus Torvalds', color: 'var(--test-assignee-colour, #1c805d)' },
      { id: 'margaret', displayName: 'Margaret Hamilton', color: 0xffcc00 },
      { id: 'donald', displayName: 'Donald Knuth' },
      { id: 'barbara', displayName: 'Barbara Liskov' },
    ],
  },
};
</script>

<template>
  <main class="coar-calendar calendar-data" data-calendar-data>
    <template v-if="part === 'marker'">
      <template v-for="orientation in orientations" :key="orientation">
        <section
          v-for="(colour, index) in colours"
          :key="colour"
          :data-axis-case="`${orientation}-${index}`"
          :style="{ '--coar-calendar-draft-color': colour }"
        >
          <CoarTimeAxisMarker
            :orientation="orientation"
            :mark="{
              type: 'range', tone: 'draft', startPx: 40, endPx: 210,
              startLabel: '09:00', endLabel: '10:00', durationLabel: '1 h',
            }"
          />
        </section>
      </template>
    </template>
    <template v-if="part === 'selection'">
      <template v-for="orientation in orientations" :key="orientation">
        <section
          v-for="(colour, index) in colours"
          :key="colour"
          :data-selection-case="`${orientation}-${index}`"
          :style="{ '--coar-calendar-selection-color': colour }"
        >
          <CoarTimeSelectionLayer
            :orientation="orientation"
            :to-px="toPx"
            :selection="{ start: 40, end: 100, phase: index === 0 ? 'hover' : 'drag' }"
            :draft="null"
          />
          <span data-selection-reference />
        </section>
      </template>
    </template>
    <template v-if="part === 'avatar'">
      <section v-for="size in sizes" :key="size" :data-avatar-case="size">
        <CoarEventAssignees :event="event" :size="size" :max="4" />
      </section>
    </template>
    <span data-compact-reference />
    <span data-compact-border-reference />
    <span data-compact-avatar-reference />
  </main>
</template>

<style scoped>
.calendar-data {
  display: grid;
  grid-template-columns: 360px 360px;
  gap: 16px;
  width: max-content;
  padding: 16px;
  background: var(--coar-calendar-bg, var(--coar-background-neutral-primary, #fff));
  font-family: var(--coar-body-base-family, sans-serif);
}
section {
  position: relative;
  height: 240px;
}
[data-compact-reference] {
  color: var(--coar-text-accent-primary, #2563eb);
}
[data-compact-border-reference] {
  color: var(--coar-border-accent-primary, #2563eb);
}
[data-selection-reference] {
  color: color-mix(in srgb, var(--coar-calendar-selection-color) 55%, transparent);
}
[data-compact-avatar-reference] {
  background-color: var(--coar-background-accent-primary, #334155);
  color: var(--coar-text-on-accent, #fff);
}
</style>
