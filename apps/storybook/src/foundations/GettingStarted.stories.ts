import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';

const GettingStartedPage = defineComponent({
  name: 'GettingStartedPage',
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 800px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Getting Started</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 32px;">Set up the Coar Design System in your Vue project.</p>

      <!-- Step 1 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">1. Install</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Install the <code>@cocoar/vue-ui</code> package:
        </p>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>npm install @cocoar/vue-ui</code></pre>
      </div>

      <!-- Step 2 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">2. Import Design Tokens</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Add the design tokens to your app's entry point. This provides all CSS variables for colors, typography, spacing, and more.
        </p>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>// main.ts
import '@cocoar/vue-ui/styles';</code></pre>
      </div>

      <!-- Step 3 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">3. Register Icon Plugin (optional)</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Register the icon plugin for the built-in icon set. Optional — icons also work without the plugin using the default built-in source.
        </p>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>// main.ts
import { CoarIconPlugin } from '@cocoar/vue-ui';

const app = createApp(App);
app.use(CoarIconPlugin);
app.mount('#app');</code></pre>
      </div>

      <!-- Step 4 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">4. Use Components</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Import and use components directly in your Vue files:
        </p>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>&lt;script setup lang="ts"&gt;
import { CoarButton, CoarIcon, CoarLabel } from '@cocoar/vue-ui';
&lt;/script&gt;

&lt;template&gt;
  &lt;CoarLabel required&gt;Email&lt;/CoarLabel&gt;
  &lt;CoarButton variant="primary" iconStart="check"&gt;
    Save
  &lt;/CoarButton&gt;
  &lt;CoarIcon name="settings" size="l" /&gt;
&lt;/template&gt;</code></pre>
      </div>

      <!-- Step 5 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">5. Dark Mode</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Toggle dark mode by adding the <code>.dark-mode</code> class to the root element. All tokens adapt automatically.
        </p>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>&lt;html class="dark-mode"&gt;</code></pre>
      </div>

      <!-- Step 6 -->
      <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h3 style="margin: 0 0 8px; font-size: 16px;">6. Design Tokens</h3>
        <p style="font-size: 14px; color: var(--coar-text-neutral-secondary); margin: 0 0 12px;">
          Use CSS variables for consistent styling:
        </p>
        <ul style="font-size: 13px; padding-left: 20px; margin: 0 0 12px; color: var(--coar-text-neutral-secondary);">
          <li><code>--coar-color-*</code> — color primitives</li>
          <li><code>--coar-background-*</code> / <code>--coar-text-*</code> / <code>--coar-border-*</code> — semantic tokens</li>
          <li><code>--coar-spacing-*</code> — spacing scale</li>
          <li><code>--coar-radius-*</code> — border radii</li>
          <li><code>--coar-shadow-*</code> — elevation shadows</li>
        </ul>
        <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0;"><code>.my-card {
  background: var(--coar-background-neutral-secondary);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-m);
  padding: var(--coar-spacing-m);
  box-shadow: var(--coar-shadow-s);
}</code></pre>
      </div>
    </div>
  `,
});

const meta: Meta<typeof GettingStartedPage> = {
  title: 'Foundations/Getting Started',
  component: GettingStartedPage,
};

export default meta;
type Story = StoryObj<typeof GettingStartedPage>;

export const GettingStarted: Story = {
  name: 'Getting Started',
};
