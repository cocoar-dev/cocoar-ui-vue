/**
 * Smoke + case-by-case tests for the drop-math kernel.
 *
 * In v2, `applyMoveToEvent` is the SINGLE drop pipeline (C2): mouse,
 * keyboard, and touch drop paths all reach it once. There is no
 * historical `useCalendarDnd` re-export to compare against — the
 * function is consumed directly from `core/dnd/move-math`.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from '../../types';
import {
  applyMoveToEvent,
  MIN_RESIZE_MINUTES,
  type CalendarDragMode,
  type CalendarDropTarget,
} from '../move-math';
import { pd, zdt } from '../../../__test-utils__/event-fixtures';

const target = (
  date: string,
  minutes: number | null,
  displayZone = 'UTC',
): CalendarDropTarget => ({
  date,
  minutes,
  displayZone,
  valid: true,
});

describe('core/dnd/move-math', () => {
  it('exposes MIN_RESIZE_MINUTES = 15', () => {
    expect(MIN_RESIZE_MINUTES).toBe(15);
  });

  describe('timed move', () => {
    it('shifts a 1h event to a target slot', () => {
      const ev: CalendarEvent = {
        id: 'e1',
        start: zdt('2026-04-15T10:00:00'),
        end: zdt('2026-04-15T11:00:00'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-16', 11 * 60), 'timed');
      expect((next.start as Temporal.ZonedDateTime).toString()).toBe(
        '2026-04-16T11:00:00+00:00[UTC]',
      );
      expect((next.end as Temporal.ZonedDateTime).toString()).toBe(
        '2026-04-16T12:00:00+00:00[UTC]',
      );
    });

    it('clamps a too-late timed-resize-start to MIN_RESIZE_MINUTES before end', () => {
      const ev: CalendarEvent = {
        id: 'e1',
        start: zdt('2026-04-15T10:00:00'),
        end: zdt('2026-04-15T10:30:00'),
      };
      // Try to drag start to 10:30 — should clamp to 10:15 (15 min before end).
      const next = applyMoveToEvent(
        ev,
        target('2026-04-15', 10 * 60 + 30),
        'timed-resize-start' as CalendarDragMode,
      );
      expect((next.start as Temporal.ZonedDateTime).toString()).toBe(
        '2026-04-15T10:15:00+00:00[UTC]',
      );
      expect((next.end as Temporal.ZonedDateTime).toString()).toBe(
        '2026-04-15T10:30:00+00:00[UTC]',
      );
    });
  });

  describe('all-day move', () => {
    it('shifts a 3-day all-day event by the start delta', () => {
      const ev: CalendarEvent = {
        id: 'allday',
        start: pd('2026-04-13'),
        end: pd('2026-04-16'),
      };
      const next = applyMoveToEvent(ev, target('2026-04-15', null), 'allDay');
      expect((next.start as Temporal.PlainDate).toString()).toBe('2026-04-15');
      expect((next.end as Temporal.PlainDate).toString()).toBe('2026-04-18');
    });
  });

  describe('all-day resize', () => {
    it('caps allDay-resize-start so start cannot reach end', () => {
      const ev: CalendarEvent = {
        id: 'allday',
        start: pd('2026-04-13'),
        end: pd('2026-04-16'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-04-16', null),
        'allDay-resize-start',
      );
      expect((next.start as Temporal.PlainDate).toString()).toBe('2026-04-15');
      expect((next.end as Temporal.PlainDate).toString()).toBe('2026-04-16');
    });

    it('exposes drop-target as last visible day for allDay-resize-end', () => {
      const ev: CalendarEvent = {
        id: 'allday',
        start: pd('2026-04-13'),
        end: pd('2026-04-16'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-04-17', null),
        'allDay-resize-end',
      );
      expect((next.start as Temporal.PlainDate).toString()).toBe('2026-04-13');
      expect((next.end as Temporal.PlainDate).toString()).toBe('2026-04-18');
    });
  });

  describe('display-zone anchoring (Audit Finding #1 fix)', () => {
    it('Vienna summer: drop on 14:00 row → 14:00 Vienna in source zone', () => {
      // 10:00 Vienna in summer = 08:00 UTC.
      const ev: CalendarEvent = {
        id: 'meet',
        start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-06-15T11:00:00', 'Europe/Vienna'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-06-15', 14 * 60, 'Europe/Vienna'),
        'timed',
      );
      const start = next.start as Temporal.ZonedDateTime;
      // Should land at 14:00 Vienna (12:00 UTC), preserving the
      // Europe/Vienna source zone.
      expect(start.timeZoneId).toBe('Europe/Vienna');
      expect(start.toInstant().toString()).toBe('2026-06-15T12:00:00Z');
    });

    it('Vienna winter: drop on 14:00 row → 14:00 Vienna in source zone (DST-correct)', () => {
      const ev: CalendarEvent = {
        id: 'meet',
        start: zdt('2026-12-15T10:00:00', 'Europe/Vienna'),
        end: zdt('2026-12-15T11:00:00', 'Europe/Vienna'),
      };
      const next = applyMoveToEvent(
        ev,
        target('2026-12-15', 14 * 60, 'Europe/Vienna'),
        'timed',
      );
      const start = next.start as Temporal.ZonedDateTime;
      expect(start.timeZoneId).toBe('Europe/Vienna');
      expect(start.toInstant().toString()).toBe('2026-12-15T13:00:00Z');
    });
  });
});
