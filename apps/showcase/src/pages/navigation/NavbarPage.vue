<script setup lang="ts">
import { CoarNavbar, CoarButton, CoarAvatar, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarNavbar>
  <template #start>
    <strong>MyApp</strong>
  </template>
  <template #center>
    <nav class="nav-links">
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </template>
  <template #end>
    <CoarButton variant="primary" size="s">Sign In</CoarButton>
  </template>
</CoarNavbar>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Navbar</h1>
      <p class="page-description">A top-level navigation bar with three content slots for flexible layout.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarNavbar } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated class="examples-grid__span">
          <h3>Basic Usage (Elevated)</h3>
          <p class="example-description">Default navbar with a subtle shadow. Uses three slots: start, center, end.</p>
          <div class="example-demo navbar-demo">
            <CoarNavbar>
              <template #start>
                <strong style="font-size: var(--coar-body-base-size)">MyApp</strong>
              </template>
              <template #center>
                <nav class="nav-links">
                  <a href="javascript:void(0)" class="nav-link">Home</a>
                  <a href="javascript:void(0)" class="nav-link">Features</a>
                  <a href="javascript:void(0)" class="nav-link">Pricing</a>
                  <a href="javascript:void(0)" class="nav-link">Docs</a>
                </nav>
              </template>
              <template #end>
                <CoarButton variant="ghost" size="s">Sign In</CoarButton>
                <CoarButton variant="primary" size="s">Get Started</CoarButton>
              </template>
            </CoarNavbar>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>App Navbar with User Avatar</h3>
          <p class="example-description">Common app navigation pattern with logo, nav links, and user profile.</p>
          <div class="example-demo navbar-demo">
            <CoarNavbar>
              <template #start>
                <div class="logo-area">
                  <div class="logo-icon">C</div>
                  <strong style="font-size: var(--coar-body-base-size)">cocoar</strong>
                </div>
              </template>
              <template #center>
                <nav class="nav-links">
                  <a href="javascript:void(0)" class="nav-link">Dashboard</a>
                  <a href="javascript:void(0)" class="nav-link">Projects</a>
                  <a href="javascript:void(0)" class="nav-link">Team</a>
                  <a href="javascript:void(0)" class="nav-link">Reports</a>
                </nav>
              </template>
              <template #end>
                <CoarButton variant="ghost" icon-start="important" size="s" aria-label="Notifications" />
                <CoarAvatar name="John Doe" size="s" />
              </template>
            </CoarNavbar>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Logo Only (Start Slot)</h3>
          <p class="example-description">Minimal navbar with just the logo and an action.</p>
          <div class="example-demo navbar-demo">
            <CoarNavbar>
              <template #start>
                <strong>Brand</strong>
              </template>
              <template #end>
                <CoarButton variant="primary" size="s">Open App</CoarButton>
              </template>
            </CoarNavbar>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Bordered (No Shadow)</h3>
          <p class="example-description">Alternative style without elevation shadow.</p>
          <div class="example-demo navbar-demo">
            <CoarNavbar bordered>
              <template #start>
                <strong>App</strong>
              </template>
              <template #end>
                <CoarButton variant="ghost" size="s">Menu</CoarButton>
              </template>
            </CoarNavbar>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Navbar API</summary>
        <div class="api-content">
          <h4>Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>bordered</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Use border instead of shadow</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>#start</code></td><td>Left-aligned content (logo, brand name)</td></tr>
              <tr><td><code>#center</code></td><td>Centered content (navigation links)</td></tr>
              <tr><td><code>#end</code></td><td>Right-aligned content (actions, user menu)</td></tr>
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

.navbar-demo {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  overflow: hidden;
}

.nav-links {
  display: flex;
  gap: var(--coar-spacing-m);
}

.nav-link {
  color: var(--coar-text-neutral-secondary);
  text-decoration: none;
  font-size: var(--coar-body-small-base-size);
  transition: color var(--coar-duration-fast) var(--coar-ease-out);
}

.nav-link:hover { color: var(--coar-text-neutral-primary); }

.logo-area { display: flex; align-items: center; gap: var(--coar-spacing-xs); }

.logo-icon {
  width: 28px;
  height: 28px;
  background: var(--coar-background-accent-primary);
  color: white;
  border-radius: var(--coar-radius-s);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}
</style>
