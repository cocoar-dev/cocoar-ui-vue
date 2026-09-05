---
description: "Set up @cocoar/vue-ui in a Vue 3 project: install, import fonts and styles, use components, toggle dark mode, and register the overlay plugin."
---

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

::: info Bring your own fonts?
The font import is optional. If you prefer a CDN or custom fonts, skip `@cocoar/vue-ui/fonts` and load them yourself. Components fall back to system fonts gracefully.
:::

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

Once `@cocoar/vue-ui` is installed, one command installs the skill of exactly that version:

```bash
npx @cocoar/vue-ui skill
```

It hands the package's skill folder to the [skills CLI](https://github.com/vercel-labs/skills),
which detects the agents in your project (Claude Code, Cursor, Codex, Copilot and others) and
asks where to install. Its options pass through: `-y` accepts the defaults, `-g` installs
user-wide instead of into the project, `-a claude-code` targets one agent.

Two alternatives: `npx skills add cocoar-dev/cocoar-ui-vue` takes the latest docs straight from
GitHub, and [agentskills-cli](https://mysticmind.github.io/agentskills-cli/) (a .NET tool that
also reads npm packages) installs it with `agentskills-cli add @cocoar/vue-ui`.

Either places the skill in `.claude/skills/` for Claude Code and `.agents/skills/` for the
agents that read the standard. Without a tool, copy
`node_modules/@cocoar/vue-ui/skills/cocoar-vue-ui/` into the same folder by hand.

The skill is generated from these docs, so it says what the docs say for the version you
reference. The same content is available online as [llms.txt](/llms.txt) (an index with one line
per page) and [llms-full.txt](/llms-full.txt) (everything in one file) for assistants that fetch
documentation by URL.
