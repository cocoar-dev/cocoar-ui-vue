# Code Block

Display source code with syntax highlighting, a one-click copy button, and optional collapsing. Use it in documentation, onboarding flows, or anywhere users need to read or copy code snippets.

```ts
import { CoarCodeBlock } from '@cocoar/vue-ui';
```

## Language Support

Built-in highlighting for TypeScript, HTML, CSS, Bash, JSON, and more. The language is detected from the `language` prop, so colors and tokens always match the syntax.

<preview path="./code-block/demos/CodeBlockLanguages.vue" />

<preview path="./code-block/demos/CodeBlockBashJson.vue" />

## Collapsible Behavior

Keep long snippets from dominating the page. Start them collapsed so users can expand on demand, or disable collapsing when the code should always be visible.

<preview path="./code-block/demos/CodeBlockCollapsed.vue" />

## Variants

The default `neutral` variant uses a neutral background. Other variants color the header area to match semantic context — `info`, `success`, `warning`, `error`, or `accent`.

<preview path="./code-block/demos/CodeBlockVariants.vue" />

## With Line Numbers

Enable line numbers for larger code blocks where users need to reference specific lines.

<preview path="./code-block/demos/CodeBlockNoLineNumbers.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | `''` | The source code to display |
| `language` | `string` | `'html'` | Syntax highlighting language |
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Header color variant |
| `title` | `string` | `''` | Optional title/filename label |
| `collapsible` | `boolean` | `true` | Show collapse/expand toggle |
| `collapsed` | `boolean` | `false` | Start in collapsed state |
| `showLineNumbers` | `boolean` | `false` | Show line numbers |
| `showCopy` | `boolean` | `true` | Show copy-to-clipboard button |
| `maxHeight` | `number` | `0` | Maximum height in px before scrolling (0 = no limit) |
| `borderless` | `boolean` | `false` | Hide border and border-radius |
| `elevated` | `boolean` | `false` | Add box shadow |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/guide/i18n).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.codeBlock.copy` | `'Copy'` | Copy button text |
| `coar.ui.codeBlock.copied` | `'Copied!'` | Copy button text (after success) |
| `coar.ui.codeBlock.failed` | `'Failed'` | Copy button text (after error) |
| `coar.ui.codeBlock.copyLabel` | `'Copy code'` | Copy button `aria-label` |
| `coar.ui.codeBlock.toggleVisibility` | `'Toggle code visibility'` | Collapse/expand button `aria-label` |
| `coar.ui.codeBlock.code` | `'Code'` | Code block `aria-label` |
