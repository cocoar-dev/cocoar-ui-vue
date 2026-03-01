import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import CoarTabGroup from './CoarTabGroup.vue';
import CoarTab from './CoarTab.vue';

/** Helper to create a tab group with n tabs */
function createTabGroup(options: {
  tabs: Array<{ id: string; label: string; content: string; disabled?: boolean; loadingStrategy?: string }>;
  modelValue?: string;
} = { tabs: [] }) {
  const tabSlots = options.tabs
    .map((t) => {
      const attrs = [`id="${t.id}"`];
      if (t.disabled) attrs.push('disabled');
      if (t.loadingStrategy) attrs.push(`loading-strategy="${t.loadingStrategy}"`);
      return `
        <CoarTab ${attrs.join(' ')}>
          <template #default>${t.label}</template>
          <template #content><div class="panel-${t.id}">${t.content}</div></template>
        </CoarTab>
      `;
    })
    .join('\n');

  const Wrapper = defineComponent({
    components: { CoarTabGroup, CoarTab },
    setup() {
      const active = ref(options.modelValue ?? '');
      return { active };
    },
    template: `
      <CoarTabGroup v-model="active">
        ${tabSlots}
      </CoarTabGroup>
    `,
  });

  return mount(Wrapper, { attachTo: document.body });
}

const defaultTabs = [
  { id: 'tab-1', label: 'Tab 1', content: 'Content 1' },
  { id: 'tab-2', label: 'Tab 2', content: 'Content 2' },
  { id: 'tab-3', label: 'Tab 3', content: 'Content 3' },
];

