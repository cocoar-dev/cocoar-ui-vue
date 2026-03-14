<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarAvatar, CoarButton, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const notifCount = ref(5);
const pulsing = ref(true);

const codeVariants = `<CoarBadge :content="42" variant="primary" />
<CoarBadge :content="42" variant="secondary" />
<CoarBadge :content="42" variant="success" />
<CoarBadge :content="42" variant="warning" />
<CoarBadge :content="42" variant="error" />
<CoarBadge :content="42" variant="info" />`;

const codeSizes = `<CoarBadge :content="7" size="xs" />
<CoarBadge :content="7" size="s" />
<CoarBadge :content="7" size="m" />
<CoarBadge :content="7" size="l" />
<CoarBadge :content="7" size="xl" />`;

const codeText = `<CoarBadge content="New" variant="info" />
<CoarBadge content="Beta" variant="warning" />
<CoarBadge content="Pro" variant="success" />`;

const codeMax = `<CoarBadge :content="5" :max="99" />
<CoarBadge :content="100" :max="99" />
<CoarBadge :content="999" :max="99" />`;

const codeDot = `<CoarBadge variant="success" dot />
<CoarBadge variant="error" dot />
<CoarBadge variant="warning" dot />
<CoarBadge variant="secondary" dot />`;

const codePulse = `<CoarBadge :content="3" variant="error" pulse />
<CoarBadge variant="error" dot pulse />
<CoarBadge content="Live" variant="error" pulse />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Badge</h1>
      <p class="page-description">
        Badges highlight status, counts, or labels. They can display numbers, text, or appear as simple dots for status indicators.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarBadge } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Six semantic variants to communicate different meanings.</p>
          <div class="example-demo demo-row">
            <div class="badge-item"><CoarBadge :content="42" variant="primary" /><span>PRIMARY</span></div>
            <div class="badge-item"><CoarBadge :content="42" variant="secondary" /><span>SECONDARY</span></div>
            <div class="badge-item"><CoarBadge :content="42" variant="success" /><span>SUCCESS</span></div>
            <div class="badge-item"><CoarBadge :content="42" variant="warning" /><span>WARNING</span></div>
            <div class="badge-item"><CoarBadge :content="42" variant="error" /><span>ERROR</span></div>
            <div class="badge-item"><CoarBadge :content="42" variant="info" /><span>INFO</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVariants" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Five preset sizes matching the icon size scale.</p>
          <div class="example-demo demo-row demo-row--align-end">
            <div class="badge-item"><CoarBadge :content="7" size="xs" /><span>XS (12px)</span></div>
            <div class="badge-item"><CoarBadge :content="7" size="s" /><span>S (16px)</span></div>
            <div class="badge-item"><CoarBadge :content="7" size="m" /><span>M (20px)</span></div>
            <div class="badge-item"><CoarBadge :content="7" size="l" /><span>L (24px)</span></div>
            <div class="badge-item"><CoarBadge :content="7" size="xl" /><span>XL (32px)</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Text Content</h3>
          <p class="example-description">Badges can display short text labels, not just numbers.</p>
          <div class="example-demo demo-row">
            <CoarBadge content="New" variant="info" size="l" />
            <CoarBadge content="Beta" variant="warning" size="l" />
            <CoarBadge content="Pro" variant="success" size="l" />
            <CoarBadge content="Hot" variant="error" size="l" />
            <CoarBadge content="v2" variant="secondary" size="l" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeText" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Max Value</h3>
          <p class="example-description">Cap displayed numbers using <code>max</code>. Useful for notification counts.</p>
          <div class="example-demo demo-row">
            <div class="badge-item"><CoarBadge :content="5" :max="99" /><span>5 (max 99)</span></div>
            <div class="badge-item"><CoarBadge :content="99" :max="99" /><span>99 (max 99)</span></div>
            <div class="badge-item"><CoarBadge :content="100" :max="99" /><span>100 → "99+"</span></div>
            <div class="badge-item"><CoarBadge :content="999" :max="99" /><span>999 → "99+"</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeMax" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Dot Mode</h3>
          <p class="example-description">Use <code>dot</code> mode for simple status indicators without content.</p>
          <div class="example-demo demo-row">
            <div class="dot-item"><CoarBadge variant="success" dot /><span>Online</span></div>
            <div class="dot-item"><CoarBadge variant="error" dot /><span>Offline</span></div>
            <div class="dot-item"><CoarBadge variant="warning" dot /><span>Away</span></div>
            <div class="dot-item"><CoarBadge variant="secondary" dot /><span>Unknown</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeDot" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Pulse Animation</h3>
          <p class="example-description">Add a subtle pulse animation to draw attention to new notifications.</p>
          <div class="example-demo demo-row">
            <div class="badge-item"><CoarBadge :content="3" variant="error" :pulse="true" /><span>PULSING BADGE</span></div>
            <div class="badge-item"><CoarBadge variant="error" dot :pulse="true" /><span>PULSING DOT</span></div>
            <div class="badge-item"><CoarBadge content="Live" variant="error" :pulse="true" size="l" /><span>LIVE INDICATOR</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codePulse" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Bordered</h3>
          <p class="example-description">Add a white border using <code>bordered</code>. Useful when badges overlap other elements.</p>
          <div class="example-demo demo-row">
            <div class="badge-item"><CoarBadge :content="5" bordered /><span>WITH BORDER</span></div>
            <div class="badge-item"><CoarBadge :content="5" /><span>WITHOUT BORDER</span></div>
            <div class="avatar-badge-wrapper">
              <CoarAvatar name="JD" size="l" />
              <CoarBadge :content="3" variant="error" bordered class="corner-badge" />
              <span class="item-label">ON AVATAR</span>
            </div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Interactive Demo</h3>
          <p class="example-description">Try incrementing the notification count to see how the badge updates.</p>
          <div class="example-demo">
            <div class="interactive-demo">
              <div class="notif-trigger">
                <span style="font-size: 24px">🔔</span>
                <CoarBadge :content="notifCount" :max="99" variant="error" :pulse="pulsing" class="notif-badge" />
              </div>
              <div class="demo-row" style="margin-bottom: 0">
                <CoarButton variant="primary" size="s" @click="notifCount++">Add Notification</CoarButton>
                <CoarButton variant="secondary" size="s" @click="notifCount = 0">Clear All</CoarButton>
              </div>
              <label class="pulse-toggle">
                <input type="checkbox" v-model="pulsing" />
                Pulse Animation
              </label>
              <p class="demo-value">Current count: {{ notifCount }}</p>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Badge API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>content</code></td><td><code>string | number</code></td><td><code>''</code></td><td>Badge content (text or number)</td></tr>
              <tr><td><code>variant</code></td><td><code>'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'</code></td><td><code>'primary'</code></td><td>Badge color variant</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l' | 'xl'</code></td><td><code>'m'</code></td><td>Badge size</td></tr>
              <tr><td><code>dot</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show as a small dot with no content</td></tr>
              <tr><td><code>max</code></td><td><code>number</code></td><td><code>null</code></td><td>Cap numeric content (e.g. 100 → "99+")</td></tr>
              <tr><td><code>pulse</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Add pulse animation</td></tr>
              <tr><td><code>bordered</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Add white border ring</td></tr>
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
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.badge-item span {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}

.dot-item {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
}

.avatar-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  gap: var(--coar-spacing-xs);
}

.corner-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.item-label {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  margin-left: var(--coar-spacing-xs);
  align-self: center;
}

.interactive-demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
}

.notif-trigger {
  position: relative;
  display: inline-flex;
  width: 40px;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.pulse-toggle {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
}
</style>
