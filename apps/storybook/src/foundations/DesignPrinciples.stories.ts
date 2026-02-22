import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const DesignPrinciplesPage = defineComponent({
  name: 'DesignPrinciplesPage',
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 800px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Design Principles</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">The philosophy behind the Coar Design System.</p>

      <!-- Tokens -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px; font-size: 16px;">🎨 Design Tokens</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Every visual decision is captured as a design token — a named CSS custom property. Tokens provide a single source of truth for colors,
          typography, spacing, motion, and effects across all platforms.
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <span style="padding: 4px 10px; background: var(--coar-background-accent-tertiary, #eff6ff); border-radius: 4px; font-size: 12px; color: var(--coar-text-accent-primary, #3b82f6);">Colors</span>
          <span style="padding: 4px 10px; background: var(--coar-background-accent-tertiary, #eff6ff); border-radius: 4px; font-size: 12px; color: var(--coar-text-accent-primary, #3b82f6);">Typography</span>
          <span style="padding: 4px 10px; background: var(--coar-background-accent-tertiary, #eff6ff); border-radius: 4px; font-size: 12px; color: var(--coar-text-accent-primary, #3b82f6);">Spacing</span>
          <span style="padding: 4px 10px; background: var(--coar-background-accent-tertiary, #eff6ff); border-radius: 4px; font-size: 12px; color: var(--coar-text-accent-primary, #3b82f6);">Motion</span>
          <span style="padding: 4px 10px; background: var(--coar-background-accent-tertiary, #eff6ff); border-radius: 4px; font-size: 12px; color: var(--coar-text-accent-primary, #3b82f6);">Elevation</span>
        </div>
      </div>

      <!-- 3-Layer Architecture -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px; font-size: 16px;">🏗️ 3-Layer Token Architecture</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--coar-background-accent-primary, #3b82f6); flex-shrink: 0;"></div>
            <div>
              <strong style="font-size: 14px;">Raw Primitives</strong>
              <p style="font-size: 13px; color: var(--coar-text-neutral-secondary); margin: 4px 0 0;">Color palettes, font families, raw values. Never use directly. <code>--coar-color-accent-500</code></p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--coar-background-semantic-success-bold, #22c55e); flex-shrink: 0;"></div>
            <div>
              <strong style="font-size: 14px;">Semantic Tokens</strong>
              <p style="font-size: 13px; color: var(--coar-text-neutral-secondary); margin: 4px 0 0;">Purpose-based tokens that adapt to theme/mode. <code>--coar-background-accent-primary</code></p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--coar-background-semantic-warning-bold, #f59e0b); flex-shrink: 0;"></div>
            <div>
              <strong style="font-size: 14px;">Component Tokens</strong>
              <p style="font-size: 13px; color: var(--coar-text-neutral-secondary); margin: 4px 0 0;">Component-specific sizing and styles. <code>--coar-component-m-height</code></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Touch First -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px; font-size: 16px;">👆 Touch-First</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0;">
          All interactive elements are designed for touch input first. Minimum tap targets of 32px (xs) to 48px (l).
          Components scale cleanly across mobile, tablet, and desktop without separate breakpoint overrides.
        </p>
      </div>

      <!-- Consistency -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px; font-size: 16px;">🔄 Consistency</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          The size system (xs, s, m, l) is shared across buttons, inputs, labels, and icons. When you use <code>size="s"</code>
          on a button, the matching label and icon sizes align automatically.
        </p>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <code style="font-size: 11px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px;">--coar-component-s-height</code>
          <code style="font-size: 11px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px;">--coar-component-s-font-size</code>
          <code style="font-size: 11px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px;">--coar-component-s-label-font-size</code>
        </div>
      </div>

      <!-- Accessibility -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h3 style="margin: 0 0 12px; font-size: 16px;">♿ Accessibility</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0;">
          All components include proper ARIA attributes, keyboard navigation, focus management, and reduced-motion support.
          Color contrast ratios meet WCAG 2.1 AA standards. Semantic HTML is used wherever possible.
        </p>
      </div>
    </div>
  `,
});

const meta: Meta<typeof DesignPrinciplesPage> = {
  title: 'Foundations/Design Principles',
  component: DesignPrinciplesPage,
};

export default meta;
type Story = StoryObj<typeof DesignPrinciplesPage>;

export const DesignPrinciples: Story = {
  name: 'Design Principles',
};
