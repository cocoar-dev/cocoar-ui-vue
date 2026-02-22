import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const SpacingPage = defineComponent({
  name: 'SpacingPage',
  setup() {
    const radiusTokens = [
      { name: 'XXS', variable: '--coar-radius-xxs', value: '1px' },
      { name: 'XS', variable: '--coar-radius-xs', value: '2px' },
      { name: 'S', variable: '--coar-radius-s', value: '3px' },
      { name: 'M', variable: '--coar-radius-m', value: '4px' },
      { name: 'L', variable: '--coar-radius-l', value: '5px' },
      { name: 'XL', variable: '--coar-radius-xl', value: '6px' },
      { name: 'Full', variable: '--coar-radius-full', value: '999px' },
    ];
    const strokeTokens = [
      { name: 'XS', variable: '--coar-stroke-width-xs', value: '0.5px' },
      { name: 'S', variable: '--coar-stroke-width-s', value: '1px' },
      { name: 'M', variable: '--coar-stroke-width-m', value: '2px' },
      { name: 'L', variable: '--coar-stroke-width-l', value: '4px' },
    ];
    const spacingTokens = [
      { name: 'XXS', variable: '--coar-spacing-xxs', value: '2px' },
      { name: 'XS', variable: '--coar-spacing-xs', value: '4px' },
      { name: 'S', variable: '--coar-spacing-s', value: '8px' },
      { name: 'M', variable: '--coar-spacing-m', value: '16px' },
      { name: 'L', variable: '--coar-spacing-l', value: '24px' },
      { name: 'XL', variable: '--coar-spacing-xl', value: '32px' },
      { name: 'XXL', variable: '--coar-spacing-xxl', value: '48px' },
      { name: 'XXXL', variable: '--coar-spacing-xxxl', value: '64px' },
    ];
    const shadowTokens = [
      { name: 'XS', variable: '--coar-shadow-xs', desc: 'Subtle lift for hover states' },
      { name: 'S', variable: '--coar-shadow-s', desc: 'Cards and raised elements' },
      { name: 'M', variable: '--coar-shadow-m', desc: 'Dropdowns and popovers' },
      { name: 'L', variable: '--coar-shadow-l', desc: 'Modals and dialogs' },
      { name: 'XL', variable: '--coar-shadow-xl', desc: 'Elevated overlays' },
    ];
    return { radiusTokens, strokeTokens, spacingTokens, shadowTokens };
  },
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 1000px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Spacing & Effects</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">Spacing, sizing, and visual effects for consistent layouts and depth.</p>

      <!-- Border Radius -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Border Radius</h2>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-radius-[xxs|xs|s|m|l|xl|full]</code>
      <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px;">
        <div v-for="t in radiusTokens" :key="t.name" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <div :style="{ width: '56px', height: '56px', background: 'var(--coar-background-accent-primary, #3b82f6)', borderRadius: 'var(' + t.variable + ')' }"></div>
          <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
          <span style="font-size: 10px; color: #888;">{{ t.value }}</span>
        </div>
      </div>

      <!-- Stroke Width -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Stroke Width</h2>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-stroke-width-[xs|s|m|l]</code>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
        <div v-for="t in strokeTokens" :key="t.name" style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 60px; display: flex; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
            <span style="font-size: 10px; color: #888;">{{ t.value }}</span>
          </div>
          <div style="flex: 1; display: flex; align-items: center;">
            <div :style="{ height: 'var(' + t.variable + ')', width: '100%', background: 'var(--coar-border-neutral-primary, #333)', borderRadius: '1px' }"></div>
          </div>
        </div>
      </div>

      <!-- Spacing -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Spacing</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 4px;">Based on a 4px grid.</p>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-spacing-[xxs|xs|s|m|l|xl|xxl|xxxl]</code>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px;">
        <div v-for="t in spacingTokens" :key="t.name" style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 60px; display: flex; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
            <span style="font-size: 10px; color: #888;">{{ t.value }}</span>
          </div>
          <div :style="{ width: 'var(' + t.variable + ')', height: '20px', background: 'var(--coar-background-accent-tertiary, #dbeafe)', borderRadius: '3px', minWidth: '2px' }"></div>
        </div>
      </div>

      <!-- Shadows -->
      <h2 style="font-size: 20px; margin: 0 0 8px;">Shadows & Elevation</h2>
      <code style="font-size: 11px; color: #888; display: block; margin-bottom: 16px;">--coar-shadow-[xs|s|m|l|xl]</code>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px;">
        <div v-for="t in shadowTokens" :key="t.name" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <div :style="{ width: '100px', height: '64px', background: '#fff', borderRadius: '8px', boxShadow: 'var(' + t.variable + ')' }"></div>
          <span style="font-size: 13px; font-weight: 500;">{{ t.name }}</span>
          <span style="font-size: 10px; color: #888; text-align: center;">{{ t.desc }}</span>
        </div>
      </div>
    </div>
  `,
});

const meta: Meta<typeof SpacingPage> = {
  title: 'Foundations/Spacing & Effects',
  component: SpacingPage,
};

export default meta;
type Story = StoryObj<typeof SpacingPage>;

export const SpacingEffects: Story = {
  name: 'Spacing & Effects',
};
