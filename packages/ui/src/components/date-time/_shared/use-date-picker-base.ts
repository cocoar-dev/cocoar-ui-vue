/**
 * Shared composable for date picker components.
 *
 * Provides locale resolution, date format resolution, and common reactive state
 * for all date/datetime picker variants.
 */
import { computed, ref, type Ref, type ComputedRef } from 'vue';
import { useL10n, useTimezone } from '@cocoar/vue-localization';

import type { DateFormatConfig } from './types';
import { coarDetectDateFormatPatternFromIntl } from './date-helpers';

/** Common props shared by all date picker variants. */
export interface DatePickerBaseProps {
  label?: string;
  placeholder?: string;
  size?: 'xs' | 's' | 'm' | 'l';
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  clearable?: boolean;
  showWeekNumbers?: boolean;
  highlightWeekends?: boolean;
  locale?: string;
  dateFormat?: DateFormatConfig;
}

/** Default date format config fallback. */
const DEFAULT_DATE_FORMAT: DateFormatConfig = {
  pattern: 'dd.mm.yyyy',
  firstDayOfWeek: 1,
};

/**
 * Core composable for date picker components.
 *
 * Resolution chains:
 * - Locale: explicit prop → localization service → navigator.language → 'en'
 * - Date format: explicit prop → l10n store → Intl detection → default (dd.mm.yyyy, Monday)
 */
export function useDatePickerBase(props: {
  locale?: Ref<string | undefined> | ComputedRef<string | undefined>;
  dateFormat?: Ref<DateFormatConfig | undefined> | ComputedRef<DateFormatConfig | undefined>;
}) {
  const l10n = useL10n();
  const tz = useTimezone();

  /** Resolved locale — explicit → service → browser → 'en' */
  const effectiveLocale = computed<string>(() => {
    if (props.locale?.value) return props.locale.value;
    return l10n.language.value || navigator.language || 'en';
  });

  /** Resolved date format config — explicit → l10n store → Intl → default */
  const effectiveDateFormat = computed<DateFormatConfig>(() => {
    if (props.dateFormat?.value) return props.dateFormat.value;

    // Try from l10n store
    const localeData = l10n.localeData.value;
    if (localeData?.date) {
      return {
        pattern: localeData.date.pattern,
        firstDayOfWeek: localeData.date.firstDayOfWeek === 0 ? 7 : localeData.date.firstDayOfWeek as 1 | 7,
      };
    }

    // Detect from Intl
    const detected = coarDetectDateFormatPatternFromIntl(effectiveLocale.value);
    if (detected) {
      return { pattern: detected, firstDayOfWeek: DEFAULT_DATE_FORMAT.firstDayOfWeek };
    }

    return DEFAULT_DATE_FORMAT;
  });

  /** Date separator derived from format pattern */
  const separator = computed(() => {
    const p = effectiveDateFormat.value.pattern;
    if (p.includes('.')) return '.';
    if (p.includes('/')) return '/';
    return '-';
  });

  /** Panel open state */
  const isOpen = ref(false);

  /** Open the picker panel */
  function open() {
    isOpen.value = true;
  }

  /** Close the picker panel */
  function close() {
    isOpen.value = false;
  }

  /** Toggle the picker panel */
  function toggle() {
    isOpen.value = !isOpen.value;
  }

  return {
    effectiveLocale,
    effectiveDateFormat,
    separator,
    timezone: tz.timezone,
    isOpen,
    open,
    close,
    toggle,
  };
}
