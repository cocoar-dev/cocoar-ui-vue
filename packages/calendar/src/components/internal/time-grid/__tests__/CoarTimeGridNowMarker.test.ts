/**
 * Tests for `<CoarTimeGridNowMarker>` (internal/time-grid).
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarTimeGridNowMarker from '../CoarTimeGridNowMarker.vue';

describe('<CoarTimeGridNowMarker>', () => {
  it('positions itself via inline `top`', () => {
    const wrapper = mount(CoarTimeGridNowMarker, { props: { topPx: 540 } });
    const style = wrapper.find('.coar-time-grid-now-marker').attributes('style') ?? '';
    expect(style).toContain('top: 540px');
  });

  it('renders the dot + line decoration', () => {
    const wrapper = mount(CoarTimeGridNowMarker, { props: { topPx: 0 } });
    expect(wrapper.find('.coar-time-grid-now-marker__dot').exists()).toBe(true);
    expect(wrapper.find('.coar-time-grid-now-marker__line').exists()).toBe(true);
  });

  it('is aria-hidden', () => {
    const wrapper = mount(CoarTimeGridNowMarker, { props: { topPx: 0 } });
    expect(wrapper.find('.coar-time-grid-now-marker').attributes('aria-hidden')).toBe('true');
  });
});
