import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import CoarEventAssignees from '../CoarEventAssignees.vue';
import { Temporal } from '../../../core';

describe('assignee contrast inputs', () => {
  it('retains authored fills, computes their ink, and keeps the generated legacy fill as fallback', async () => {
    const wrapper = mount(CoarEventAssignees, {
      props: {
        event: {
          id: 'assignees',
          start: Temporal.PlainDate.from('2026-04-15'),
          meta: { assignees: [
            { id: 'light', displayName: 'Light Fill', color: '#ffff00' },
            { id: 'dark', displayName: 'Dark Fill', color: '#334155' },
            { id: 'auto', displayName: 'Lea Huber' },
          ] },
        },
      },
    });
    const avatars = wrapper.findAll('.coar-event-assignees__avatar');
    expect(avatars[0].attributes('style')).toContain('background: #ffff00');
    expect(avatars[0].attributes('style')).toContain('--assignee-ink: #000000');
    expect(avatars[0].attributes('style')).toContain('--assignee-color: #ffff00');
    expect(avatars[0].find('.coar-event-assignees__initials').text()).toBe('LF');
    expect(avatars[1].attributes('style')).toContain('--assignee-ink: #ffffff');
    // happy-dom drops background declarations with a var()/hsl() fallback.
    // SSR verifies Vue's emitted CSS without that parser limitation.
    const html = await renderToString(h(CoarEventAssignees, { event: wrapper.props('event') }));
    expect(html).toMatch(/background:var\(--coar-calendar-avatar-auto-bg, hsl\(/);
    expect(wrapper.attributes('aria-label')).toBe('Light Fill, Dark Fill, Lea Huber');
    wrapper.unmount();
  });
});
