<script setup lang="ts">
/**
 * Who has when, on a phone: a row per person, three marks per day.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  computeOccupancy,
  useCalendar,
  type BoardRow,
  type BoardRowsContext,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, people, peopleIds, whoOf } from '../stories/calendar-family-data';
import { personStyle } from './skin';

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('de-AT').firstDayOfWeek(1);

const WD = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const rows = (context: BoardRowsContext): BoardRow[] =>
  peopleIds.map((id) => ({ key: id, dates: context.dates, kind: 'custom' }));
const dates = Array.from({ length: 7 }, (_, i) => familyToday.subtract({ days: 3 }).add({ days: i }));
const occupancy = computeOccupancy(familyEvents as never, {
  dates,
  periods: dayParts,
  resources: peopleIds,
  timezone: familyZone,
  resourcesOf: whoOf,
});
const initial = (id: string) => people.find((p) => p.id === id)?.label[0];
</script>

<template>
  <div class="family-design family-design--phone-who family-who" style="width: 328px">
    <CoarCalendarBoard :builder="builder" :rows="rows">
      <template #rowLabel="{ row }">
        <span class="family-person"><i :style="personStyle(row.key)">{{ initial(row.key) }}</i></span>
      </template>
      <template #columnHeader="{ date, isToday }">
        <span class="family-who-head">
          {{ date && WD[date.dayOfWeek - 1] }}
          <b :class="{ 'family-who-today': isToday }">{{ date?.day }}</b>
        </span>
      </template>
      <template #cell="{ row, date, isToday }">
        <span class="family-ticks" :class="{ 'family-ticks--today': isToday }">
          <i
            v-for="part in dayParts"
            :key="part.key"
            :style="occupancy.busyResources(date, part.key).includes(row.key) ? personStyle(row.key) : undefined"
          />
        </span>
      </template>
    </CoarCalendarBoard>
  </div>
</template>
