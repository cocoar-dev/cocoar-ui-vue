import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarCodeBlock } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarCodeBlock> = {
  title: 'Data Display/CodeBlock',
  component: CoarCodeBlock,
  tags: ['autodocs'],
  argTypes: {
    code: { control: 'text' },
    language: { control: 'text' },
    title: { control: 'text' },
    collapsible: { control: 'boolean' },
    collapsed: { control: 'boolean' },
    showCopy: { control: 'boolean' },
    showLineNumbers: { control: 'boolean' },
    maxHeight: { control: 'number' },
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'error', 'info', 'accent'],
    },
    borderless: { control: 'boolean' },
    elevated: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarCodeBlock>;

const sampleTs = `import { CoarButton, CoarIcon } from '@cocoar/vue-ui';

export default defineComponent({
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  },
});`;

export const Playground: Story = {
  args: {
    code: sampleTs,
    language: 'typescript',
    title: 'Example Component',
    collapsible: true,
    showCopy: true,
  },
};

export const Languages: Story = {
  render: () => ({
    components: { CoarCodeBlock },
    setup() {
      return {
        tsCode: 'const greeting: string = "Hello, World!";',
        htmlCode: '<div class="container">\n  <h1>Hello</h1>\n</div>',
        cssCode: '.container {\n  display: flex;\n  gap: var(--coar-spacing-m);\n}',
        jsonCode: '{\n  "name": "@cocoar/vue-ui",\n  "version": "1.0.0"\n}',
        bashCode: 'npm install @cocoar/vue-ui\npnpm add @cocoar/vue-ui',
      };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarCodeBlock :code="tsCode" language="typescript" title="TypeScript" :collapsible="false" />
        <CoarCodeBlock :code="htmlCode" language="html" title="HTML" :collapsible="false" />
        <CoarCodeBlock :code="cssCode" language="css" title="CSS" :collapsible="false" />
        <CoarCodeBlock :code="jsonCode" language="json" title="JSON" :collapsible="false" />
        <CoarCodeBlock :code="bashCode" language="bash" title="Shell" :collapsible="false" />
      </div>
    `,
  }),
};

export const LineNumbers: Story = {
  args: {
    code: sampleTs,
    language: 'typescript',
    title: 'With Line Numbers',
    showLineNumbers: true,
    collapsible: false,
  },
};

export const Collapsible: Story = {
  render: () => ({
    components: { CoarCodeBlock },
    setup() {
      return { code: sampleTs };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarCodeBlock :code="code" language="typescript" title="Expanded (click to collapse)" />
        <CoarCodeBlock :code="code" language="typescript" title="Starts collapsed" collapsed />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { CoarCodeBlock },
    setup() {
      return { code: 'npm install @cocoar/vue-ui' };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarCodeBlock :code="code" language="bash" title="Neutral" variant="neutral" :collapsible="false" />
        <CoarCodeBlock :code="code" language="bash" title="Info" variant="info" :collapsible="false" />
        <CoarCodeBlock :code="code" language="bash" title="Success" variant="success" :collapsible="false" />
        <CoarCodeBlock :code="code" language="bash" title="Warning" variant="warning" :collapsible="false" />
        <CoarCodeBlock :code="code" language="bash" title="Error" variant="error" :collapsible="false" />
        <CoarCodeBlock :code="code" language="bash" title="Accent" variant="accent" :collapsible="false" />
      </div>
    `,
  }),
};

export const MaxHeight: Story = {
  args: {
    code: Array.from({ length: 30 }, (_, i) => `// Line ${i + 1}`).join('\n'),
    language: 'typescript',
    title: 'Scrollable (200px max)',
    maxHeight: 200,
    collapsible: false,
    showLineNumbers: true,
  },
};
