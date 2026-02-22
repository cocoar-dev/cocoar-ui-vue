import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const TypographyPage = defineComponent({
  name: 'TypographyPage',
  setup() {
    const typeScale = [
      { name: 'DISPLAY', class: 'coar-display', sample: 'Display Text', spec: 'Inter / 72px / Bold' },
      { name: 'TITLE', class: 'coar-title', sample: 'Title Text', spec: 'Inter / 48px / Bold' },
      { name: 'SUBTITLE', class: 'coar-subtitle', sample: 'Subtitle Text', spec: 'Inter / 32px / Regular' },
      { name: 'HEADING', class: 'coar-heading', sample: 'Heading Text', spec: 'Poppins / 24px / SemiBold' },
      { name: 'SUBHEADING', class: 'coar-subheading', sample: 'Subheading Text', spec: 'Poppins / 20px / Regular' },
      { name: 'BODY', class: 'coar-body', sample: 'Body Text — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Regular' },
      { name: 'BODY BOLD', class: 'coar-body-bold', sample: 'Body Bold — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Bold' },
      { name: 'BODY SMALL', class: 'coar-body-small', sample: 'Body Small — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Regular' },
      { name: 'BODY SMALL BOLD', class: 'coar-body-small-bold', sample: 'Body Small Bold — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Bold' },
      { name: 'CAPTION', class: 'coar-caption', sample: 'Caption Text', spec: 'Poppins / 12px / Medium / Uppercase' },
      { name: 'FOOTNOTE', class: 'coar-footnote', sample: 'Footnote Text — Small print and legal text.', spec: 'Poppins / 10px / Regular' },
    ];
    return { typeScale };
  },
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 1000px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Typography</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">Our type system creates clear visual hierarchy and ensures readability across all interfaces.</p>

      <h2 style="font-size: 20px; margin: 0 0 16px;">Type Scale</h2>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div v-for="t in typeScale" :key="t.name"
             style="padding: 16px 20px; border: 1px solid #eee; border-radius: 8px; background: var(--coar-background-neutral-primary, #fff);">
          <div style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--coar-text-neutral-tertiary, #999); margin-bottom: 8px;">{{ t.name }}</div>
          <p :class="t.class" style="margin: 0 0 8px;">{{ t.sample }}</p>
          <div style="font-size: 10px; color: var(--coar-text-neutral-tertiary, #999);">{{ t.spec }}</div>
        </div>
      </div>

      <h2 style="font-size: 20px; margin: 40px 0 16px;">Usage Example</h2>
      <div style="padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h1 class="coar-title" style="margin: 0 0 8px;">Article Title</h1>
        <p class="coar-subtitle" style="color: var(--coar-text-neutral-secondary); margin: 0 0 16px;">A compelling subtitle that draws readers in</p>
        <p class="coar-body" style="margin: 0 0 12px;">This is body text that makes up the main content. Good typography helps users understand the content hierarchy at a glance.</p>
        <p class="coar-body" style="margin: 0 0 12px;"><span class="coar-body-bold">Important:</span> Use bold text sparingly to emphasize key points.</p>
        <p class="coar-caption" style="margin: 0;">CATEGORY · 5 MIN READ</p>
      </div>
    </div>
  `,
});

const meta: Meta<typeof TypographyPage> = {
  title: 'Foundations/Typography',
  component: TypographyPage,
};

export default meta;
type Story = StoryObj<typeof TypographyPage>;

export const Typography: Story = {};
