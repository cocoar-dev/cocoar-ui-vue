<script setup lang="ts">
/**
 * The week board of the family calendar design.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import {
  BOARD_ALL_DAY_ROW,
  CoarCalendarBoard,
  useCalendar,
  weekBoardRows,
  type BoardRowsContext,
} from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone } from '../stories/calendar-family-data';
import { cardStyle, clock, isEveryone, titleOf } from './skin';

const props = defineProps<{ width: number; height: number }>();

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('de-AT').firstDayOfWeek(1);

const labels: Record<string, string> = {
  [BOARD_ALL_DAY_ROW]: 'Ganzer Tag',
  morning: 'Morgen',
  afternoon: 'Nachmittag',
  evening: 'Abend',
  meals: 'Essen',
};
const WD = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const meals = ['Suppe', 'Pasta', 'Curry', 'Ofengemüse', 'Fisch', 'Pizza', 'Braten'];
const rows = (context: BoardRowsContext) =>
  weekBoardRows({ dates: context.dates, periods: dayParts, timezone: context.timezone, extraRows: ['meals'] }).map(
    (row) => (row.key === BOARD_ALL_DAY_ROW ? { ...row, class: 'family-row-plain' } : row),
  );
</script>

<template>
  <div class="family-design family-design--board" :style="{ width: `${props.width}px`, height: `${props.height}px` }">
    <CoarCalendarBoard :builder="builder" :rows="rows" fill>
      <template #rowLabel="{ row }">{{ labels[row.key] }}</template>
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
        <div v-if="row.key === 'meals'" class="family-meal-mini">{{ meals[date.dayOfWeek - 1] }}</div>
      </template>
    </CoarCalendarBoard>
  </div>
</template>