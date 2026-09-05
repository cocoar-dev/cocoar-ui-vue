<!-- Generated from apps/docs/guide/getting-started.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Getting Started

Set up the Cocoar Design System in your Vue 3 project in a few steps.

## 1. Install

```bash
pnpm add @cocoar/vue-ui
```

## 2. Import Fonts & Styles

Import fonts and styles in your app's entry point. Fonts are self-hosted via `@fontsource` — no external CDN needed.

```ts
// main.ts
import '@cocoar/vue-ui/fonts';   // Poppins + Inter (self-hosted)
import '@cocoar/vue-ui/styles';  // Design tokens + component styles
```

> **Info: Bring your own fonts?**
>
> The font import is optional. If you prefer a CDN or custom fonts, skip `@cocoar/vue-ui/fonts` and load them yourself. Components fall back to system fonts gracefully.

## 3. Use Components

Import components directly — no global registration required. Tree-shaking is automatic.

```vue
<script setup>
import { CoarButton } from '@cocoar/vue-ui';
</script>

<template>
  <CoarButton>Hello Coar</CoarButton>
</template>
```

## 4. Dark Mode

Toggle dark mode by adding the `.dark-mode` class to the root element. All design tokens and components adapt automatically.

```ts
document.documentElement.classList.toggle('dark-mode', isDark);
```

## 5. Overlay System

For components that render overlays (Dialog, Toast, Popover, Tooltip), register the plugin once:

```ts
// main.ts
import { createApp } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');
```

And add the overlay host to your root layout:

```vue
<template>
  <router-view />
  <CoarOverlayHost />
</template>
```

## Date/Time Components

The date and time pickers use the [Temporal API](https://tc39.es/proposal-temporal/docs/) via `@js-temporal/polyfill`, which is included as a dependency of `@cocoar/vue-ui`. No extra install needed. When native Temporal support reaches all browsers, the polyfill can be dropped in a future major release.

## Additional Packages

Optional packages for extended functionality:

```bash
pnpm add @cocoar/vue-localization   # i18n & timezone
pnpm add @cocoar/vue-data-grid      # AG Grid wrapper
pnpm add @cocoar/vue-markdown       # Markdown viewer
```

## AI Coding Assistants

`@cocoar/vue-ui` ships an [Agent Skill](https://agentskills.io/) — a `SKILL.md` plus this
documentation page by page, with every demo inlined as a `vue` code block — so a coding assistant
in your project knows the library's API and the mistakes it would otherwise make. It sits in a
`skills/` folder at the package root and takes no part in your build: nothing is loaded unless you
install it.

With the [skills CLI](https://github.com/vercel-labs/skills) (no extra tooling; Claude Code,
Cursor, Codex, Copilot and others):

```bash
# From the installed package — matches the version you use
npx skills add ./node_modules/@cocoar/vue-ui

# Or straight from GitHub — the latest docs
npx skills add cocoar-dev/cocoar-ui-vue
```

With [agentskills-cli](https://mysticmind.github.io/agentskills-cli/) (a .NET tool that also
reads npm packages):

```bash
agentskills-cli add @cocoar/vue-ui
```

Either places the skill in `.claude/skills/` for Claude Code and `.agents/skills/` for the
agents that read the standard; `-g` installs it globally instead. Without a tool, copy
`node_modules/@cocoar/vue-ui/skills/cocoar-vue-ui/` into the same folder by hand.

The skill is generated from these docs, so it says what the docs say for the version you
reference. The same content is available online as [llms.txt](https://docs.cocoar.dev/cocoar-ui-vue/llms.txt) (an index with one line
per page) and [llms-full.txt](https://docs.cocoar.dev/cocoar-ui-vue/llms-full.txt) (everything in one file) for assistants that fetch
documentation by URL.
