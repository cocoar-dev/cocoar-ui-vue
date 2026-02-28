import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const LinkDemo = defineComponent({
  name: 'LinkDemo',
  template: `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      <section>
        <h3 class="coar-heading" style="margin-bottom: 12px;">Basic Link</h3>
        <p class="coar-body">
          Use the <code>.coar-link</code> class on any <code>&lt;a&gt;</code> element.
        </p>
        <div style="margin-top: 12px;">
          <a class="coar-link" href="javascript:void(0)">Default link</a>
        </div>
      </section>

      <section>
        <h3 class="coar-heading" style="margin-bottom: 12px;">Subtle Variant</h3>
        <div style="display: flex; gap: 24px; align-items: center;">
          <a class="coar-link" href="javascript:void(0)">Default</a>
          <a class="coar-link coar-link--subtle" href="javascript:void(0)">Subtle</a>
        </div>
      </section>

      <section>
        <h3 class="coar-heading" style="margin-bottom: 12px;">Sizes</h3>
        <div style="display: flex; gap: 24px; align-items: center;">
          <a class="coar-link coar-link--s" href="javascript:void(0)">Small</a>
          <a class="coar-link coar-link--m" href="javascript:void(0)">Medium</a>
          <a class="coar-link coar-link--l" href="javascript:void(0)">Large</a>
        </div>
      </section>

      <section>
        <h3 class="coar-heading" style="margin-bottom: 12px;">Disabled</h3>
        <div style="display: flex; gap: 24px; align-items: center;">
          <a class="coar-link" href="javascript:void(0)" aria-disabled="true">Disabled (aria)</a>
          <a class="coar-link coar-link--disabled" href="javascript:void(0)">Disabled (class)</a>
        </div>
      </section>

      <section>
        <h3 class="coar-heading" style="margin-bottom: 12px;">Inline Usage</h3>
        <p class="coar-body">
          Links work naturally inline: Visit our
          <a class="coar-link" href="javascript:void(0)">documentation</a>
          for more details or check the
          <a class="coar-link coar-link--subtle" href="javascript:void(0)">changelog</a>.
        </p>
      </section>
    </div>
  `,
});

const meta: Meta = {
  title: 'General/Link',
  component: LinkDemo,
};
export default meta;
type Story = StoryObj;

export const Overview: Story = {};
