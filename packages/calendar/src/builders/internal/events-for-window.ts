/**
 * Which events belong to a window — the read side of both pipelines.
 *
 * `events()` mode returns the whole source array (the layout buckets
 * by date, so the window is irrelevant); loader mode returns the
 * loader cache for that window key; recurring occurrences come from
 * the series cache for the same key. Used for the visible window
 * (`api.getVisibleEvents`) and for the neighbour windows the time
 * grid draws while it is being swiped (`api.getEventsForWindow`).
 */

import { toValue } from 'vue';
import type { CalendarEvent, ViewWindow } from '../../core';
import type { CalendarBuilderState } from '../calendar-builder-state';
import type { LoaderPipeline } from './loader-pipeline';
import type { SeriesPipeline } from './series-pipeline';

export function eventsForWindow<TMeta extends Record<string, unknown>>(
  state: Pick<CalendarBuilderState<TMeta>, 'events'>,
  loader: LoaderPipeline<TMeta>,
  series: SeriesPipeline<TMeta>,
  window: ViewWindow | null,
): CalendarEvent<TMeta>[] {
  const nonRecurring = nonRecurringFor(state, loader, window);
  const recurring = window ? (series.get(window) ?? []) : [];
  if (recurring.length === 0) return nonRecurring;
  if (nonRecurring.length === 0) return recurring;
  return nonRecurring.concat(recurring);
}

function nonRecurringFor<TMeta extends Record<string, unknown>>(
  state: Pick<CalendarBuilderState<TMeta>, 'events'>,
  loader: LoaderPipeline<TMeta>,
  window: ViewWindow | null,
): CalendarEvent<TMeta>[] {
  // Mode 1: events() source — the full source array.
  const source = state.events;
  if (source !== null) return toValue(source) ?? [];
  // Mode 2: loader cache — entries for the window if we have them,
  // else empty (the loader populates on its next invocation).
  if (!window) return [];
  return loader.get(window) ?? [];
}
