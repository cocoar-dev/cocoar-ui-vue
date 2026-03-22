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

The default variant uses a dark background for standalone code. The `info` variant has a lighter background that blends into documentation callouts and instructional content.

<preview path="./code-block/demos/CodeBlockVariants.vue" />

## Without Line Numbers

Turn off line numbers for short, inline examples where a cleaner look is preferred.

<preview path="./code-block/demos/CodeBlockNoLineNumbers.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | `''` | The source code to display |
| `language` | `string` | `'typescript'` | Syntax highlighting language |
| `variant` | `'default' \| 'info'` | `'default'` | Background style variant |
| `collapsible` | `boolean` | `true` | Show collapse/expand toggle |
| `collapsed` | `boolean` | `false` | Start in collapsed state |
| `showLineNumbers` | `boolean` | `true` | Show line numbers |
| `elevated` | `boolean` | `false` | Add box shadow |
