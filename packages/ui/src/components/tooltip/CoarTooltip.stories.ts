import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref } from 'vue';
import { vTooltip, CoarButton } from '@cocoar/vue-ui';

const TooltipWrapper = defineComponent({
  components: { CoarButton },
  directives: { tooltip: vTooltip },
  props: {
    text: { type: String, default: 'Tooltip text' },
    placement: { type: String, default: 'top' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    return { props };
  },
  template: `
    <div style="padding: 60px;">
      <CoarButton v-tooltip="{ content: props.text, placement: props.placement, disabled: props.disabled }">
        Hover me
      </CoarButton>
    </div>
  `,
});

const meta: Meta<typeof TooltipWrapper> = {
  title: 'Overlay/Tooltip',
  component: TooltipWrapper,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    placement: {
      control: 'select',
      options: [
        'auto',
        'top', 'top-start', 'top-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end',
        'right', 'right-start', 'right-end',
      ],
    },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof TooltipWrapper>;

export const Playground: Story = {
  args: {
    text: 'This is a tooltip!',
    placement: 'top',
    disabled: false,
  },
};

export const StringShorthand: Story = {
  render: () => ({
    components: { CoarButton },
    directives: { tooltip: vTooltip },
    template: `
      <div style="padding: 60px;">
        <CoarButton v-tooltip="'Simple string tooltip'">String shorthand</CoarButton>
      </div>
    `,
  }),
};

export const AllPlacements: Story = {
  render: () => ({
    components: { CoarButton },
    directives: { tooltip: vTooltip },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; padding: 80px;">
        <CoarButton v-tooltip="{ content: 'top-start', placement: 'top-start' }" variant="secondary" size="s">top-start</CoarButton>
        <CoarButton v-tooltip="{ content: 'top', placement: 'top' }" variant="secondary" size="s">top</CoarButton>
        <CoarButton v-tooltip="{ content: 'top-end', placement: 'top-end' }" variant="secondary" size="s">top-end</CoarButton>

        <CoarButton v-tooltip="{ content: 'left', placement: 'left' }" variant="secondary" size="s">left</CoarButton>
        <CoarButton v-tooltip="{ content: 'auto', placement: 'auto' }" variant="secondary" size="s">auto</CoarButton>
        <CoarButton v-tooltip="{ content: 'right', placement: 'right' }" variant="secondary" size="s">right</CoarButton>

        <CoarButton v-tooltip="{ content: 'bottom-start', placement: 'bottom-start' }" variant="secondary" size="s">bottom-start</CoarButton>
        <CoarButton v-tooltip="{ content: 'bottom', placement: 'bottom' }" variant="secondary" size="s">bottom</CoarButton>
        <CoarButton v-tooltip="{ content: 'bottom-end', placement: 'bottom-end' }" variant="secondary" size="s">bottom-end</CoarButton>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { CoarButton },
    directives: { tooltip: vTooltip },
    setup() {
      const disabled = ref(true);
      return { disabled };
    },
    template: `
      <div style="display: flex; gap: 16px; align-items: center; padding: 60px;">
        <CoarButton v-tooltip="{ content: 'I am disabled', disabled: disabled }">Tooltip disabled</CoarButton>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" v-model="disabled" />
          Disabled
        </label>
      </div>
    `,
  }),
};

export const OnIcons: Story = {
  render: () => ({
    directives: { tooltip: vTooltip },
    template: `
      <div style="display: flex; gap: 24px; padding: 60px;">
        <span v-tooltip="'Edit'" tabindex="0" style="cursor: pointer; font-size: 24px;">✏️</span>
        <span v-tooltip="'Delete'" tabindex="0" style="cursor: pointer; font-size: 24px;">🗑️</span>
        <span v-tooltip="'Settings'" tabindex="0" style="cursor: pointer; font-size: 24px;">⚙️</span>
        <span v-tooltip="'Help'" tabindex="0" style="cursor: pointer; font-size: 24px;">❓</span>
      </div>
    `,
  }),
};

export const SingleAtATime: Story = {
  render: () => ({
    components: { CoarButton },
    directives: { tooltip: vTooltip },
    template: `
      <div style="display: flex; gap: 16px; padding: 60px; align-items: center;">
        <CoarButton v-tooltip="'Tooltip A'">Button A</CoarButton>
        <CoarButton v-tooltip="'Tooltip B'" variant="secondary">Button B</CoarButton>
        <CoarButton v-tooltip="'Tooltip C'">Button C</CoarButton>
        <p style="color: var(--coar-text-neutral-secondary);">Only one tooltip shows at a time</p>
      </div>
    `,
  }),
};

export const LongContent: Story = {
  render: () => ({
    components: { CoarButton },
    directives: { tooltip: vTooltip },
    template: `
      <div style="padding: 80px;">
        <CoarButton
          v-tooltip="'This is a longer tooltip text that demonstrates the max-width constraint of 320px. The tooltip will wrap to multiple lines when the content exceeds this width.'"
        >
          Long tooltip
        </CoarButton>
      </div>
    `,
  }),
};
