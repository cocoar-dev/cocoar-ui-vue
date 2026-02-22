import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const ColorPrimitives = defineComponent({
  name: 'ColorPrimitives',
  setup() {
    const palettes = [
      { name: 'Gray', variable: '--coar-color-gray' },
      { name: 'Slate (Brand)', variable: '--coar-color-slate' },
      { name: 'Accent (Themeable)', variable: '--coar-color-accent' },
      { name: 'Green', variable: '--coar-color-green' },
      { name: 'Red', variable: '--coar-color-red' },
      { name: 'Amber', variable: '--coar-color-amber' },
    ];
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

    const semanticGroups = [
      {
        category: 'Background — Accent',
        colors: [
          { name: 'Primary', variable: '--coar-background-accent-primary', desc: 'Primary action backgrounds' },
          { name: 'Secondary', variable: '--coar-background-accent-secondary', desc: 'Active/selected states' },
          { name: 'Tertiary', variable: '--coar-background-accent-tertiary', desc: 'Subtle accent backgrounds' },
          { name: 'Hover', variable: '--coar-background-accent-hover', desc: 'Hover state' },
          { name: 'Active', variable: '--coar-background-accent-active', desc: 'Active/pressed state' },
        ],
      },
      {
        category: 'Background — Brand',
        colors: [
          { name: 'Primary', variable: '--coar-background-brand-primary', desc: 'Primary brand backgrounds' },
          { name: 'Secondary', variable: '--coar-background-brand-secondary', desc: 'Secondary brand' },
          { name: 'Tertiary', variable: '--coar-background-brand-tertiary', desc: 'Subtle brand' },
        ],
      },
      {
        category: 'Background — Neutral',
        colors: [
          { name: 'Primary', variable: '--coar-background-neutral-primary', desc: 'Main page background' },
          { name: 'Secondary', variable: '--coar-background-neutral-secondary', desc: 'Cards, sections' },
          { name: 'Tertiary', variable: '--coar-background-neutral-tertiary', desc: 'Hover states' },
        ],
      },
      {
        category: 'Text — Accent',
        colors: [
          { name: 'Primary', variable: '--coar-text-accent-primary', desc: 'Links, interactive text' },
          { name: 'Secondary', variable: '--coar-text-accent-secondary', desc: 'Secondary accent text' },
        ],
      },
      {
        category: 'Text — Neutral',
        colors: [
          { name: 'Primary', variable: '--coar-text-neutral-primary', desc: 'Main body text' },
          { name: 'Secondary', variable: '--coar-text-neutral-secondary', desc: 'Secondary text' },
          { name: 'Tertiary', variable: '--coar-text-neutral-tertiary', desc: 'Muted text' },
          { name: 'Disabled', variable: '--coar-text-neutral-disabled', desc: 'Disabled text' },
        ],
      },
      {
        category: 'Border',
        colors: [
          { name: 'Accent Primary', variable: '--coar-border-accent-primary', desc: 'Interactive borders' },
          { name: 'Accent Secondary', variable: '--coar-border-accent-secondary', desc: 'Secondary accent borders' },
          { name: 'Neutral Primary', variable: '--coar-border-neutral-primary', desc: 'Strong borders' },
          { name: 'Neutral Secondary', variable: '--coar-border-neutral-secondary', desc: 'Default borders' },
        ],
      },
      {
        category: 'Semantic — Status',
        colors: [
          { name: 'Success Bold', variable: '--coar-background-semantic-success-bold', desc: 'Success backgrounds' },
          { name: 'Success Subtle', variable: '--coar-background-semantic-success-subtle', desc: 'Subtle success' },
          { name: 'Error Bold', variable: '--coar-background-semantic-error-bold', desc: 'Error backgrounds' },
          { name: 'Error Subtle', variable: '--coar-background-semantic-error-subtle', desc: 'Subtle error' },
          { name: 'Warning Bold', variable: '--coar-background-semantic-warning-bold', desc: 'Warning backgrounds' },
          { name: 'Warning Subtle', variable: '--coar-background-semantic-warning-subtle', desc: 'Subtle warning' },
          { name: 'Info Bold', variable: '--coar-background-semantic-info-bold', desc: 'Info backgrounds' },
          { name: 'Info Subtle', variable: '--coar-background-semantic-info-subtle', desc: 'Subtle info' },
        ],
      },
    ];

    return { palettes, shades, semanticGroups };
  },
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 1000px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Colors</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">Our color system provides consistent, accessible colors across light and dark modes.</p>

      <h2 style="font-size: 20px; margin: 0 0 8px;">Color Primitives</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 16px;">Raw color palette. Referenced by semantic tokens — don't use directly in components.</p>

      <div v-for="palette in palettes" :key="palette.name" style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <strong style="font-size: 14px;">{{ palette.name }}</strong>
          <code style="font-size: 11px; color: #888;">{{ palette.variable }}-[50-900]</code>
        </div>
        <div style="display: flex; gap: 2px; border-radius: 8px; overflow: hidden;">
          <div v-for="shade in shades" :key="shade"
               :style="{ backgroundColor: 'var(' + palette.variable + '-' + shade + ')', flex: 1, height: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '4px' }">
            <span :style="{ fontSize: '10px', color: Number(shade) >= 500 ? '#fff' : '#333' }">{{ shade }}</span>
          </div>
        </div>
      </div>

      <h2 style="font-size: 20px; margin: 40px 0 8px;">Semantic Colors</h2>
      <p style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin: 0 0 16px;">Use semantic tokens in your components. They automatically adapt to light/dark mode.</p>

      <div v-for="group in semanticGroups" :key="group.category" style="margin-bottom: 32px;">
        <h3 style="font-size: 15px; margin: 0 0 12px;">{{ group.category }}</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;">
          <div v-for="color in group.colors" :key="color.variable"
               style="display: flex; flex-direction: column; gap: 6px;">
            <div :style="{
              width: '100%', height: '48px', borderRadius: '6px',
              backgroundColor: color.variable.includes('text') || color.variable.includes('border') ? '#f5f5f5' : 'var(' + color.variable + ')',
              border: color.variable.includes('border') ? '3px solid var(' + color.variable + ')' : '1px solid #eee',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }">
              <span v-if="color.variable.includes('text')" :style="{ color: 'var(' + color.variable + ')', fontWeight: 700, fontSize: '18px' }">Aa</span>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 500;">{{ color.name }}</div>
              <code style="font-size: 10px; color: #888; word-break: break-all;">{{ color.variable }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
});

const meta: Meta<typeof ColorPrimitives> = {
  title: 'Foundations/Colors',
  component: ColorPrimitives,
};

export default meta;
type Story = StoryObj<typeof ColorPrimitives>;

export const Colors: Story = {};
