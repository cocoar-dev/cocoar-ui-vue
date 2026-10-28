/**
 * `useTimeGridPresentation` — the axis-free half of a time grid.
 *
 * Shared by the vertical grid (`<CoarTimeGrid>`, days as columns) and
 * the horizontal one (`<CoarTimeRows>`, days as rows): locale chain,
 * today / now clock, day and hour labels, event titles, colours, aria
 * labels and the drag announcements. Nothing here knows which way time
 * runs — the geometry stays in the components.
 *
 * Internal — not exported from the package barrel.
 */

import { computed, onBeforeUnmount, onMounted, ref, watchEffect, type ComputedRef } from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import {
  Temporal,
  buildFormatOptions,
  eventInkColor,
  isAllDayEvent,
  nowInZone,
  todayInZone,
  type CalendarEvent,
  type EventTextContrastPolicy,
} from '../core';
import { useA11yAnnouncer } from './useA11yAnnouncer';
import { agendaTimeLabel } from '../components/internal/agenda/agendaTimeLabel';
import type { TimeGridEventDropPayload } from './useTimeGridDnd';

export interface TimeGridPresentationState {
  timezone: string;
  locale: string | undefined;
  dateStyle: 'short' | 'medium' | 'long' | 'full' | undefined;
  timeStyle: 'short' | 'medium' | 'long' | undefined;
  hour12: boolean | undefined;
  eventTextContrast: EventTextContrastPolicy;
}

export interface UseTimeGridPresentationOptions {
  state: ComputedRef<TimeGridPresentationState>;
  /** `[startHour, endHour]` of the rendered range. */
  timeRange: ComputedRef<readonly [number, number]>;
}

