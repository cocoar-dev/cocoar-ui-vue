<script setup lang="ts">
import { CoarButton, CoarCard, CoarCodeBlock, CoarPopover, CoarAvatar, CoarNote } from '@cocoar/vue-ui';

const codeBasic = `<CoarPopover>
  <CoarButton>Open Popover</CoarButton>
  <template #content>
    <div style="padding: 16px">
      <h4>Popover Title</h4>
      <p>Rich content goes here.</p>
    </div>
  </template>
</CoarPopover>`;

const codeHover = `<!-- Hover mode -->
<CoarPopover mode="hover">
  <CoarButton>Hover me</CoarButton>
  <template #content>
    <div style="padding: 12px">Shown on hover</div>
  </template>
</CoarPopover>

<!-- Both hover and click -->
<CoarPopover mode="both">
  <CoarButton>Hover or click</CoarButton>
  <template #content>
    <div style="padding: 12px">Shown on hover or click</div>
  </template>
</CoarPopover>`;

const codeUserMenu = `<CoarPopover mode="click">
  <CoarAvatar name="John Doe" size="s" style="cursor: pointer" />
  <template #content>
    <div class="user-menu">
      <div class="user-menu-header">
        <p class="user-name">John Doe</p>
        <p class="user-email">john@example.com</p>
      </div>
      <CoarButton variant="ghost" size="s">Profile</CoarButton>
      <CoarButton variant="ghost" size="s">Settings</CoarButton>
      <CoarButton variant="danger" size="s">Sign Out</CoarButton>
    </div>
  </template>
</CoarPopover>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Popover</h1>
      <p class="page-description">
        Popovers display rich content anchored near a trigger element. Unlike tooltips,
        popovers support interactive content, are triggered by click or hover, and
        stay open until dismissed.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPopover } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Popover (Click)</h3>
          <p class="example-description">Default mode is <code>hover</code>. Use <code>mode="click"</code> for click-to-open behavior. Click outside or press Escape to close.</p>
          <div class="example-demo demo-row">
            <CoarPopover mode="click">
              <CoarButton>Open Popover</CoarButton>
              <template #content>
                <div class="popover-content">
                  <h4>Popover Title</h4>
                  <p class="coar-body-small">This is rich content inside a popover. It can contain forms, lists, and other interactive components.</p>
                  <CoarButton variant="primary" size="s" style="margin-top: var(--coar-spacing-s)">Action</CoarButton>
                </div>
              </template>
            </CoarPopover>

            <CoarPopover mode="click">
              <CoarButton variant="secondary">More options</CoarButton>
              <template #content>
                <div class="action-list">
                  <CoarButton variant="ghost" size="s">Edit</CoarButton>
                  <CoarButton variant="ghost" size="s">Duplicate</CoarButton>
                  <CoarButton variant="ghost" size="s">Archive</CoarButton>
                  <CoarButton variant="danger" size="s">Delete</CoarButton>
                </div>
              </template>
            </CoarPopover>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Hover Mode</h3>
          <p class="example-description">Use <code>mode="hover"</code> (default) for content that opens on hover, or <code>mode="both"</code> to support both.</p>
          <div class="example-demo demo-row">
            <CoarPopover mode="hover">
              <CoarButton variant="ghost">Hover me</CoarButton>
              <template #content>
                <div class="popover-content">
                  <p class="coar-body-small">This popover opens on hover. Great for supplementary information.</p>
                </div>
              </template>
            </CoarPopover>

            <CoarPopover mode="both">
              <CoarButton variant="secondary">Hover or click</CoarButton>
              <template #content>
                <div class="popover-content">
                  <p class="coar-body-small">Opens on hover. Click to pin it open — then click again to close.</p>
                </div>
              </template>
            </CoarPopover>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeHover" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>User Menu</h3>
          <p class="example-description">A common pattern — click an avatar to reveal a user action menu.</p>
          <div class="example-demo demo-row">
            <CoarPopover mode="click">
              <CoarAvatar name="John Doe" size="s" style="cursor: pointer" />
              <template #content>
                <div class="user-menu">
                  <div class="user-menu-header">
                    <p class="user-name">John Doe</p>
                    <p class="user-email">john@example.com</p>
                  </div>
                  <div class="user-menu-actions">
                    <CoarButton variant="ghost" size="s">Profile</CoarButton>
                    <CoarButton variant="ghost" size="s">Settings</CoarButton>
                    <CoarButton variant="danger" size="s">Sign Out</CoarButton>
                  </div>
                </div>
              </template>
            </CoarPopover>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeUserMenu" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Info Popover</h3>
          <p class="example-description">Use a hover popover on an icon to provide contextual help without navigating away.</p>
          <div class="example-demo demo-row">
            <CoarPopover mode="hover">
              <CoarButton variant="ghost" icon-start="circle-help" aria-label="More information" />
              <template #content>
                <div class="popover-content">
                  <h4>How it works</h4>
                  <p class="coar-body-small">This feature uses your account's default timezone. You can change this in Settings → Preferences.</p>
                </div>
              </template>
            </CoarPopover>

            <CoarPopover mode="hover">
              <CoarButton variant="ghost" icon-start="triangle-alert" aria-label="Warning details" />
              <template #content>
                <div class="popover-content">
                  <h4>Rate limit approaching</h4>
                  <p class="coar-body-small">You've used 80% of your monthly API limit. Upgrade to increase your quota.</p>
                </div>
              </template>
            </CoarPopover>
          </div>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="max-width: 700px; margin-top: var(--coar-spacing-s)">
        <strong>Slot names:</strong> Place the trigger in the <strong>default slot</strong> and the content in <strong><code>#content</code></strong>.
        The popover auto-positions itself to stay within the viewport — no placement prop needed.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>Popover API</summary>
        <div class="api-content">
          <h4>Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>mode</code></td><td><code>'hover' | 'click' | 'both'</code></td><td><code>'hover'</code></td><td>How the popover is triggered</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Prevent the popover from opening</td></tr>
              <tr><td><code>interactive</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Whether the panel receives pointer events</td></tr>
              <tr><td><code>offset</code></td><td><code>number</code></td><td><code>6</code></td><td>Gap in px between trigger and panel</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>default</code></td><td>The trigger element that opens the popover</td></tr>
              <tr><td><code>#content</code></td><td>The popover panel content</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3, h4 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
h4 { margin-top: var(--coar-spacing-m); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}

.popover-content {
  padding: var(--coar-spacing-m);
  max-width: 240px;
}

.popover-content h4 { margin: 0 0 var(--coar-spacing-xs); }
.popover-content p { margin: 0; }

.action-list {
  display: flex;
  flex-direction: column;
  padding: var(--coar-spacing-xs);
  gap: 2px;
  min-width: 140px;
}

.user-menu {
  min-width: 180px;
}

.user-menu-header {
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-bottom: 1px solid var(--coar-border-neutral-secondary);
  margin-bottom: var(--coar-spacing-xs);
}

.user-name {
  margin: 0;
  font-weight: var(--coar-body-base-bold-weight);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
}

.user-email {
  margin: 0;
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
}

.user-menu-actions {
  display: flex;
  flex-direction: column;
  padding: var(--coar-spacing-xs);
  gap: 2px;
}
</style>
