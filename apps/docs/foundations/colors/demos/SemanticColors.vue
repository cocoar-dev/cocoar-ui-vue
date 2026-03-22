<template>
  <div class="semantic-colors">
    <div v-for="group in groups" :key="group.title" class="token-group">
      <div class="group-header">
        <span class="group-icon">{{ group.icon }}</span>
        <h4 class="group-title">{{ group.title }}</h4>
      </div>
      <div class="token-list">
        <div
          v-for="token in group.tokens"
          :key="token.variable"
          class="token-row"
        >
          <div
            class="token-swatch"
            :class="{ 'token-swatch--text': token.type === 'text', 'token-swatch--border': token.type === 'border' }"
            :style="swatchStyle(token)"
          >
            <span v-if="token.type === 'text'" class="text-preview" :style="{ color: `var(${token.variable})` }">Ag</span>
            <span v-if="token.type === 'border'" class="border-preview" :style="{ borderColor: `var(${token.variable})` }"></span>
          </div>
          <div class="token-meta">
            <span class="token-name">{{ token.label }}</span>
            <code class="token-var">{{ token.variable }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Token {
  label: string;
  variable: string;
  type: 'background' | 'text' | 'border';
}

interface TokenGroup {
  title: string;
  icon: string;
  tokens: Token[];
}

function swatchStyle(token: Token) {
  if (token.type === 'background') {
    return { backgroundColor: `var(${token.variable})` };
  }
  return {};
}

const groups: TokenGroup[] = [
  {
    title: 'Backgrounds',
    icon: '\u25A3',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-background-neutral-primary', type: 'background' },
      { label: 'Neutral Secondary', variable: '--coar-background-neutral-secondary', type: 'background' },
      { label: 'Neutral Tertiary', variable: '--coar-background-neutral-tertiary', type: 'background' },
      { label: 'Accent Primary', variable: '--coar-background-accent-primary', type: 'background' },
      { label: 'Accent Secondary', variable: '--coar-background-accent-secondary', type: 'background' },
      { label: 'Accent Tertiary', variable: '--coar-background-accent-tertiary', type: 'background' },
      { label: 'Accent Hover', variable: '--coar-background-accent-hover', type: 'background' },
      { label: 'Brand Primary', variable: '--coar-background-brand-primary', type: 'background' },
      { label: 'Brand Secondary', variable: '--coar-background-brand-secondary', type: 'background' },
      { label: 'Brand Tertiary', variable: '--coar-background-brand-tertiary', type: 'background' },
    ],
  },
  {
    title: 'Text',
    icon: 'A',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-text-neutral-primary', type: 'text' },
      { label: 'Neutral Secondary', variable: '--coar-text-neutral-secondary', type: 'text' },
      { label: 'Neutral Tertiary', variable: '--coar-text-neutral-tertiary', type: 'text' },
      { label: 'Neutral Disabled', variable: '--coar-text-neutral-disabled', type: 'text' },
      { label: 'Accent Primary', variable: '--coar-text-accent-primary', type: 'text' },
      { label: 'Accent Secondary', variable: '--coar-text-accent-secondary', type: 'text' },
      { label: 'Brand Primary', variable: '--coar-text-brand-primary', type: 'text' },
    ],
  },
  {
    title: 'Borders',
    icon: '\u25A1',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-border-neutral-primary', type: 'border' },
      { label: 'Neutral Secondary', variable: '--coar-border-neutral-secondary', type: 'border' },
      { label: 'Neutral Tertiary', variable: '--coar-border-neutral-tertiary', type: 'border' },
      { label: 'Accent Primary', variable: '--coar-border-accent-primary', type: 'border' },
      { label: 'Accent Secondary', variable: '--coar-border-accent-secondary', type: 'border' },
      { label: 'Input', variable: '--coar-border-input', type: 'border' },
      { label: 'Input Hover', variable: '--coar-border-input-hover', type: 'border' },
    ],
  },
  {
    title: 'Status',
    icon: '\u25CF',
    tokens: [
      { label: 'Success Bold', variable: '--coar-background-semantic-success-bold', type: 'background' },
      { label: 'Success Subtle', variable: '--coar-background-semantic-success-subtle', type: 'background' },
      { label: 'Error Bold', variable: '--coar-background-semantic-error-bold', type: 'background' },
      { label: 'Error Subtle', variable: '--coar-background-semantic-error-subtle', type: 'background' },
      { label: 'Warning Bold', variable: '--coar-background-semantic-warning-bold', type: 'background' },
      { label: 'Warning Subtle', variable: '--coar-background-semantic-warning-subtle', type: 'background' },
      { label: 'Info Bold', variable: '--coar-background-semantic-info-bold', type: 'background' },
      { label: 'Info Subtle', variable: '--coar-background-semantic-info-subtle', type: 'background' },
    ],
  },
];
</script>

<style scoped>
.semantic-colors {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.group-icon {
  font-size: 14px;
  color: var(--vp-c-text-2);
  width: 20px;
  text-align: center;
}

.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.01em;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.token-row:hover {
  background-color: var(--vp-c-bg-soft);
}

/* --- Swatches --- */

.token-swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.token-swatch--text {
  background-color: var(--vp-c-bg-soft);
}

.text-preview {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.token-swatch--border {
  background: transparent;
  box-shadow: none;
}

.border-preview {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2.5px solid;
}

/* --- Meta --- */

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.token-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.token-var {
  font-size: 11px;
  color: var(--vp-c-text-3) !important;
  background: none !important;
  padding: 0 !important;
  font-family: var(--vp-font-family-mono);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
