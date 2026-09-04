/**
 * Default translation catalogs for every `coar.calendar.*` key the
 * package reads through `useI18n().t(key, params, fallback)`.
 *
 * The components carry English fallbacks inline, so a host that
 * never registers anything still renders English. What a host DOES
 * have to do today is maintain the German (or any other) side by
 * hand — ~40 keys that drift every time a view gains a label. This
 * file makes the catalog a package concern:
 *
 *   import { createCalendarTranslationSource } from '@cocoar/vue-calendar';
 *   const loc = createCoarLocalization({ defaultLanguage: 'de' });
 *   loc.service.addTranslationSource(createCalendarTranslationSource());
 *
 * A host's own source registered AFTER this one wins per key
 * (`CoarTranslationStore.updateTranslations` merges), so app-
 * specific wording still overrides the defaults.
 *
 * Deliberately NOT here: date / time / weekday names — those come
 * from `Intl` (C6), never from a catalog.
 *
 * `messages.test.ts` scans the source tree and fails when a key is
 * used in a component but missing here, in either language.
 */

import type { CoarTranslationSource } from '@cocoar/vue-localization';

export type CalendarMessageCatalog = Readonly<Record<string, string>>;

const en: CalendarMessageCatalog = {
  'coar.calendar.nav.today': 'Today',
  'coar.calendar.nav.previous': 'Previous',
  'coar.calendar.nav.next': 'Next',
  'coar.calendar.view.year': 'Year',
  'coar.calendar.view.month': 'Month',
  'coar.calendar.view.monthList': 'List',
  'coar.calendar.view.week': 'Week',
  'coar.calendar.view.workWeek': 'Work week',
  'coar.calendar.view.day': 'Day',
  'coar.calendar.view.dayAgenda': 'Day agenda',
  'coar.calendar.view.agenda': 'Agenda',
  'coar.calendar.view.timeline': 'Timeline',
  'coar.calendar.viewSwitcher.label': 'Change view',
  'coar.calendar.monthMode.compact': 'Compact',
  'coar.calendar.monthMode.stacked': 'Stacked',
  'coar.calendar.monthMode.details': 'Details',
  'coar.calendar.monthMode.list': 'List',
  'coar.calendar.dayMode.single': 'One day',
  'coar.calendar.dayMode.multiDay': 'Multi-day',
  'coar.calendar.dayAgenda.weekLabel': 'Week',
  'coar.calendar.month.gridLabel': 'Month grid',
  'coar.calendar.month.cellMenu': 'Day actions',
  'coar.calendar.month.expandRow': 'Show more events',
  'coar.calendar.month.collapseRow': 'Show fewer events',
  'coar.calendar.monthList.empty': 'No events',
  'coar.calendar.timegrid.allDay': 'all-day',
  'coar.calendar.timegrid.dayLabel': 'Day view',
  'coar.calendar.timegrid.multiDayLabel': 'Multi-day view',
  'coar.calendar.timegrid.weekLabel': 'Week view',
  'coar.calendar.timegrid.allDayMore': '{count} more all-day events — show all',
  'coar.calendar.timegrid.allDayCollapse': 'Show fewer',
  'coar.calendar.agenda.allDay': 'All day',
  'coar.calendar.agenda.continuationTag': '(cont.)',
  'coar.calendar.agenda.listLabel': 'Agenda',
  'coar.calendar.agenda.todayBadge': 'today',
  'coar.calendar.agenda.viewLabel': 'Agenda view',
  'coar.calendar.zoneSwitcher.label': 'Display timezone',
  'coar.calendar.zoneSwitcher.browserSuffix': 'browser',
  'coar.calendar.event.utcLabel': 'Global',
  'coar.calendar.event.utcGlobalHint': 'Global event — same instant worldwide',
  'coar.calendar.event.crossZoneHint': 'Source zone: {zone}',
  'coar.calendar.a11y.unnamedEvent': 'Event',
  'coar.calendar.a11y.kbdPreviewLabel':
    '{title} preview — Arrow keys to move, Enter to commit, Escape to cancel',
  'coar.calendar.a11y.moveCancelled': 'Move cancelled',
  'coar.calendar.a11y.eventMovedTo': '{title} moved to {when}',
};

