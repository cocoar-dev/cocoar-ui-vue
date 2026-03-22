import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref, computed } from 'vue';
import { CoarIcon, CORE_ICONS } from '@cocoar/vue-ui';

const IconsPage = defineComponent({
  name: 'IconsPage',
  components: { CoarIcon },
  setup() {
    const allNames = Object.keys(CORE_ICONS).sort();
    const search = ref('');
    const filteredNames = computed(() => {
      const q = search.value.toLowerCase().trim();
      if (!q) return allNames;
      return allNames.filter((n) => n.includes(q));
    });
    const sizes = ['xs', 's', 'm', 'l', 'xl'] as const;
    return { allNames, search, filteredNames, sizes, total: allNames.length };
  },
  template: `
    <div style="font-family: var(--coar-body-base-family, Poppins, sans-serif); max-width: 1000px;">
      <h1 style="font-family: var(--coar-title-family, Inter, sans-serif); font-size: 32px; margin: 0 0 8px;">Icons</h1>
      <p style="color: var(--coar-text-neutral-secondary); margin: 0 0 24px;">{{ total }} built-in icons available. Uses inline SVG rendering via the pluggable icon registry.</p>

      <!-- Search -->
      <input
        v-model="search"
        type="text"
        placeholder="Search icons..."
        style="width: 100%; max-width: 400px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; margin-bottom: 24px; outline: none;"
      />

      <!-- Sizes -->
      <h2 style="font-size: 20px; margin: 0 0 12px;">Sizes</h2>
      <div style="display: flex; align-items: flex-end; gap: 20px; margin-bottom: 32px; padding: 16px; border: 1px solid #eee; border-radius: 8px;">
        <div v-for="s in sizes" :key="s" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <CoarIcon name="settings" :size="s" />
          <span style="font-size: 11px; color: #888;">{{ s }}</span>
        </div>
      </div>

      <!-- Usage -->
      <h2 style="font-size: 20px; margin: 0 0 12px;">Usage</h2>
      <pre style="background: #1e1e2e; color: #cdd6f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; margin: 0 0 32px;"><code>&lt;CoarIcon name="check" size="m" /&gt;
&lt;CoarIcon name="settings" size="l" color="var(--coar-text-accent-primary)" /&gt;
&lt;CoarIcon name="loader-circle" spin size="m" /&gt;
&lt;CoarIcon name="chevron-right" :rotate="90" /&gt;</code></pre>

      <!-- Gallery -->
      <h2 style="font-size: 20px; margin: 0 0 4px;">Gallery</h2>
      <p style="font-size: 12px; color: #888; margin: 0 0 12px;">{{ filteredNames.length }} icon{{ filteredNames.length !== 1 ? 's' : '' }} found</p>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
        <div v-for="name in filteredNames" :key="name"
             style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 4px; border: 1px solid #eee; border-radius: 6px; cursor: default;"
             :title="name">
          <CoarIcon :name="name" size="m" />
          <span style="font-size: 10px; color: #666; text-align: center; word-break: break-all;">{{ name }}</span>
        </div>
      </div>

      <p v-if="filteredNames.length === 0" style="text-align: center; color: #999; padding: 32px;">No icons match "{{ search }}"</p>
    </div>
  `,
});

const meta: Meta<typeof IconsPage> = {
  title: 'Foundations/Icons',
  component: IconsPage,
};

export default meta;
type Story = StoryObj<typeof IconsPage>;

export const Icons: Story = {};
