<script setup lang="ts">
import { CoarButton, CoarIcon, CoarCard, CoarCodeBlock, CoarPopover, vTooltip } from '@cocoar/vue-ui';

const codeTooltip = `<CoarButton v-tooltip="'Save changes'">Save</CoarButton>

<!-- With options -->
<CoarButton v-tooltip="{ text: 'Delete item', placement: 'top' }">
  Delete
</CoarButton>`;

const codeTooltipPlacements = `<CoarButton v-tooltip="{ text: 'Top', placement: 'top' }">Top</CoarButton>
<CoarButton v-tooltip="{ text: 'Bottom', placement: 'bottom' }">Bottom</CoarButton>
<CoarButton v-tooltip="{ text: 'Left', placement: 'left' }">Left</CoarButton>
<CoarButton v-tooltip="{ text: 'Right', placement: 'right' }">Right</CoarButton>`;

const codePopover = `<CoarPopover mode="click">
  <CoarButton>Open Popover</CoarButton>
  <template #content>
    <div style="padding: 16px; max-width: 240px">
      <h4>Popover Title</h4>
      <p>Rich content goes here.</p>
    </div>
  </template>
</CoarPopover>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Tooltip & Popover</h1>
      <p class="page-description">
        Tooltips and popovers are lightweight overlays for extra context.
        Tooltips are non-interactive hints (hover/focus). Popovers support rich content and click interactions.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { vTooltip, CoarPopover } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <h2 class="component-section-title">Tooltip (v-tooltip directive)</h2>
      <p class="component-section-description">Hover or focus any element to show a tooltip. Keyboard accessible.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Tooltip</h3>
          <p class="example-description">Add <code>v-tooltip</code> to any element. Hover to see the tooltip.</p>
          <div class="example-demo demo-row">
            <CoarButton v-tooltip="'Save your changes'">Save</CoarButton>
            <CoarButton variant="danger" v-tooltip="'This action cannot be undone'">Delete</CoarButton>
            <CoarButton variant="ghost" v-tooltip="'Cancel and go back'">Cancel</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeTooltip" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Placements</h3>
          <p class="example-description">Tooltips can appear on any side. Hover to see positioning.</p>
          <div class="example-demo placement-demo">
            <CoarButton v-tooltip="{ text: 'Top tooltip', placement: 'top' }">Top</CoarButton>
            <CoarButton v-tooltip="{ text: 'Bottom tooltip', placement: 'bottom' }">Bottom</CoarButton>
            <CoarButton v-tooltip="{ text: 'Left tooltip', placement: 'left' }">Left</CoarButton>
            <CoarButton v-tooltip="{ text: 'Right tooltip', placement: 'right' }">Right</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeTooltipPlacements" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>On Icon Buttons</h3>
          <p class="example-description">Essential for icon-only buttons — provides accessible labels.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="ghost" icon-start="plus" v-tooltip="'Add new item'" aria-label="Add new item" />
            <CoarButton variant="ghost" icon-start="copy" v-tooltip="'Copy to clipboard'" aria-label="Copy" />
            <CoarButton variant="ghost" icon-start="trash-2" v-tooltip="'Delete selected'" aria-label="Delete" />
            <CoarButton variant="ghost" icon-start="settings" v-tooltip="'Open settings'" aria-label="Settings" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>On Any Element</h3>
          <p class="example-description"><code>v-tooltip</code> works on any HTML element, not just buttons.</p>
          <div class="example-demo demo-row">
            <span v-tooltip="'This is a span'" class="tooltip-target">Hover me (span)</span>
            <CoarIcon name="circle-help" size="l" v-tooltip="'Help: Click for more info'" style="cursor: help" />
            <code v-tooltip="'CSS custom property'" style="cursor: default">--coar-spacing-m</code>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Popover</h2>
      <p class="component-section-description">For richer content that needs interaction. Click to open, click outside to close.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Popover</h3>
          <p class="example-description">Click the trigger to open. Contains rich interactive content.</p>
          <div class="example-demo demo-row">
            <CoarPopover mode="click">
              <CoarButton>Open Popover</CoarButton>
              <template #content>
                <div class="popover-content">
                  <h4>Popover Title</h4>
                  <p class="coar-body-small">This is rich content inside a popover. It can contain forms, lists, and other components.</p>
                  <CoarButton variant="primary" size="s" style="margin-top: var(--coar-spacing-s)">Action</CoarButton>
                </div>
              </template>
            </CoarPopover>

            <CoarPopover mode="click">
              <CoarButton variant="secondary">More Info</CoarButton>
              <template #content>
                <div class="popover-content">
                  <p class="coar-body-small">Popovers auto-position to stay within the viewport.</p>
                </div>
              </template>
            </CoarPopover>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codePopover" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>When to Use Which</h3>
          <p class="example-description">Choose the right component for your use case.</p>
          <div class="comparison-table">
            <div class="comparison-row comparison-row--header">
              <span></span>
              <span>Tooltip</span>
              <span>Popover</span>
            </div>
            <div class="comparison-row">
              <span>Trigger</span>
              <span>Hover / Focus</span>
              <span>Click</span>
            </div>
            <div class="comparison-row">
              <span>Content</span>
              <span>Text only</span>
              <span>Rich HTML</span>
            </div>
            <div class="comparison-row">
              <span>Interactive</span>
              <span>No</span>
              <span>Yes</span>
            </div>
            <div class="comparison-row">
              <span>Touch</span>
              <span>Focus only</span>
              <span>Full support</span>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Tooltip & Popover API</summary>
        <div class="api-content">
          <h4>v-tooltip Options</h4>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>text</code></td><td><code>string</code></td><td><code>—</code></td><td>Tooltip text (or pass string directly)</td></tr>
              <tr><td><code>placement</code></td><td><code>'top' | 'bottom' | 'left' | 'right'</code></td><td><code>'top'</code></td><td>Preferred tooltip placement</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the tooltip</td></tr>
            </tbody>
          </table>
          <h4>CoarPopover Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>mode</code></td><td><code>'hover' | 'click' | 'both'</code></td><td><code>'hover'</code></td><td>How the popover is triggered</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the popover</td></tr>
              <tr><td><code>interactive</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Whether panel receives pointer events</td></tr>
              <tr><td><code>offset</code></td><td><code>number</code></td><td><code>6</code></td><td>Gap in px from trigger to panel</td></tr>
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
  cursor: default;
}

.placement-demo { display: flex; flex-wrap: wrap; gap: var(--coar-spacing-s); padding: var(--coar-spacing-l) 0; }

.tooltip-target {
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  font-size: var(--coar-body-small-base-size);
  cursor: default;
}

.popover-content {
  padding: var(--coar-spacing-m);
  max-width: 240px;
}

.popover-content h4 { margin: 0 0 var(--coar-spacing-xs); }
.popover-content p { margin: 0; }

.comparison-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--coar-border-neutral-secondary); border-radius: var(--coar-radius-s); overflow: hidden; }
.comparison-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  font-size: var(--coar-body-small-base-size);
  border-bottom: 1px solid var(--coar-border-neutral-secondary);
  gap: var(--coar-spacing-s);
}
.comparison-row:last-child { border-bottom: none; }
.comparison-row--header {
  background: var(--coar-background-neutral-secondary);
  font-weight: var(--coar-body-base-bold-weight);
  color: var(--coar-text-neutral-secondary);
}
</style>
