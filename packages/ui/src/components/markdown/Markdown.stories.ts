import type { Meta, StoryObj } from '@storybook/vue3';
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarMarkdown> = {
  title: 'Data Display/Markdown',
  component: CoarMarkdown,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CoarMarkdown>;

export const Basic: Story = {
  render: () => ({
    components: { CoarMarkdown },
    setup() {
      const doc = parse(`# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold**, *italic*, and \`inline code\` text.

Here's a [link to example](https://example.com) and some more text.`);
      return { doc };
    },
    template: '<CoarMarkdown :doc="doc" />',
  }),
};

export const GFMFeatures: Story = {
  render: () => ({
    components: { CoarMarkdown },
    setup() {
      const doc = parse(`## Task List

- [x] Completed task
- [ ] Pending task
- [ ] Another task

## Table

| Feature | Status | Priority |
|---------|--------|----------|
| Tables | ~~Done~~ | High |
| Task Lists | Done | Medium |
| Strikethrough | Done | Low |`);
      return { doc };
    },
    template: '<CoarMarkdown :doc="doc" />',
  }),
};

export const CodeBlocks: Story = {
  render: () => ({
    components: { CoarMarkdown },
    setup() {
      const doc = parse(`## Code Examples

\`\`\`typescript
interface User {
  name: string;
  email: string;
}

function greet(user: User): string {
  return \\\`Hello, \\\${user.name}!\\\`;
}
\`\`\`

\`\`\`css
.container {
  display: flex;
  gap: 1rem;
}
\`\`\``);
      return { doc };
    },
    template: '<CoarMarkdown :doc="doc" />',
  }),
};

export const RichDocument: Story = {
  render: () => ({
    components: { CoarMarkdown },
    setup() {
      const doc = parse(`# Project Documentation

A comprehensive guide to our project.

## Overview

This project provides a **powerful** markdown rendering engine with support for *all common* markdown features.

> Note: This component renders pre-parsed markdown documents for maximum security and performance.

## Features

1. Headings with anchors
2. Inline formatting
3. Block quotes
4. Lists (ordered and unordered)

---

### Getting Started

Install the package:

\`\`\`bash
pnpm add @cocoar/vue-markdown-core
\`\`\`

Then use it in your component:

\`\`\`typescript
import { parse } from '@cocoar/vue-markdown-core';

const doc = parse('# Hello World');
\`\`\`

For more details, visit [the documentation](https://example.com/docs).

![Placeholder](https://via.placeholder.com/600x200?text=Markdown+Viewer)`);
      return { doc };
    },
    template: '<CoarMarkdown :doc="doc" />',
  }),
};
