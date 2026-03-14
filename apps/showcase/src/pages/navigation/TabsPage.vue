<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab, CoarCard, CoarCodeBlock, CoarNote } from '@cocoar/vue-ui';

const activeTab = ref('overview');
const settingsTab = ref('general');

const codeBasic = `<CoarTabGroup v-model="activeTab">
  <CoarTab id="overview">Overview</CoarTab>
  <CoarTab id="features">Features</CoarTab>
  <CoarTab id="api">API</CoarTab>
</CoarTabGroup>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Tabs</h1>
      <p class="page-description">A tabbed interface component for organizing content into separate views.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated class="examples-grid__span">
          <h3>Basic Tabs</h3>
          <p class="example-description">Tab group with content panels rendered via <code>v-if</code>.</p>
          <div class="example-demo">
            <CoarTabGroup v-model="activeTab">
              <CoarTab id="overview">Overview</CoarTab>
              <CoarTab id="features">Features</CoarTab>
              <CoarTab id="api">API</CoarTab>
              <CoarTab id="examples">Examples</CoarTab>
            </CoarTabGroup>
            <div class="tab-content">
              <div v-if="activeTab === 'overview'">
                <h4>Overview</h4>
                <p class="coar-body-small">This is the overview content. It provides a high-level introduction to the component.</p>
              </div>
              <div v-else-if="activeTab === 'features'">
                <h4>Features</h4>
                <ul class="coar-body-small" style="padding-left: var(--coar-spacing-m); display: flex; flex-direction: column; gap: var(--coar-spacing-xs)">
                  <li>Keyboard navigation (Arrow keys, Home, End)</li>
                  <li>ARIA tab panel pattern</li>
                  <li>Controlled and uncontrolled modes</li>
                  <li>Custom content in each panel</li>
                </ul>
              </div>
              <div v-else-if="activeTab === 'api'">
                <h4>API</h4>
                <p class="coar-body-small">Use <code>v-model</code> on <code>CoarTabGroup</code> to control the active tab programmatically.</p>
              </div>
              <div v-else-if="activeTab === 'examples'">
                <h4>Examples</h4>
                <p class="coar-body-small">See the tabs below for more usage patterns.</p>
              </div>
            </div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Settings Pattern</h3>
          <p class="example-description">Common pattern for settings pages with multiple categories.</p>
          <div class="example-demo">
            <CoarTabGroup v-model="settingsTab">
              <CoarTab id="general">General</CoarTab>
              <CoarTab id="security">Security</CoarTab>
              <CoarTab id="notifications">Notifications</CoarTab>
              <CoarTab id="billing">Billing</CoarTab>
            </CoarTabGroup>
            <div class="tab-content">
              <div v-if="settingsTab === 'general'">
                <h4>General Settings</h4>
                <div class="settings-list">
                  <div class="setting-row">
                    <span class="coar-body-small">Display name</span>
                    <input type="text" class="setting-input" value="John Doe" />
                  </div>
                  <div class="setting-row">
                    <span class="coar-body-small">Email</span>
                    <input type="email" class="setting-input" value="john@example.com" />
                  </div>
                  <div class="setting-row">
                    <span class="coar-body-small">Language</span>
                    <select class="setting-input"><option>English</option><option>German</option></select>
                  </div>
                </div>
              </div>
              <div v-else-if="settingsTab === 'security'">
                <h4>Security Settings</h4>
                <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Manage your password and two-factor authentication settings.</p>
              </div>
              <div v-else-if="settingsTab === 'notifications'">
                <h4>Notification Preferences</h4>
                <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Choose how you want to be notified about account activity.</p>
              </div>
              <div v-else-if="settingsTab === 'billing'">
                <h4>Billing & Plans</h4>
                <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Manage your subscription and payment methods.</p>
              </div>
            </div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled Tabs</h3>
          <p class="example-description">Individual tabs can be disabled.</p>
          <div class="example-demo">
            <CoarTabGroup>
              <CoarTab id="active1">Active</CoarTab>
              <CoarTab id="disabled1" :disabled="true">Disabled</CoarTab>
              <CoarTab id="active2">Active</CoarTab>
              <CoarTab id="disabled2" :disabled="true">Disabled</CoarTab>
            </CoarTabGroup>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Keyboard Navigation</h3>
          <p class="example-description">Full keyboard support for tab navigation.</p>
          <div class="keyboard-grid">
            <div class="keyboard-item"><kbd>←</kbd> <kbd>→</kbd> <span>Move between tabs</span></div>
            <div class="keyboard-item"><kbd>Home</kbd> <span>First tab</span></div>
            <div class="keyboard-item"><kbd>End</kbd> <span>Last tab</span></div>
            <div class="keyboard-item"><kbd>Tab</kbd> <span>Move to panel content</span></div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Tabs API</summary>
        <div class="api-content">
          <h4>CoarTabGroup Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>string</code></td><td><code>first tab id</code></td><td>ID of the active tab</td></tr>
            </tbody>
          </table>
          <h4>CoarTab Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>id</code></td><td><code>string</code></td><td><code>—</code></td><td>Unique tab identifier</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable this tab</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
h4 { margin: 0 0 var(--coar-spacing-s); font-size: var(--coar-body-base-size); font-weight: var(--coar-body-base-bold-weight); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

.tab-content {
  padding: var(--coar-spacing-m);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-top: none;
  border-radius: 0 0 var(--coar-radius-s) var(--coar-radius-s);
  min-height: 100px;
}

.settings-list { display: flex; flex-direction: column; gap: var(--coar-spacing-s); }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: var(--coar-spacing-m); }
.setting-input {
  padding: 4px 8px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: var(--coar-body-small-base-size);
  min-width: 160px;
}

code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}
</style>
