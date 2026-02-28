import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';

const meta: Meta = {
  title: 'Navigation/Breadcrumb',
};

export default meta;
type Story = StoryObj;

export const BasicBreadcrumb: Story = {
  render: () => ({
    components: { CoarBreadcrumb, CoarBreadcrumbItem },
    template: `
      <CoarBreadcrumb>
        <CoarBreadcrumbItem><a href="#">Home</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem><a href="#">Products</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem><a href="#">Electronics</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem active>Laptops</CoarBreadcrumbItem>
      </CoarBreadcrumb>
    `,
  }),
};

export const CustomSeparator: Story = {
  render: () => ({
    components: { CoarBreadcrumb, CoarBreadcrumbItem },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <p style="margin: 0 0 8px; color: var(--coar-text-neutral-tertiary); font-size: 12px;">Chevron separator</p>
          <CoarBreadcrumb separator="›">
            <CoarBreadcrumbItem><a href="#">Home</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem><a href="#">Settings</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem active>Profile</CoarBreadcrumbItem>
          </CoarBreadcrumb>
        </div>

        <div>
          <p style="margin: 0 0 8px; color: var(--coar-text-neutral-tertiary); font-size: 12px;">Arrow separator</p>
          <CoarBreadcrumb separator="→">
            <CoarBreadcrumbItem><a href="#">Dashboard</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem><a href="#">Reports</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem active>Monthly</CoarBreadcrumbItem>
          </CoarBreadcrumb>
        </div>

        <div>
          <p style="margin: 0 0 8px; color: var(--coar-text-neutral-tertiary); font-size: 12px;">Pipe separator</p>
          <CoarBreadcrumb separator="|">
            <CoarBreadcrumbItem><a href="#">Root</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem><a href="#">Folder</a></CoarBreadcrumbItem>
            <CoarBreadcrumbItem active>File</CoarBreadcrumbItem>
          </CoarBreadcrumb>
        </div>
      </div>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    components: { CoarBreadcrumb, CoarBreadcrumbItem },
    template: `
      <CoarBreadcrumb separator="›">
        <CoarBreadcrumbItem><a href="#">🏠 Home</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem><a href="#">📁 Documents</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem><a href="#">📂 Projects</a></CoarBreadcrumbItem>
        <CoarBreadcrumbItem active>📄 Report.pdf</CoarBreadcrumbItem>
      </CoarBreadcrumb>
    `,
  }),
};
