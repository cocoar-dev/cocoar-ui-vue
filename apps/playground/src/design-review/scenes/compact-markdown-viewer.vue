<script setup lang="ts">
// Markdown viewer, profile-neutral (profile class from an ancestor), rendered
// from a fixed document: heading hierarchy, reading
// text, inline code, links, lists, task list, quote, table, rule, frontmatter,
// a code block and an unregistered embed.
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';

const doc = parse(`---
owner: Ada Lovelace
status: Draft
---

# Quarterly review

Reading text with **strong**, *emphasis*, a [link](https://example.com) and \`inline code\`.
Longer German words wrap: Zuständigkeitsübertragung, Prüfungsergebnis, Größenänderung.

## Section heading

### Subsection heading

#### Level four

##### Level five

###### Level six

- First point
- Second point with more text

1. Ordered one
2. Ordered two

- [ ] Open task
- [x] Done task

> A quoted remark, kept muted.

| Name | Status | Amount |
| --- | --- | --- |
| Alpha | Open | 1,250.00 |
| Beta | Closed | 980.50 |
| Gamma | Open | 12.00 |

---

\`\`\`ts
const total = items.reduce((sum, item) => sum + item.amount, 0);
\`\`\`

:::unknown-widget{id=1}
`);
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Markdown viewer</h2>
    <CoarMarkdown :doc="doc" />
  </section>
</template>
