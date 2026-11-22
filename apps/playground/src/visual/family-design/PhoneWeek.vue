<script setup lang="ts">
/**
 * The week on a phone: seven rows, one per day. A board with one column.
 * Styled only through public tokens, slots and row classes: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import {
  CoarCalendarBoard,
  useCalendar,
  type BoardRow,
  type BoardRowsContext,
  type CalendarEvent,
} from '@cocoar/vue-calendar';
import { familyEvents, familyToday, familyZone } from '../stories/calendar-family-data';
import { cardStyle, clock, titleOf } from './skin';

const { builder } = useCalendar();
builder.events(ref(familyEvents) as never).date(ref(familyToday)).timezone(familyZone).locale('de-AT').firstDayOfWeek(1);

const WD = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const rows = (context: BoardRowsContext): BoardRow[] =>
  context.dates.map((date) => {
    const state = date.equals(familyToday) ? 'today' : date.day < familyToday.day ? 'past' : 'plain';
    return {
      key: date.toString(),
      dates: [date],
      kind: 'cells',
      showCellEvents: false,
      class: `family-phone-row family-phone-row--${state}`,
      match: (event: CalendarEvent) => 'timeZoneId' in event.start,
    };
  });
</script>

<template>
  <div class="family-design family-design--phone-week" style="width: 350px">
    <CoarCalendarBoard :builder="builder" :rows="rows" hide-header>
      <template #rowLabel="{ row }">
        <span class="family-phone-day">
          <small class="family-phone-weekday">{{ WD[row.dates[0]!.dayOfWeek - 1] }}</small>
          <b class="family-phone-number">{{ row.dates[0]!.day }}</b>
        </span>
      </template>
      <template #cell="{ events }">
        <div class="family-phone-content">
          <div class="family-phone-lines">
            <div v-for="event in events.slice(0, 2)" :key="event.id" class="family-phone-line" :style="cardStyle(event)">
              <i /><time>{{ clock(event) }}</time><span>{{ titleOf(event) }}</span>
            </div>
            <span v-if="events.length > 2" class="family-phone-more">+ {{ events.length - 2 }} weiterer</span>
          </div>
          <span class="family-phone-thumb" aria-hidden="true">🍴</span>
        </div>
      </template>
    </CoarCalendarBoard>
  </div>
</template>
