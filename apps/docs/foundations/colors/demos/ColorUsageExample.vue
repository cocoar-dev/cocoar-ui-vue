<template>
  <div class="usage-demo">
    <div class="card-example">
      <div class="card-header">
        <div class="card-avatar">
          <span class="avatar-text">JD</span>
        </div>
        <div class="card-header-text">
          <span class="card-title">John Doe</span>
          <span class="card-subtitle">Senior Designer</span>
        </div>
      </div>
      <p class="card-body">
        This card is built entirely with semantic color tokens. Toggle between light and dark mode to see how every color adapts automatically.
      </p>
      <div class="card-tags">
        <span class="tag tag--accent">Design</span>
        <span class="tag tag--success">Active</span>
        <span class="tag tag--warning">Review</span>
      </div>
      <div class="card-footer">
        <button class="btn-primary">View Profile</button>
        <button class="btn-secondary">Message</button>
      </div>
    </div>

    <div class="token-annotations">
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-background-neutral-primary)"></span>
        <code>--coar-background-neutral-primary</code>
        <span class="annotation-desc">Card surface</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-text-neutral-primary)"></span>
        <code>--coar-text-neutral-primary</code>
        <span class="annotation-desc">Title text</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-text-neutral-secondary)"></span>
        <code>--coar-text-neutral-secondary</code>
        <span class="annotation-desc">Body text</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-background-accent-primary)"></span>
        <code>--coar-background-accent-primary</code>
        <span class="annotation-desc">Primary button</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-border-neutral-tertiary)"></span>
        <code>--coar-border-neutral-tertiary</code>
        <span class="annotation-desc">Card border</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usage-demo {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

/* --- Example Card --- */

.card-example {
  flex: 1;
  min-width: 260px;
  max-width: 360px;
  padding: 24px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--coar-background-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--coar-text-on-bold);
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
  line-height: 1.3;
}

.card-subtitle {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  line-height: 1.3;
}

.card-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--coar-text-neutral-secondary);
  margin: 0;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.tag--accent {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

.tag--success {
  background: var(--coar-background-semantic-success-subtle);
  color: var(--coar-text-semantic-success-bold);
}

.tag--warning {
  background: var(--coar-background-semantic-warning-subtle);
  color: var(--coar-text-semantic-warning-bold);
}

.card-footer {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-primary:hover {
  background: var(--coar-background-accent-hover);
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-tertiary);
  background: transparent;
  color: var(--coar-text-neutral-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-secondary:hover {
  background: var(--coar-background-neutral-tertiary);
}

/* --- Annotations --- */

.token-annotations {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.annotation {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.annotation-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.annotation code {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2) !important;
  background: none !important;
  padding: 0 !important;
  white-space: nowrap;
}

.annotation-desc {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-left: auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .usage-demo {
    flex-direction: column;
  }

  .card-example {
    max-width: 100%;
  }
}
</style>
