<script setup lang="ts">
/**
 * The week per person of the family calendar design.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import {
  BOARD_UNASSIGNED_ROW,
  CoarCalendarBoard,
  computeOccupancy,
  resourceWeekRows,
  useCalendar,
  type BoardRowsContext,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, people, peopleIds, whoOf } from '../stories/calendar-family-data';
import { cardStyle, clock, isEveryone, titleOf } from './skin';

const props = defineProps<{ width: number; height: number }>();

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('de-AT').firstDayOfWeek(1);

const WD = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const rows = (context: BoardRowsContext) =>
  resourceWeekRows({ dates: context.dates, resources: peopleIds, resourcesOf: whoOf, extraRows: ['free'] }).map(
    (row) => (row.key === 'free' ? { ...row, class: 'family-row-free' } : row),
  );
const dates = Array.from({ length: 7 }, (_, i) => familyToday.subtract({ days: 3 }).add({ days: i }));
const occupancy = computeOccupancy(familyEvents as never, {
  dates,
  periods: dayParts,
  resources: peopleIds,
  timezone: familyZone,
  resourcesOf: whoOf,
});
const label = (key: string) =>
  key === 'free' ? 'ALLE FREI' : key === BOARD_UNASSIGNED_ROW ? 'Niemand' : people.find((p) => p.id === key)?.label;
const names: Record<string, string> = { morning: 'Morgen', afternoon: 'Nachm.', evening: 'Abend' };
</script>

<template>
  <div class="family-design family-design--board family-design--who" :style="{ width: `${props.width}px`, height: `${props.height}px` }">
    <CoarCalendarBoard :builder="builder" :rows="rows" fill>
      <template #rowLabel="{ row }">{{ label(row.key) }}</template>
      <template #columnHeader="{ date, isToday }">
        <small class="family-weekday">{{ date && WD[date.dayOfWeek - 1] }}</small>
        <b
          class="family-day-number"
          :class="{ 'family-day-number--today': isToday, 'family-day-number--past': date && date.day < familyToday.day }"
        >{{ date?.day }}</b>
      </template>
      <template #bar="{ event }">
        <div class="family-bar" :style="cardStyle(event)">{{ titleOf(event) }}</div>
      </template>
      <template #event="{ event }">
        <div class="family-card" :class="{ 'family-card--all': isEveryone(event) }" :style="cardStyle(event)">
          <time>{{ clock(event) }}</time>
          <b>{{ titleOf(event) }}</b>
        </div>
      </template>
      <template #cell="{ row, date }">
        <template v-if="row.key === 'free'">
          <span
            v-for="part in dayParts.filter((p) => occupancy.isFree(date, p.key, peopleIds))"
            :key="part.key"
            class="family-free"
          >{{ names[part.key] }}</span>
        </template>
      </template>
    </CoarCalendarBoard>
  </div>
</template>