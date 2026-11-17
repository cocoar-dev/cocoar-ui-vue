<script setup lang="ts">
/**
 * Compact profile: the classic month (Details) with the selected day, today, weekends,
 * "+N" cells — and the day sheet of Tue Apr 14 opened by the story itself (a click on its
 * "+N"), so the sheet's header, close button and list are part of the picture (without focus ring).
 * Data: ./compact-calendar-data.ts.
 */
import { onMounted, ref } from 'vue';
import { CoarMonthView, useMonthView } from '@cocoar/vue-calendar';
import { displayZone, selectedDay, today } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useMonthView();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .selectedDate(selectedDay);

const root = ref<HTMLElement | null>(null);
onMounted(() => {
  // The cells render after their metrics are measured; open as soon as Apr 14's "+N" exists.
  const open = () => {
    const button = root.value?.querySelector<HTMLButtonElement>(
      '[data-day-key="2026-04-14"] .coar-month-cell__overflow',
    );
    if (button) {
      button.click();
      settle();
    } else requestAnimationFrame(open);
  };
  // The sheet focuses itself; a scripted click is no pointer, so the browser would show a
  // focus ring the picture is not about. Blur once it has focus (blur does not close it).
  const settle = () => {
    const sheet = root.value?.querySelector<HTMLElement>('.coar-month-day-overlay');
    if (sheet && document.activeElement === sheet) sheet.blur();
    else requestAnimationFrame(settle);
  };
  open();
});
</script>

<template>
  <div ref="root" class="coar-compact" style="height: 836px">
    <CoarMonthView :builder="builder" />
  </div>
</template>
