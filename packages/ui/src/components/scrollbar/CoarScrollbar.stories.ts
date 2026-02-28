import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref } from 'vue';
import { vScrollbar } from '@cocoar/vue-ui';

const ScrollbarDemo = defineComponent({
  name: 'ScrollbarDemo',
  directives: { scrollbar: vScrollbar },
  template: '<div v-scrollbar="options" :style="containerStyle"><slot /></div>',
  props: {
    options: { type: [Object, Boolean], default: () => ({}) },
    containerStyle: { type: String, default: '' },
  },
});

const meta: Meta = {
  title: 'Data Display/Scrollbar',
};

export default meta;
type Story = StoryObj;

const loremLines = Array.from({ length: 30 }, (_, i) =>
  `<p style="margin: 8px 0; color: var(--coar-text-neutral-secondary);">${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`
).join('');

export const BasicScrollbar: Story = {
  render: () => ({
    components: { ScrollbarDemo },
    template: `
      <div style="max-width: 500px;">
        <h4 style="margin-bottom: 8px; color: var(--coar-text-neutral-primary);">Vertical Scrollbar (dark theme)</h4>
        <ScrollbarDemo :containerStyle="'height: 300px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; padding: 16px;'">
          ${loremLines}
        </ScrollbarDemo>
      </div>
    `,
  }),
};

export const LightTheme: Story = {
  render: () => ({
    components: { ScrollbarDemo },
    template: `
      <div style="max-width: 500px;">
        <h4 style="margin-bottom: 8px; color: var(--coar-text-neutral-primary);">Light Theme Scrollbar</h4>
        <ScrollbarDemo
          :options="{ theme: 'light' }"
          :containerStyle="'height: 300px; background: var(--coar-background-neutral-tertiary); border-radius: 8px; padding: 16px;'"
        >
          ${loremLines}
        </ScrollbarDemo>
      </div>
    `,
  }),
};

export const AutoHideOptions: Story = {
  render: () => ({
    directives: { scrollbar: vScrollbar },
    setup() {
      const autoHide = ref<'never' | 'scroll' | 'leave' | 'move'>('never');
      return { autoHide, loremLines };
    },
    template: `
      <div style="max-width: 600px;">
        <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
          <label style="font-weight: 500; color: var(--coar-text-neutral-primary);">Auto Hide:</label>
          <select v-model="autoHide" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--coar-border-neutral-tertiary);">
            <option value="never">never</option>
            <option value="scroll">scroll</option>
            <option value="leave">leave</option>
            <option value="move">move</option>
          </select>
        </div>
        <div
          v-scrollbar="{ autoHide }"
          style="height: 300px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; padding: 16px;"
        >
          ${loremLines}
        </div>
      </div>
    `,
  }),
};

export const HorizontalScroll: Story = {
  render: () => ({
    directives: { scrollbar: vScrollbar },
    template: `
      <div style="max-width: 500px;">
        <h4 style="margin-bottom: 8px; color: var(--coar-text-neutral-primary);">Horizontal Scrollbar</h4>
        <div
          v-scrollbar="{ overflowY: 'hidden' }"
          style="height: 120px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; padding: 16px;"
        >
          <div style="width: 1500px; display: flex; gap: 12px;">
            <div v-for="n in 20" :key="n"
              style="flex-shrink: 0; width: 120px; height: 80px; background: var(--coar-background-accent-secondary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--coar-text-accent-primary); font-weight: 600;">
              Item {{ n }}
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};

export const BothAxes: Story = {
  render: () => ({
    directives: { scrollbar: vScrollbar },
    template: `
      <div style="max-width: 500px;">
        <h4 style="margin-bottom: 8px; color: var(--coar-text-neutral-primary);">Both Axes</h4>
        <div
          v-scrollbar
          style="height: 300px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; padding: 16px;"
        >
          <div style="width: 1200px;">
            ${loremLines}
          </div>
        </div>
      </div>
    `,
  }),
};
