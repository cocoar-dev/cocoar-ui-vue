<script setup lang="ts">
import { CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const installCode = `pnpm add @cocoar/vue-ui`;

const importCode = `// main.ts
import '@cocoar/vue-ui/styles';`;

const usageCode = `<script setup>
import { CoarButton } from '@cocoar/vue-ui';
<\/script>

<template>
  <CoarButton>Hello Coar</CoarButton>
</template>`;

const darkModeCode = `// Toggle dark mode
document.documentElement.classList.toggle('dark-mode', isDark);`;

const extraPackagesCode = `pnpm add @cocoar/vue-localization   # i18n & timezone
pnpm add @cocoar/vue-data-grid      # AG Grid wrapper
pnpm add @cocoar/vue-markdown       # Markdown viewer`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Getting Started</h1>
      <p class="page-description">
        Set up the Coar Design System in your Vue 3 project in a few steps.
        Install the package, import design tokens, and start using components.
      </p>
    </header>

    <div class="steps-content">
      <CoarCard elevated variant="info">
        <h3>1. Install</h3>
        <p class="coar-body-small">
          The <code>@cocoar/vue-ui</code> package gives you everything you need:
          components, design tokens, icons, and overlay utilities.
        </p>
        <CoarCodeBlock
          :code="installCode"
          language="bash"
          :collapsible="false"
        />
      </CoarCard>

      <CoarCard elevated variant="info">
        <h3>2. Import Styles</h3>
        <p class="coar-body-small">
          Import the stylesheet in your app's entry point.
          This loads all design tokens (CSS variables) and component styles.
        </p>
        <CoarCodeBlock
          :code="importCode"
          language="typescript"
          :collapsible="false"
        />
      </CoarCard>

      <CoarCard elevated variant="info">
        <h3>3. Use Components</h3>
        <p class="coar-body-small">
          Import components directly — no global registration required.
          Tree-shaking is automatic.
        </p>
        <CoarCodeBlock
          :code="usageCode"
          language="html"
          :collapsible="false"
        />
      </CoarCard>

      <CoarCard elevated variant="info">
        <h3>4. Dark Mode</h3>
        <p class="coar-body-small">
          Toggle dark mode by adding the <code>.dark-mode</code> class to the root element.
          All design tokens and components adapt automatically.
        </p>
        <CoarCodeBlock
          :code="darkModeCode"
          language="typescript"
          :collapsible="false"
        />
      </CoarCard>

      <CoarCard elevated variant="info">
        <h3>Additional Packages</h3>
        <p class="coar-body-small">
          Optional packages for extended functionality:
        </p>
        <CoarCodeBlock
          :code="extraPackagesCode"
          language="bash"
          :collapsible="false"
        />
      </CoarCard>

      <section class="whats-next">
        <h2 class="coar-heading">What's Next</h2>
        <div class="next-links">
          <RouterLink to="/foundations/colors" class="next-link">
            <CoarCard variant="neutral" elevated>
              <h3 class="coar-heading">Colors</h3>
              <p class="coar-body-small">Explore the full color palette and semantic tokens</p>
            </CoarCard>
          </RouterLink>
          <RouterLink to="/foundations/typography" class="next-link">
            <CoarCard variant="neutral" elevated>
              <h3 class="coar-heading">Typography</h3>
              <p class="coar-body-small">Type scale, fonts, and text styles</p>
            </CoarCard>
          </RouterLink>
          <RouterLink to="/form/button" class="next-link">
            <CoarCard variant="neutral" elevated>
              <h3 class="coar-heading">Buttons</h3>
              <p class="coar-body-small">Button variants, sizes, and states</p>
            </CoarCard>
          </RouterLink>
          <RouterLink to="/foundations/spacing" class="next-link">
            <CoarCard variant="neutral" elevated>
              <h3 class="coar-heading">Spacing</h3>
              <p class="coar-body-small">Spacing scale, sizing, and shadows</p>
            </CoarCard>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.steps-content {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 800px;
}

.steps-content h3 {
  margin: 0 0 var(--coar-spacing-s);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}

code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}

.whats-next {
  margin-top: var(--coar-spacing-xl);
}

.whats-next h2 {
  margin: 0 0 var(--coar-spacing-m);
}

.next-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--coar-spacing-m);
}

.next-link { text-decoration: none; }

.next-link h3 { margin: 0 0 var(--coar-spacing-xs); }
.next-link p { margin: 0; }
</style>
