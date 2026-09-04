import { describe, expect, it } from 'vitest';
import { agendaTimeLabel, AGENDA_SPAN_SEPARATOR } from './agendaTimeLabel';
import { pd, zdt } from '../../../__test-utils__/event-fixtures';

const fmt = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

describe('agendaTimeLabel', () => {
  it('all-day → the all-day label, never a time', () => {
    const label = agendaTimeLabel(
      { id: 'a', start: pd('2026-06-15'), end: pd('2026-06-16') },
      fmt,
      'Ganztägig',
    );
    expect(label).toBe('Ganztägig');
  });

  it('timed with end → "start – end" with an en dash', () => {
    const label = agendaTimeLabel(
      { id: 't', start: zdt('2026-06-15T09:00'), end: zdt('2026-06-15T10:30') },
      fmt,
      'All day',
    );
    expect(label).toBe('09:00 – 10:30');
    expect(label).toContain(AGENDA_SPAN_SEPARATOR);
    expect(AGENDA_SPAN_SEPARATOR).toBe(' – ');
  });

  it('timed WITHOUT end (point event) → start only', () => {
    const label = agendaTimeLabel({ id: 'p', start: zdt('2026-06-15T09:00') }, fmt, 'All day');
    expect(label).toBe('09:00');
  });

  it('multi-day timed → still start – end (wall times of the endpoints)', () => {
    const label = agendaTimeLabel(
      { id: 'm', start: zdt('2026-06-15T22:00'), end: zdt('2026-06-16T02:00') },
      fmt,
      'All day',
    );
    expect(label).toBe('22:00 – 02:00');
  });
});
