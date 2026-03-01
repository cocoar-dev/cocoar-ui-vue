import type { Meta, StoryObj } from '@storybook/vue3';
import { ref, defineComponent, onMounted, onBeforeUnmount } from 'vue';
import { CoarTabGroup, CoarTab, CoarButton, CoarBadge } from '@cocoar/vue-ui';

const meta: Meta = {
  title: 'Navigation/Tabs',
};

export default meta;
type Story = StoryObj;

export const BasicTabs: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab },
    template: `
      <CoarTabGroup>
        <CoarTab id="overview">
          <template #default>Overview</template>
          <template #content>
            <div style="padding: 16px;">
              <h3 style="margin: 0 0 8px;">Overview</h3>
              <p style="margin: 0; color: var(--coar-text-neutral-secondary);">
                This is the overview tab content. Tabs provide a way to organize content
                into separate views where only one view is visible at a time.
              </p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="features">
          <template #default>Features</template>
          <template #content>
            <div style="padding: 16px;">
              <h3 style="margin: 0 0 8px;">Features</h3>
              <ul style="margin: 0; color: var(--coar-text-neutral-secondary);">
                <li>Keyboard navigation (Arrow keys, Home, End)</li>
                <li>Lazy and eager loading strategies</li>
                <li>Disabled tabs</li>
                <li>Rich labels with icons and badges</li>
                <li>Controlled and uncontrolled modes</li>
              </ul>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="api">
          <template #default>API</template>
          <template #content>
            <div style="padding: 16px;">
              <h3 style="margin: 0 0 8px;">API Reference</h3>
              <p style="margin: 0; color: var(--coar-text-neutral-secondary);">
                Use <code>&lt;CoarTabGroup&gt;</code> with <code>&lt;CoarTab&gt;</code> children.
                Each tab needs a unique <code>id</code>, a default slot for the label,
                and a <code>#content</code> slot for the panel content.
              </p>
            </div>
          </template>
        </CoarTab>
      </CoarTabGroup>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab },
    template: `
      <CoarTabGroup>
        <CoarTab id="home">
          <template #default>🏠 Home</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">Welcome home! This is your dashboard.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="settings">
          <template #default>⚙️ Settings</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">Configure your preferences here.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="profile">
          <template #default>👤 Profile</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">Manage your profile information.</p>
            </div>
          </template>
        </CoarTab>
      </CoarTabGroup>
    `,
  }),
};

export const DisabledTabs: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab },
    template: `
      <CoarTabGroup>
        <CoarTab id="active">
          <template #default>Active Tab</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">This tab is enabled and active.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="disabled-1" disabled>
          <template #default>Disabled</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">You should not see this content.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="enabled">
          <template #default>Also Enabled</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">This tab is also enabled. Arrow keys skip disabled tabs.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="disabled-2" disabled>
          <template #default>Also Disabled</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">You should not see this either.</p>
            </div>
          </template>
        </CoarTab>
      </CoarTabGroup>
    `,
  }),
};

export const RichLabels: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab, CoarBadge },
    template: `
      <CoarTabGroup>
        <CoarTab id="inbox">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              Inbox
              <CoarBadge variant="primary" size="s">5</CoarBadge>
            </span>
          </template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">You have 5 unread messages.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="sent">
          <template #default>Sent</template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">Your sent messages appear here.</p>
            </div>
          </template>
        </CoarTab>
        <CoarTab id="drafts">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              Drafts
              <CoarBadge variant="neutral" size="s">2</CoarBadge>
            </span>
          </template>
          <template #content>
            <div style="padding: 16px;">
              <p style="margin: 0;">You have 2 drafts.</p>
            </div>
          </template>
        </CoarTab>
      </CoarTabGroup>
    `,
  }),
};

export const ControlledState: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab, CoarButton },
    setup() {
      const activeTab = ref('tab-1');
      function goTo(id: string) { activeTab.value = id; }
      return { activeTab, goTo };
    },
    template: `
      <div>
        <div style="margin-bottom: 16px; display: flex; gap: 8px; align-items: center;">
          <CoarButton size="s" @click="goTo('tab-1')">Go to Tab 1</CoarButton>
          <CoarButton size="s" @click="goTo('tab-2')">Go to Tab 2</CoarButton>
          <CoarButton size="s" @click="goTo('tab-3')">Go to Tab 3</CoarButton>
          <span style="margin-left: 16px; color: var(--coar-text-neutral-secondary); font-size: 13px;">
            Active: <strong>{{ activeTab }}</strong>
          </span>
        </div>

        <CoarTabGroup v-model="activeTab">
          <CoarTab id="tab-1">
            <template #default>First</template>
            <template #content>
              <div style="padding: 16px;">
                <p style="margin: 0;">Content of the first tab. Use the buttons above to switch tabs programmatically.</p>
              </div>
            </template>
          </CoarTab>
          <CoarTab id="tab-2">
            <template #default>Second</template>
            <template #content>
              <div style="padding: 16px;">
                <p style="margin: 0;">Content of the second tab.</p>
              </div>
            </template>
          </CoarTab>
          <CoarTab id="tab-3">
            <template #default>Third</template>
            <template #content>
              <div style="padding: 16px;">
                <p style="margin: 0;">Content of the third tab.</p>
              </div>
            </template>
          </CoarTab>
        </CoarTabGroup>
      </div>
    `,
  }),
};

// Helper component that logs mount/unmount to demonstrate lazy loading
const LazyDemo = defineComponent({
  name: 'LazyDemo',
  props: { name: { type: String, required: true } },
  setup(props) {
    const mountedAt = ref('');
    onMounted(() => {
      mountedAt.value = new Date().toLocaleTimeString();
    });
    onBeforeUnmount(() => {
       
      console.log(`[${props.name}] destroyed`);
    });
    return { mountedAt };
  },
  template: `
    <div style="padding: 16px;">
      <p style="margin: 0 0 4px;"><strong>{{ name }}</strong></p>
      <p style="margin: 0; color: var(--coar-text-neutral-tertiary); font-size: 13px;">
        Initialized at: {{ mountedAt }}
      </p>
    </div>
  `,
});

export const LazyLoading: Story = {
  render: () => ({
    components: { CoarTabGroup, CoarTab, LazyDemo },
    template: `
      <div>
        <p style="margin: 0 0 12px; color: var(--coar-text-neutral-secondary); font-size: 13px;">
          Lazy tabs (default) only render content when first activated. Eager tabs render immediately.
          Check the "Initialized at" timestamps — lazy tabs show the time they were first clicked.
        </p>

        <CoarTabGroup>
          <CoarTab id="lazy-1">
            <template #default>Lazy Tab 1</template>
            <template #content>
              <LazyDemo name="Lazy Tab 1" />
            </template>
          </CoarTab>
          <CoarTab id="lazy-2">
            <template #default>Lazy Tab 2</template>
            <template #content>
              <LazyDemo name="Lazy Tab 2" />
            </template>
          </CoarTab>
          <CoarTab id="eager" loading-strategy="eager">
            <template #default>Eager Tab</template>
            <template #content>
              <LazyDemo name="Eager Tab" />
            </template>
          </CoarTab>
        </CoarTabGroup>
      </div>
    `,
  }),
};
