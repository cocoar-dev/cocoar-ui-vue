import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarThemeScope from './CoarThemeScope.vue';

describe('CoarThemeScope', () => {
  it('maps stable theme inputs to local Cocoar tokens', () => {
    const wrapper = mount(CoarThemeScope, {
      props: {
        mode: 'light',
        theme: {
          accent: '#10b981',
          error: '#e5484d',
          buttonRadius: 999,
          inputRadius: '14px',
          cardRadius: 20,
        },
      },
      slots: { default: '<button>Inside</button>' },
    });

    expect(wrapper.classes()).toContain('light-mode');
    expect(wrapper.attributes('style')).toContain('--coar-accent: #10b981');
    expect(wrapper.attributes('style')).toContain('--coar-error: #e5484d');
    expect(wrapper.attributes('style')).toContain('--coar-button-radius: 999px');
    expect(wrapper.attributes('style')).toContain('--coar-input-radius: 14px');
    expect(wrapper.attributes('style')).toContain('--coar-card-radius: 20px');
  });

  it('reacts to the active ancestor mode in auto mode', async () => {
    document.documentElement.classList.add('dark-mode');
    const wrapper = mount(CoarThemeScope, { attachTo: document.body });
    await nextTick();
    expect(wrapper.classes()).toContain('dark-mode');

    document.documentElement.classList.remove('dark-mode');
    document.documentElement.classList.add('light-mode');
    await nextTick();
    await nextTick();
    expect(wrapper.classes()).toContain('light-mode');
    wrapper.unmount();
    document.documentElement.classList.remove('light-mode');
  });

  it('maps host-owned font families onto the semantic typography tokens', () => {
    const wrapper = mount(CoarThemeScope, {
      props: { theme: { bodyFontFamily: 'Instrument Sans', titleFontFamily: 'Fraunces' } },
    });
    const style = wrapper.attributes('style');
    expect(style).toContain('--coar-body-base-family: Instrument Sans');
    expect(style).toContain('--coar-headings-heading-family: Fraunces');
  });
});
