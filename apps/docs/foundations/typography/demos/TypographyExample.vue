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