describe('CoarTabGroup', () => {
  describe('rendering', () => {
    it('renders tab buttons from CoarTab children', () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      const buttons = wrapper.findAll('[role="tab"]');
      expect(buttons).toHaveLength(3);
      expect(buttons[0].text()).toBe('Tab 1');
      expect(buttons[1].text()).toBe('Tab 2');
      expect(buttons[2].text()).toBe('Tab 3');
    });

    it('renders tab panels', () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      const panels = wrapper.findAll('[role="tabpanel"]');
      expect(panels).toHaveLength(3);
    });

    it('auto-selects the first tab when no modelValue', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();
      const buttons = wrapper.findAll('[role="tab"]');
      expect(buttons[0].classes()).toContain('active');
      expect(buttons[0].attributes('aria-selected')).toBe('true');
    });

    it('selects the tab matching modelValue', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs, modelValue: 'tab-2' });
      await nextTick();
      const buttons = wrapper.findAll('[role="tab"]');
      expect(buttons[1].classes()).toContain('active');
    });
  });

  describe('interaction', () => {
    it('switches tab on click', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();
      const buttons = wrapper.findAll('[role="tab"]');

      await buttons[1].trigger('click');
      await nextTick();

      expect(buttons[1].classes()).toContain('active');
      expect(buttons[0].classes()).not.toContain('active');
    });

    it('emits update:modelValue on click', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      await wrapper.findAll('[role="tab"]')[2].trigger('click');
      await nextTick();

      const emitted = wrapper.findComponent(CoarTabGroup).emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      // Last emission should be 'tab-3'
      expect(emitted![emitted!.length - 1]).toEqual(['tab-3']);
    });

    it('does not activate a disabled tab on click', async () => {
      const tabs = [
        { id: 't1', label: 'A', content: 'A content' },
        { id: 't2', label: 'B', content: 'B content', disabled: true },
        { id: 't3', label: 'C', content: 'C content' },
      ];
      const wrapper = createTabGroup({ tabs });
      await nextTick();

      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      expect(buttons[1].classes()).not.toContain('active');
      expect(buttons[0].classes()).toContain('active');
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves to next tab', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      await buttons[0].trigger('keydown', { key: 'ArrowRight' });
      await nextTick();

      expect(buttons[1].classes()).toContain('active');
    });

    it('ArrowLeft wraps to last tab', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      await buttons[0].trigger('keydown', { key: 'ArrowLeft' });
      await nextTick();

      expect(buttons[2].classes()).toContain('active');
    });

    it('Home goes to first tab', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs, modelValue: 'tab-3' });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      await buttons[2].trigger('keydown', { key: 'Home' });
      await nextTick();

      expect(buttons[0].classes()).toContain('active');
    });

    it('End goes to last tab', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      await buttons[0].trigger('keydown', { key: 'End' });
      await nextTick();

      expect(buttons[2].classes()).toContain('active');
    });

    it('skips disabled tabs during arrow navigation', async () => {
      const tabs = [
        { id: 't1', label: 'A', content: 'A' },
        { id: 't2', label: 'B', content: 'B', disabled: true },
        { id: 't3', label: 'C', content: 'C' },
      ];
      const wrapper = createTabGroup({ tabs });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      await buttons[0].trigger('keydown', { key: 'ArrowRight' });
      await nextTick();

      // Should skip disabled tab and go to t3
      expect(buttons[2].classes()).toContain('active');
    });
  });

  describe('accessibility', () => {
    it('sets correct ARIA attributes', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      const tablist = wrapper.find('[role="tablist"]');
      expect(tablist.exists()).toBe(true);

      const buttons = wrapper.findAll('[role="tab"]');
      expect(buttons[0].attributes('aria-selected')).toBe('true');
      expect(buttons[0].attributes('tabindex')).toBe('0');
      expect(buttons[1].attributes('aria-selected')).toBe('false');
      expect(buttons[1].attributes('tabindex')).toBe('-1');

      const panels = wrapper.findAll('[role="tabpanel"]');
      expect(panels[0].attributes('aria-labelledby')).toBe('tab-1');
      expect(buttons[0].attributes('aria-controls')).toBe('panel-tab-1');
    });

    it('disabled tabs have disabled attribute', async () => {
      const tabs = [
        { id: 't1', label: 'A', content: 'A' },
        { id: 't2', label: 'B', content: 'B', disabled: true },
      ];
      const wrapper = createTabGroup({ tabs });
      await nextTick();

      const buttons = wrapper.findAll('[role="tab"]');
      expect((buttons[1].element as HTMLButtonElement).disabled).toBe(true);
      expect(buttons[1].classes()).toContain('disabled');
    });
  });

  describe('lazy loading', () => {
    it('only renders active tab content by default (lazy)', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      // First tab content should be rendered
      expect(wrapper.find('.panel-tab-1').exists()).toBe(true);
      // Second tab content should NOT be rendered
      expect(wrapper.find('.panel-tab-2').exists()).toBe(false);
    });

    it('renders content after tab becomes active', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      expect(wrapper.find('.panel-tab-2').exists()).toBe(false);

      // Click on tab 2
      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();

      expect(wrapper.find('.panel-tab-2').exists()).toBe(true);
    });

    it('keeps content in DOM after deactivation (lazy keeps rendered)', async () => {
      const wrapper = createTabGroup({ tabs: defaultTabs });
      await nextTick();

      // Activate tab 2
      await wrapper.findAll('[role="tab"]')[1].trigger('click');
      await nextTick();
      expect(wrapper.find('.panel-tab-2').exists()).toBe(true);

      // Go back to tab 1
      await wrapper.findAll('[role="tab"]')[0].trigger('click');
      await nextTick();

      // Tab 2 content should still be in DOM (just hidden)
      expect(wrapper.find('.panel-tab-2').exists()).toBe(true);
    });

    it('eager tabs render content immediately', async () => {
      const tabs = [
        { id: 't1', label: 'A', content: 'A content' },
        { id: 't2', label: 'B', content: 'B content', loadingStrategy: 'eager' },
      ];
      const wrapper = createTabGroup({ tabs });
      await nextTick();

      // Tab 2 is eager, should be rendered even though tab 1 is active
      expect(wrapper.find('.panel-t2').exists()).toBe(true);
    });
  });
});