const de: CalendarMessageCatalog = {
  'coar.calendar.nav.today': 'Heute',
  'coar.calendar.nav.previous': 'Zurück',
  'coar.calendar.nav.next': 'Weiter',
  'coar.calendar.view.year': 'Jahr',
  'coar.calendar.view.month': 'Monat',
  'coar.calendar.view.monthList': 'Liste',
  'coar.calendar.view.week': 'Woche',
  'coar.calendar.view.workWeek': 'Arbeitswoche',
  'coar.calendar.view.day': 'Tag',
  'coar.calendar.view.dayAgenda': 'Tagesagenda',
  'coar.calendar.view.agenda': 'Agenda',
  'coar.calendar.view.timeline': 'Zeitleiste',
  'coar.calendar.viewSwitcher.label': 'Ansicht wechseln',
  'coar.calendar.monthMode.compact': 'Kompakt',
  'coar.calendar.monthMode.stacked': 'Gestapelt',
  'coar.calendar.monthMode.details': 'Details',
  'coar.calendar.monthMode.list': 'Liste',
  'coar.calendar.dayMode.single': 'Einen Tag',
  'coar.calendar.dayMode.multiDay': 'Mehrtägig',
  'coar.calendar.dayAgenda.weekLabel': 'Woche',
  'coar.calendar.month.gridLabel': 'Monatsraster',
  'coar.calendar.month.cellMenu': 'Tagesaktionen',
  'coar.calendar.month.expandRow': 'Mehr Termine anzeigen',
  'coar.calendar.month.collapseRow': 'Weniger Termine anzeigen',
  'coar.calendar.monthList.empty': 'Keine Termine',
  'coar.calendar.timegrid.allDay': 'ganztägig',
  'coar.calendar.timegrid.dayLabel': 'Tagesansicht',
  'coar.calendar.timegrid.multiDayLabel': 'Mehrtagesansicht',
  'coar.calendar.timegrid.weekLabel': 'Wochenansicht',
  'coar.calendar.timegrid.allDayMore': '{count} weitere ganztägige Termine — alle anzeigen',
  'coar.calendar.timegrid.allDayCollapse': 'Weniger anzeigen',
  'coar.calendar.agenda.allDay': 'Ganztägig',
  'coar.calendar.agenda.continuationTag': '(Forts.)',
  'coar.calendar.agenda.listLabel': 'Agenda',
  'coar.calendar.agenda.todayBadge': 'heute',
  'coar.calendar.agenda.viewLabel': 'Agenda-Ansicht',
  'coar.calendar.zoneSwitcher.label': 'Anzeige-Zeitzone',
  'coar.calendar.zoneSwitcher.browserSuffix': 'Browser',
  'coar.calendar.event.utcLabel': 'Global',
  'coar.calendar.event.utcGlobalHint': 'Globaler Termin — weltweit derselbe Moment',
  'coar.calendar.event.crossZoneHint': 'Zeitzone des Termins: {zone}',
  'coar.calendar.a11y.unnamedEvent': 'Termin',
  'coar.calendar.a11y.kbdPreviewLabel':
    '{title} Vorschau — Pfeiltasten zum Verschieben, Eingabe zum Übernehmen, Escape zum Abbrechen',
  'coar.calendar.a11y.moveCancelled': 'Verschieben abgebrochen',
  'coar.calendar.a11y.eventMovedTo': '{title} verschoben auf {when}',
};

/**
 * The shipped catalogs, keyed by base language. Flat
 * `'coar.calendar.<group>.<name>'` keys — the same shape a host
 * would write by hand, so merging into an app catalog is a spread.
 */
export const calendarMessages: Readonly<Record<'en' | 'de', CalendarMessageCatalog>> = { en, de };

/**
 * A `CoarTranslationSource` serving the shipped catalogs. Regional
 * tags resolve to their base language (`de-AT` → `de`); unknown
 * languages yield `null` so the service moves on to the next source
 * and the inline English fallbacks take over.
 */
export function createCalendarTranslationSource(): CoarTranslationSource {
  return {
    load(language: string) {
      const base = language.split('-')[0].toLowerCase();
      const catalog = (calendarMessages as Record<string, CalendarMessageCatalog | undefined>)[
        base
      ];
      return Promise.resolve(catalog ? { ...catalog } : null);
    },
  };
}