export function useTimeGridPresentation<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(opts: UseTimeGridPresentationOptions) {
  const { t } = useI18n();
  const { state, timeRange } = opts;
  const timezone = computed(() => state.value.timezone);

  // Locale chain (Article 9): builder.locale() > host @cocoar/vue-localization > 'en-US'.
  const localization = useLocalization();
  const locale = computed<string>(
    () => state.value.locale ?? localization?.language.value ?? 'en-US',
  );

  // ─── Today / now ────────────────────────────────────────────────
  const today = ref<Temporal.PlainDate>(todayInZone(timezone.value));
  const now = ref<Temporal.ZonedDateTime>(nowInZone(timezone.value));
  let nowTimer = 0;
  onMounted(() => {
    // Update every 30s — sub-second is overkill for a clock indicator.
    nowTimer = window.setInterval(() => {
      today.value = todayInZone(timezone.value);
      now.value = nowInZone(timezone.value);
    }, 30_000);
  });
  onBeforeUnmount(() => {
    if (nowTimer) clearInterval(nowTimer);
  });
  watchEffect(() => {
    // Re-pick today/now when the timezone changes.
    today.value = todayInZone(timezone.value);
    now.value = nowInZone(timezone.value);
  });

  /** Minutes from the start of the rendered range, `null` outside it. */
  const nowMinutesFromGridStart = computed(() => {
    const minutes = now.value.hour * 60 + now.value.minute - timeRange.value[0] * 60;
    const total = (timeRange.value[1] - timeRange.value[0]) * 60;
    if (minutes < 0 || minutes >= total) return null;
    return minutes;
  });

  function isToday(date: Temporal.PlainDate): boolean {
    return Temporal.PlainDate.compare(date, today.value) === 0;
  }
  function isWeekend(date: Temporal.PlainDate): boolean {
    const dow = date.dayOfWeek; // 1..7 ISO
    return dow === 6 || dow === 7;
  }

  // ─── Labels ─────────────────────────────────────────────────────
  const dayHeaderFormatter = computed(
    () =>
      new Intl.DateTimeFormat(
        locale.value,
        buildFormatOptions(
          { weekday: 'short', day: 'numeric', month: 'short' },
          // No timeStyle for a date-only header.
          { dateStyle: state.value.dateStyle, hour12: state.value.hour12 },
        ),
      ),
  );
  function formatDayHeader(date: Temporal.PlainDate): string {
    // UTC interpretation is fine — only day-of-week + day-of-month.
    return dayHeaderFormatter.value.format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
  }

  const hourLabels = computed(() => {
    // Article 9: the hour axis honours `builder.hour12()` AND `timeStyle()`;
    // `buildFormatOptions` prunes `hour` when a timeStyle is set.
    const fmt = new Intl.DateTimeFormat(
      locale.value,
      buildFormatOptions(
        { hour: 'numeric' },
        { timeStyle: state.value.timeStyle, hour12: state.value.hour12 },
      ),
    );
    const labels: { hour: number; label: string }[] = [];
    for (let h = timeRange.value[0]; h <= timeRange.value[1]; h++) {
      labels.push({ hour: h, label: fmt.format(new Date(2024, 0, 1, h)) });
    }
    return labels;
  });

  const cardTimeFormatter = computed(
    () =>
      new Intl.DateTimeFormat(
        locale.value,
        buildFormatOptions(
          { hour: 'numeric', minute: '2-digit', timeZone: timezone.value },
          { timeStyle: state.value.timeStyle, hour12: state.value.hour12 },
        ),
      ),
  );
  function cardTimeLabel(event: CalendarEvent<TMeta>): string {
    return agendaTimeLabel(event, (ms) => cardTimeFormatter.value.format(ms), '');
  }
  function cardLocation(event: CalendarEvent<TMeta>): string | undefined {
    const meta = event.meta as { location?: unknown } | undefined;
    return typeof meta?.location === 'string' && meta.location ? meta.location : undefined;
  }

  // ─── Event surface ──────────────────────────────────────────────
  function eventTitle(event: CalendarEvent<TMeta>): string {
    const meta = event.meta as { title?: unknown } | undefined;
    return typeof meta?.title === 'string' ? meta.title : '(untitled)';
  }
  function eventColor(event: CalendarEvent<TMeta>): string | undefined {
    const meta = event.meta as { color?: unknown } | undefined;
    return typeof meta?.color === 'string' ? meta.color : undefined;
  }
  function eventBgFor(event: CalendarEvent<TMeta>): string {
    return (
      eventColor(event) ??
      'var(--coar-calendar-event-default-bg, var(--coar-color-accent-soft, #93c5fd))'
    );
  }
  function eventBorderFor(event: CalendarEvent<TMeta>): string {
    return eventColor(event) ?? 'var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))';
  }
  /** Text colour for an event surface — `meta.textColor` or the policy's black/white. */
  function eventInkFor(event: CalendarEvent<TMeta>): string {
    const meta = event.meta as { textColor?: unknown } | undefined;
    return eventInkColor({
      background: eventBgFor(event),
      textColor: meta?.textColor,
      policy: state.value.eventTextContrast,
    });
  }

  /** The card label's formatter, once per locale / zone / style. `null` on invalid options. */
  const ariaFormatter = computed(() => {
    try {
      return new Intl.DateTimeFormat(
        locale.value,
        buildFormatOptions(
          {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone.value,
          },
          {
            dateStyle: state.value.dateStyle,
            timeStyle: state.value.timeStyle,
            hour12: state.value.hour12,
          },
        ),
      );
    } catch {
      return null;
    }
  });

  /**
   * Screen-reader label for an event card: the title plus a short
   * start–end summary, locale-aware.
   */
  function eventAriaLabel(event: CalendarEvent<TMeta>): string {
    const title = eventTitle(event);
    if (isAllDayEvent(event)) {
      return `${title} (${t('coar.calendar.timegrid.allDay', undefined, 'all-day')})`;
    }
    const fmt = ariaFormatter.value;
    if (!fmt) return title;
    try {
      const range = (
        fmt as Intl.DateTimeFormat & {
          formatRange?: (a: Date, b: Date) => string;
        }
      ).formatRange;
      if (event.start instanceof Temporal.PlainDate) return title;
      const startD = new Date(event.start.epochMilliseconds);
      const endD =
        event.end && !(event.end instanceof Temporal.PlainDate)
          ? new Date(event.end.epochMilliseconds)
          : startD;
      return range
        ? `${title}, ${range.call(fmt, startD, endD)}`
        : `${title}, ${fmt.format(startD)} – ${fmt.format(endD)}`;
    } catch {
      return title;
    }
  }

  /**
   * Aria-label for the preview ghost during a keyboard drag — tells
   * the screen-reader user the keys they have.
   */
  function kbdPreviewAriaLabel(event: CalendarEvent<TMeta>): string {
    const meta = event.meta as { title?: unknown } | undefined;
    const rawTitle = typeof meta?.title === 'string' ? meta.title : undefined;
    const title = rawTitle ?? t('coar.calendar.a11y.unnamedEvent', undefined, 'Event');
    return t(
      'coar.calendar.a11y.kbdPreviewLabel',
      { title },
      `${title} preview — Arrow keys to move, Enter to commit, Escape to cancel`,
    );
  }

  // ─── Drag announcements (live region) ──────────────────────────
  const a11y = useA11yAnnouncer();

  function formatAnnouncementWhen(payload: TimeGridEventDropPayload<TMeta>): string {
    const isAllDay = payload.next.start instanceof Temporal.PlainDate;
    try {
      const fmt = new Intl.DateTimeFormat(
        locale.value,
        buildFormatOptions(
          isAllDay
            ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
            : {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: timezone.value,
              },
          {
            dateStyle: state.value.dateStyle,
            timeStyle: state.value.timeStyle,
            hour12: state.value.hour12,
          },
        ),
      );
      if (isAllDay) {
        const pd = payload.next.start as Temporal.PlainDate;
        return fmt.format(new Date(Date.UTC(pd.year, pd.month - 1, pd.day)));
      }
      const zdt = (payload.next.start as Temporal.ZonedDateTime).withTimeZone(timezone.value);
      return fmt.format(new Date(zdt.epochMilliseconds));
    } catch {
      return payload.target.date;
    }
  }

  function onA11yAnnounce(
    kind: 'committed' | 'cancelled',
    payload?: TimeGridEventDropPayload<TMeta>,
  ): void {
    if (kind === 'cancelled') {
      a11y.announce(t('coar.calendar.a11y.moveCancelled', undefined, 'Move cancelled'));
      return;
    }
    if (!payload) return;
    const meta = payload.event.meta as { title?: unknown } | undefined;
    const title =
      typeof meta?.title === 'string'
        ? meta.title
        : t('coar.calendar.a11y.unnamedEvent', undefined, 'Event');
    const when = formatAnnouncementWhen(payload);
    a11y.announce(
      t('coar.calendar.a11y.eventMovedTo', { title, when }, `${title} moved to ${when}`),
    );
  }

  return {
    t,
    locale,
    today,
    now,
    nowMinutesFromGridStart,
    isToday,
    isWeekend,
    formatDayHeader,
    hourLabels,
    cardTimeLabel,
    cardLocation,
    eventTitle,
    eventBgFor,
    eventBorderFor,
    eventInkFor,
    eventAriaLabel,
    kbdPreviewAriaLabel,
    a11y,
    onA11yAnnounce,
  };
}
