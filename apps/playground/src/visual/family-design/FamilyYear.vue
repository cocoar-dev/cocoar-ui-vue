<script setup lang="ts">
/**
 * The year wall planner of the family calendar design.
 * Styled only through public tokens and slots: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  useCalendar,
  yearWallColumns,
  yearWallRows,
  type BoardRowsContext,
} from '@cocoar/vue-calendar';
import { familyEvents, familyToday, familyZone } from '../stories/calendar-family-data';
import { cardStyle, titleOf } from './skin';

const props = withDefaults(
  defineProps<{ width: number; height: number; labelWidth?: number; titles?: boolean; everyDay?: boolean }>(),
  { labelWidth: 44, titles: true, everyDay: true },
);

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('de-AT').firstDayOfWeek(1);

const SHOWN = [1, 5, 10, 15, 20, 25, 30];
const columns = yearWallColumns().map((column, index) =>
  props.everyDay || SHOWN.includes(index + 1) ? column : { ...column, label: '' },
);
const rows = (context: BoardRowsContext) => yearWallRows({ year: context.year, locale: 'de-AT' });
</script>

<template>
  <div class="family-design family-design--year"
    :class="{ 'family-design--year-compact': !titles }" :style="{ width: `${props.width}px`, height: `${props.height}px`, '--coar-calendar-board-label-width': `${props.labelWidth}px` }">
    <CoarCalendarBoard :builder="builder" :rows="rows" :columns="columns" range="year" fill>
      <template #bar="{ event }">
        <div class="family-band" :style="cardStyle(event)">{{ titles ? titleOf(event) : '' }}</div>
      </template>
      <template #cell="{ events }">
        <span
          v-if="events.length"
          :style="{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)' }"
        />
      </template>
    </CoarCalendarBoard>
  </div>
</template>