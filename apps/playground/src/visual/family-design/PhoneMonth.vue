<script setup lang="ts">
/**
 * The month on a phone: a number and three marks per day, and the same
 * grid for "Frei finden". Styled only through public tokens, slots and
 * `dayClass`: ./skin.css.
 */
import './skin.css';
import { ref } from 'vue';
import { CoarMonthView, computeOccupancy, useMonthView, type Temporal } from '@cocoar/vue-calendar';
import { dayParts, familyEvents, familyToday, familyZone, peopleIds, whoOf } from '../stories/calendar-family-data';

const props = withDefaults(defineProps<{ finder?: boolean }>(), { finder: false });

const first = familyToday.with({ day: 1 });
const dates = Array.from({ length: 50 }, (_, i) => first.subtract({ days: 7 }).add({ days: i }));
const occupancy = computeOccupancy(familyEvents as never, {
  dates,
  periods: dayParts,
  resources: peopleIds,
  timezone: familyZone,
  resourcesOf: whoOf,
});
const isFit = (date: Temporal.PlainDate) =>
  date.month === familyToday.month &&
  date.day >= familyToday.day &&
  occupancy.isFree(date, 'evening', peopleIds);

const { builder } = useMonthView();
builder
  .events(ref([]))
  .date(ref(familyToday))
  .timezone(familyZone)
  .locale('de-AT')
  .firstDayOfWeek(1)
  .shadeWeekends(false)
  .monthRowSizing('fill')
  .weekdayFormat('short')
  .dayClass((date) => ({
    'family-phone-selected': !props.finder && date.equals(familyToday),
    'family-phone-fit': props.finder && isFit(date),
  }));
</script>

<template>
  <div
    class="family-design family-design--phone-month"
    :class="{ 'family-design--finder': finder }"
    style="width: 336px; height: 278px"
  >
    <CoarMonthView :builder="builder">
      <template #dayNumber="{ date, isToday, isOtherMonth }">
        <span
          class="family-n"
          :class="{
            'family-n--today': isToday && !finder,
            'family-n--other': isOtherMonth,
            'family-n--past': !isOtherMonth && !isToday && date.day < familyToday.day,
            'family-n--weekend': date.dayOfWeek >= 6,
            'family-n--fit': finder && isFit(date),
          }"
        >{{ date.day }}</span>
      </template>
      <template #dayContent="{ date, isOtherMonth }">
        <span v-if="!finder" class="family-marks" :style="{ visibility: isOtherMonth ? 'hidden' : 'visible', margin: 0 }">
          <i
            v-for="part in dayParts"
            :key="part.key"
            :style="occupancy.busyResources(date, part.key).length ? { background: 'var(--muted)' } : undefined"
          />
        </span>
      </template>
    </CoarMonthView>
  </div>
</template>
