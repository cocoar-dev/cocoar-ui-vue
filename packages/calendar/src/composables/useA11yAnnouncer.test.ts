/**
 * Tests for `useA11yAnnouncer`. Each `announce(...)` call must
 * produce a *changed* `message.value` even if the text is the
 * same as the previous one — otherwise `aria-live` won't
 * re-announce.
 */

import { describe, expect, it } from 'vitest';
import { useA11yAnnouncer } from './useA11yAnnouncer';

describe('useA11yAnnouncer', () => {
  it('starts with an empty message', () => {
    const { message } = useA11yAnnouncer();
    expect(message.value).toBe('');
  });

  it('updates message on each announce call', () => {
    const { message, announce } = useA11yAnnouncer();
    announce('Standup moved to Wednesday');
    expect(message.value.startsWith('Standup moved to Wednesday')).toBe(true);
  });

  it('produces a different value on consecutive identical announcements', () => {
    const { message, announce } = useA11yAnnouncer();
    announce('Move cancelled');
    const a = message.value;
    announce('Move cancelled');
    const b = message.value;
    expect(a).not.toBe(b);
    // Both still start with the human-readable phrase.
    expect(a.startsWith('Move cancelled')).toBe(true);
    expect(b.startsWith('Move cancelled')).toBe(true);
  });

  it('toggles strictly so the same text alternates between two distinct forms', () => {
    const { message, announce } = useA11yAnnouncer();
    announce('hello');
    const v1 = message.value;
    announce('hello');
    const v2 = message.value;
    announce('hello');
    const v3 = message.value;
    // v1 ≠ v2, v2 ≠ v3, but v1 should equal v3 (toggle of toggle).
    expect(v1).not.toBe(v2);
    expect(v2).not.toBe(v3);
    expect(v1).toBe(v3);
  });
});
