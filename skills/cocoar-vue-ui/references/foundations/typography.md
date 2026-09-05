<!-- Generated from apps/docs/foundations/typography.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Typography

Our type system creates clear visual hierarchy and ensures readability across all interfaces. Eleven styles cover everything from large display headings to fine-print footnotes.

## Type Scale

Each row shows the style rendered at its actual size, with font metadata alongside.

**Demo — `typography/demos/TypeScale.vue`**

```vue
<template>
  <div class="type-scale">
    <div v-for="item in typeScale" :key="item.label" class="type-row">
      <div class="type-meta">
        <span class="type-label">{{ item.label }}</span>
        <span class="type-spec">{{ item.spec }}</span>
      </div>
      <div class="type-sample-wrap">
        <p :class="item.class" class="type-sample">{{ item.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const typeScale = [
  { label: 'Display', class: 'coar-display', text: 'Display', spec: 'Inter / 72px / Bold' },
  { label: 'Title', class: 'coar-title', text: 'Title', spec: 'Inter / 48px / Bold' },
  { label: 'Subtitle', class: 'coar-subtitle', text: 'Subtitle', spec: 'Inter / 32px / Regular' },
  { label: 'Heading', class: 'coar-heading', text: 'Heading', spec: 'Poppins / 24px / SemiBold' },
  { label: 'Subheading', class: 'coar-subheading', text: 'Subheading', spec: 'Poppins / 20px / Regular' },
  { label: 'Body', class: 'coar-body', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Regular' },
  { label: 'Body Bold', class: 'coar-body-bold', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Bold' },
  { label: 'Body Small', class: 'coar-body-small', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Regular' },
  { label: 'Body Small Bold', class: 'coar-body-small-bold', text: 'The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Bold' },
  { label: 'Caption', class: 'coar-caption', text: 'Caption Text', spec: 'Poppins / 12px / Medium / Uppercase' },
  { label: 'Footnote', class: 'coar-footnote', text: 'Footnote — Small print and legal copy.', spec: 'Poppins / 10px / Regular' },
];
</script>

<style scoped>
.type-scale {
  display: flex;
  flex-direction: column;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 20px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.type-row:last-child {
  border-bottom: none;
}

.type-meta {
  flex: 0 0 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.type-spec {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.type-sample-wrap {
  flex: 1;
  min-width: 0;
}

.type-sample {
  margin: 0;
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .type-row {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .type-meta {
    flex: none;
  }
}
</style>
```

## Usage Example

Typography hierarchy applied to a realistic article layout — caption, title, subtitle, body, and footnote working together.

**Demo — `typography/demos/TypographyExample.vue`**

```vue
<template>
  <div class="article-example">
    <span class="coar-caption">DESIGN SYSTEMS &middot; 5 MIN READ</span>
    <h1 class="coar-title article-title">Building Consistent Interfaces</h1>
    <p class="coar-subtitle article-subtitle">
      How a shared type system improves readability and reduces design debt
    </p>
    <div class="article-body">
      <p class="coar-body">
        Typography is the backbone of any design system. A well-defined type scale creates
        clear visual hierarchy, helps users scan content quickly, and ensures readability
        across every screen size and device.
      </p>
      <p class="coar-body">
        <span class="coar-body-bold">Consistency matters.</span> When every heading, label, and
        body paragraph follows the same rules, the interface feels cohesive and professional.
        Users develop intuition for what each level of text means — they stop reading
        and start scanning.
      </p>
    </div>
    <div class="article-footer">
      <span class="coar-footnote">Last updated March 2026</span>
    </div>
  </div>
</template>

<style scoped>
.article-example {
  max-width: 640px;
  padding: 32px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.article-title {
  margin: 12px 0 4px;
}

.article-subtitle {
  margin: 0 0 24px;
  color: var(--vp-c-text-2);
}

.article-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-body p {
  margin: 0;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

.article-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}
</style>
```

## CSS Classes Reference

Apply these utility classes directly to any HTML element.

| Class | Role | Font | Size | Weight |
|---|---|---|---|---|
| `.coar-display` | Display | Inter | 72 px | Bold |
| `.coar-title` | Title | Inter | 48 px | Bold |
| `.coar-subtitle` | Subtitle | Inter | 32 px | Regular |
| `.coar-heading` | Heading | Poppins | 24 px | SemiBold |
| `.coar-subheading` | Subheading | Poppins | 20 px | Regular |
| `.coar-body` | Body | Poppins | 16 px | Regular |
| `.coar-body-bold` | Body Bold | Poppins | 16 px | Bold |
| `.coar-body-small` | Body Small | Poppins | 14 px | Regular |
| `.coar-body-small-bold` | Body Small Bold | Poppins | 14 px | Bold |
| `.coar-caption` | Caption | Poppins | 12 px | Medium, Uppercase |
| `.coar-footnote` | Footnote | Poppins | 10 px | Regular |

## Usage

```html
<h1 class="coar-title">Page Title</h1>
<p class="coar-subtitle">Supporting subtitle text</p>
<p class="coar-body">Main body content goes here.</p>
<span class="coar-caption">LABEL TEXT</span>
```

> **Tip: Font Loading**
>
> The type scale uses **Inter** for display-level text and **Poppins** for body and UI text. Import `@cocoar/vue-ui/fonts` to self-host both fonts — no external CDN required.
