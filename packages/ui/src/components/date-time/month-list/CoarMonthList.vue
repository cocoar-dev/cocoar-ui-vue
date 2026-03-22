<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Temporal } from '@js-temporal/polyfill';
import { useL10n } from '@cocoar/vue-localization';

import CoarIcon from '../../icon/CoarIcon.vue';
import { vScrollbar } from '../../scrollbar';

interface MonthItem {
  month: number;
  name: string;
  isActive: boolean;
  yearMonth: Temporal.PlainYearMonth;
}

const props = withDefaults(
  defineProps<{
    /** Locale for month name formatting */
    locale?: string;
    /** Minimum selectable year */
    minYear?: number;
    /** Maximum selectable year */
    maxYear?: number;
  }>(),
  {
    locale: undefined,
    minYear: () => Temporal.Now.plainDateISO().year - 100,
    maxYear: () => Temporal.Now.plainDateISO().year + 50,
  },
);

const activeMonth = defineModel<Temporal.PlainYearMonth>('activeMonth', {
  default: () => Temporal.Now.plainDateISO().toPlainYearMonth(),
});

const emit = defineEmits<{
  monthSelected: [yearMonth: Temporal.PlainYearMonth];
  yearChanged: [year: number];
}>();

// Localization
const l10n = useL10n();
const effectiveLocale = computed(() => props.locale ?? l10n?.language.value ?? navigator.language);

// Computed
const currentYear = computed(() => activeMonth.value.year);
const currentMonthNumber = computed(() => activeMonth.value.month);

const isPrevYearDisabled = computed(() => currentYear.value <= props.minYear);
const isNextYearDisabled = computed(() => currentYear.value >= props.maxYear);

const monthItems = computed((): MonthItem[] => {
  const year = currentYear.value;
  const active = currentMonthNumber.value;
  const locale = effectiveLocale.value;
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });

  const items: MonthItem[] = [];
  for (let m = 1; m <= 12; m++) {
    items.push({
      month: m,
      name: formatter.format(new Date(year, m - 1, 1)),
      isActive: m === active,
      yearMonth: Temporal.PlainYearMonth.from({ year, month: m }),
    });
  }
  return items;
});

// Actions
function previousYear(): void {
  if (isPrevYearDisabled.value) return;
  const newYear = activeMonth.value.year - 1;
  activeMonth.value = Temporal.PlainYearMonth.from({
    year: newYear,
    month: activeMonth.value.month,
  });
  emit('yearChanged', newYear);
}

function nextYear(): void {
  if (isNextYearDisabled.value) return;
  const newYear = activeMonth.value.year + 1;
  activeMonth.value = Temporal.PlainYearMonth.from({
    year: newYear,
    month: activeMonth.value.month,
  });
  emit('yearChanged', newYear);
}

function selectMonth(yearMonth: Temporal.PlainYearMonth): void {
  activeMonth.value = yearMonth;
  emit('monthSelected', yearMonth);
}

// Scroll to active month
const monthsContainerRef = ref<HTMLElement | null>(null);

function scrollToActiveMonth(): void {
  const container = monthsContainerRef.value;
  if (!container) return;
  const activeBtn = container.querySelector('.coar-month-list__month--active') as HTMLElement | null;
  if (!activeBtn) return;

  const btnTop = activeBtn.offsetTop;
  const btnH = activeBtn.offsetHeight;
  const containerH = container.clientHeight;
  const scrollTop = container.scrollTop;

  if (btnTop < scrollTop) {
    container.scrollTop = btnTop;
  } else if (btnTop + btnH > scrollTop + containerH) {
    container.scrollTop = btnTop + btnH - containerH;
  }
}

watch(activeMonth, () => {
  nextTick(() => scrollToActiveMonth());
});

onMounted(() => {
  setTimeout(() => scrollToActiveMonth(), 50);
});
</script>

<template>
  <div class="coar-month-list-host">
    <div class="coar-month-list">
      <!-- Year Stepper -->
      <div class="coar-month-list__year-stepper">
        <button
          type="button"
          class="coar-month-list__year-btn"
          :disabled="isPrevYearDisabled"
          aria-label="Previous year"
          @click="previousYear"
        >
          <CoarIcon name="chevron-left" size="s" />
        </button>

        <span class="coar-month-list__year">{{ currentYear }}</span>

        <button
          type="button"
          class="coar-month-list__year-btn"
          :disabled="isNextYearDisabled"
          aria-label="Next year"
          @click="nextYear"
        >
          <CoarIcon name="chevron-right" size="s" />
        </button>
      </div>

      <!-- Month List -->
      <div
        ref="monthsContainerRef"
        v-scrollbar="{ overflowX: 'hidden', autoHide: 'leave' }"
        class="coar-month-list__months"
        role="listbox"
        aria-label="Months"
      >
        <button
          v-for="item in monthItems"
          :key="item.month"
          type="button"
          class="coar-month-list__month"
          :class="{ 'coar-month-list__month--active': item.isActive }"
          role="option"
          :aria-selected="item.isActive"
          @click="selectMonth(item.yearMonth)"
        >
          {{ item.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-month-list-host {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.coar-month-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--coar-spacing-s);
  background: transparent;
}

/* ========================================
   YEAR STEPPER
   ======================================== */

.coar-month-list__year-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--coar-spacing-xs);
  margin-bottom: var(--coar-spacing-m);
  padding-bottom: var(--coar-spacing-s);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  flex-shrink: 0;
}

.coar-month-list__year-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  opacity: 0.35;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-month-list__year-btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-icon-neutral-primary);
  opacity: 1;
}

.coar-month-list__year-btn:disabled {
  color: var(--coar-icon-neutral-disabled);
  cursor: not-allowed;
}

.coar-month-list__year {
  flex: 1;
  text-align: center;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-bold-weight);
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-primary);
}

/* ========================================
   MONTH LIST
   ======================================== */

.coar-month-list__months {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-2xs);
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.coar-month-list__month {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 32px;
  padding: 0 var(--coar-spacing-s);
  border: none;
  border-radius: var(--coar-radius-xs);
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--coar-duration-fast) var(--coar-ease-out),
    color var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
}

.coar-month-list__month:hover {
  background: var(--coar-background-neutral-secondary);
}

.coar-month-list__month--active {
  color: var(--coar-text-accent-primary);
  font-weight: var(--coar-body-small-bold-weight);
}

@media (prefers-reduced-motion: reduce) {
  .coar-month-list__year-btn,
  .coar-month-list__month {
    transition: none;
  }
}
</style>
