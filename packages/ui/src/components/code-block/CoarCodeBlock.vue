<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import Prism from 'prismjs';

import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup';

export type CodeBlockVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';

export interface CoarCodeBlockProps {
  /** The code to display. */
  code: string;
  /** Language for syntax highlighting. */
  language?: string;
  /** Title/label for the code block. */
  title?: string;
  /** Whether the code block can be collapsed. */
  collapsible?: boolean;
  /** Whether the code block starts collapsed. */
  collapsed?: boolean;
  /** Whether to show the copy button. */
  showCopy?: boolean;
  /** Whether to show line numbers. */
  showLineNumbers?: boolean;
  /** Maximum height before scrolling (0 = no limit). */
  maxHeight?: number;
  /** Semantic variant for the header area. */
  variant?: CodeBlockVariant;
  /** Whether to hide the border and border-radius. */
  borderless?: boolean;
  /** Adds a box-shadow for elevation/depth. */
  elevated?: boolean;
}

const props = withDefaults(defineProps<CoarCodeBlockProps>(), {
  language: 'html',
  title: '',
  collapsible: true,
  collapsed: false,
  showCopy: true,
  showLineNumbers: false,
  maxHeight: 0,
  variant: 'neutral',
  borderless: false,
  elevated: false,
});

const langMap: Record<string, string> = {
  html: 'markup',
  vue: 'markup',
  xml: 'markup',
  svg: 'markup',
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
};

function mapLanguage(lang: string): string {
  return langMap[lang.toLowerCase()] || lang.toLowerCase();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const { t } = useI18n();

const isCollapsed = ref(false);
const copyFeedback = ref<'idle' | 'copied' | 'error'>('idle');

onMounted(() => {
  isCollapsed.value = props.collapsed;
});

const highlightedCode = computed(() => {
  const lang = mapLanguage(props.language);
  const grammar = Prism.languages[lang];
  if (grammar) {
    return Prism.highlight(props.code, grammar, lang);
  }
  return escapeHtml(props.code);
});

const highlightedLines = computed(() => highlightedCode.value.split('\n'));

const lines = computed(() => props.code.split('\n').map((_, i) => i + 1));

const hostClasses = computed(() => [
  'coar-code-block-host',
  {
    'coar-code-block--elevated': props.elevated,
    'coar-code-block--neutral': props.variant === 'neutral',
    'coar-code-block--success': props.variant === 'success',
    'coar-code-block--warning': props.variant === 'warning',
    'coar-code-block--error': props.variant === 'error',
    'coar-code-block--info': props.variant === 'info',
    'coar-code-block--accent': props.variant === 'accent',
  },
]);

function toggleCollapsed(): void {
  if (props.collapsible) {
    isCollapsed.value = !isCollapsed.value;
  }
}

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code);
    copyFeedback.value = 'copied';
    setTimeout(() => (copyFeedback.value = 'idle'), 2000);
  } catch {
    copyFeedback.value = 'error';
    setTimeout(() => (copyFeedback.value = 'idle'), 2000);
  }
}

defineExpose({ copyCode, copyFeedback, isCollapsed, lines });
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-code-block" :class="{ collapsed: isCollapsed, borderless: borderless }">
      <!-- Header -->
      <div class="coar-code-header">
        <div class="coar-code-header-left">
          <button
            v-if="collapsible"
            type="button"
            class="coar-code-toggle"
            :aria-expanded="!isCollapsed"
            :aria-label="t('coar.ui.codeBlock.toggleVisibility', undefined, 'Toggle code visibility')"
            @click="toggleCollapsed"
          >
            <svg
              class="coar-code-chevron"
              :class="{ rotated: !isCollapsed }"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <span v-if="title" class="coar-code-title">{{ title }}</span>
          <span v-else class="coar-code-language">{{ language }}</span>
        </div>

        <div class="coar-code-header-right">
          <button
            v-if="showCopy"
            type="button"
            class="coar-code-copy-btn"
            :aria-label="
              copyFeedback === 'copied'
                ? t('coar.ui.codeBlock.copied', undefined, 'Copied!')
                : copyFeedback === 'error'
                  ? t('coar.ui.codeBlock.failed', undefined, 'Failed')
                  : t('coar.ui.codeBlock.copyLabel', undefined, 'Copy code')
            "
            @click="copyCode"
          >
            {{
              copyFeedback === 'copied'
                ? t('coar.ui.codeBlock.copied', undefined, 'Copied!')
                : copyFeedback === 'error'
                  ? t('coar.ui.codeBlock.failed', undefined, 'Failed')
                  : t('coar.ui.codeBlock.copy', undefined, 'Copy')
            }}
          </button>
        </div>
      </div>

      <!-- Code Content -->
      <div
        v-if="!isCollapsed"
        class="coar-code-content"
        :style="maxHeight ? { maxHeight: maxHeight + 'px' } : undefined"
      >
        <pre v-if="showLineNumbers" class="coar-code-pre" aria-label="Code">
          <div class="coar-code-lines-grid">
            <div v-for="(line, idx) in highlightedLines" :key="idx" class="coar-code-line">
              <span class="coar-code-line-number">{{ idx + 1 }}</span>
              <span class="coar-code-line-content" v-html="line || '\u200b'"></span>
            </div>
          </div>
        </pre>
        <pre
          v-else
          class="coar-code-pre"
        ><code class="coar-code" v-html="highlightedCode"></code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-code-block-host {
  display: block;
}

.coar-code-block {
  border-radius: var(--coar-radius-s);
  border: 1px solid var(--coar-code-block-border);
  background: var(--coar-code-block-bg);
  overflow: hidden;
}

/* Header */
.coar-code-header {
  background: var(--coar-code-block-header-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--coar-spacing-s) 0.75rem;
  border-bottom: 1px solid var(--coar-code-block-border);
  min-height: 36px;
}

.coar-code-header-left {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.coar-code-header-right {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

/* Toggle button */
.coar-code-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--coar-code-block-text-muted);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    background var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-code-toggle:hover {
  color: var(--coar-code-block-text);
  background: var(--coar-code-block-button-bg-hover);
}

.coar-code-chevron {
  transition: transform var(--coar-duration-normal) var(--coar-ease-out);
}

.coar-code-chevron.rotated {
  transform: rotate(90deg);
}

/* Title / Language */
.coar-code-title {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-medium);
  color: var(--coar-code-block-text);
}

.coar-code-language {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--coar-component-xs-font-size);
  font-weight: var(--coar-font-weight-medium);
  color: var(--coar-code-block-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Copy button */
.coar-code-copy-btn {
  padding: var(--coar-spacing-xxs) var(--coar-spacing-s);
  font-size: var(--coar-component-xs-font-size);
  font-family: var(--coar-body-small-base-family);
  background: transparent;
  border: none;
  border-radius: var(--coar-radius-xs);
  color: var(--coar-code-block-text-muted);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    background var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-code-copy-btn:hover {
  color: var(--coar-code-block-text);
  background: var(--coar-code-block-button-bg-hover);
}

/* Code content */
.coar-code-content {
  overflow: auto;
}

.coar-code-pre {
  margin: 0;
  padding: var(--coar-spacing-m);
  overflow-x: auto;
}

.coar-code-lines-grid {
  display: grid;
  gap: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--coar-component-s-font-size);
  line-height: var(--coar-line-height-relaxed);
  color: var(--coar-code-block-text);
}

.coar-code-line {
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  align-items: center;
}

.coar-code-line-number {
  text-align: right;
  padding-right: 0.75rem;
  color: var(--coar-code-block-text-muted);
  user-select: none;
  font-size: var(--coar-body-caption-size);
  line-height: inherit;
}

.coar-code-line-content {
  white-space: pre;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

.coar-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--coar-component-s-font-size);
  line-height: var(--coar-line-height-relaxed);
  color: var(--coar-code-block-text);
  white-space: pre;
  display: block;
}

/* Elevated */
.coar-code-block--elevated .coar-code-block {
  box-shadow: var(--coar-elevation-medium);
}

/* Borderless */
.coar-code-block.borderless {
  border: none;
  border-radius: 0;
}

/* Collapsed */
.coar-code-block.collapsed .coar-code-header {
  border-bottom: none;
}

/* Color variants */
.coar-code-block--info .coar-code-block {
  border-color: var(--coar-border-semantic-info-subtle);
}
.coar-code-block--info .coar-code-header {
  background: var(--coar-background-semantic-info-subtle);
  border-bottom-color: var(--coar-border-semantic-info-subtle);
}

.coar-code-block--success .coar-code-block {
  border-color: var(--coar-border-semantic-success-subtle);
}
.coar-code-block--success .coar-code-header {
  background: var(--coar-background-semantic-success-subtle);
  border-bottom-color: var(--coar-border-semantic-success-subtle);
}

.coar-code-block--warning .coar-code-block {
  border-color: var(--coar-border-semantic-warning-subtle);
}
.coar-code-block--warning .coar-code-header {
  background: var(--coar-background-semantic-warning-subtle);
  border-bottom-color: var(--coar-border-semantic-warning-subtle);
}

.coar-code-block--error .coar-code-block {
  border-color: var(--coar-border-semantic-error-subtle);
}
.coar-code-block--error .coar-code-header {
  background: var(--coar-background-semantic-error-subtle);
  border-bottom-color: var(--coar-border-semantic-error-subtle);
}

.coar-code-block--accent .coar-code-block {
  border-color: var(--coar-border-accent-secondary);
}
.coar-code-block--accent .coar-code-header {
  background: var(--coar-background-accent-secondary);
  border-bottom-color: var(--coar-border-accent-secondary);
}

/* Prism syntax tokens — use :deep because v-html doesn't get scoped attrs */
.coar-code :deep(.token.comment),
.coar-code :deep(.token.prolog),
.coar-code :deep(.token.doctype),
.coar-code :deep(.token.cdata) {
  color: var(--coar-code-block-comment);
}

.coar-code :deep(.token.punctuation) {
  color: var(--coar-code-block-punctuation);
}

.coar-code :deep(.token.property),
.coar-code :deep(.token.tag),
.coar-code :deep(.token.boolean),
.coar-code :deep(.token.number),
.coar-code :deep(.token.constant),
.coar-code :deep(.token.symbol),
.coar-code :deep(.token.deleted) {
  color: var(--coar-code-block-number);
}

.coar-code :deep(.token.selector),
.coar-code :deep(.token.attr-name),
.coar-code :deep(.token.string),
.coar-code :deep(.token.char),
.coar-code :deep(.token.builtin),
.coar-code :deep(.token.inserted) {
  color: var(--coar-code-block-string);
}

.coar-code :deep(.token.operator),
.coar-code :deep(.token.entity),
.coar-code :deep(.token.url),
.coar-code :deep(.language-css .token.string),
.coar-code :deep(.style .token.string) {
  color: var(--coar-code-block-operator);
}

.coar-code :deep(.token.atrule),
.coar-code :deep(.token.attr-value),
.coar-code :deep(.token.keyword) {
  color: var(--coar-code-block-keyword);
}

.coar-code :deep(.token.function),
.coar-code :deep(.token.class-name) {
  color: var(--coar-code-block-function);
}

.coar-code :deep(.token.regex),
.coar-code :deep(.token.important),
.coar-code :deep(.token.variable) {
  color: var(--coar-code-block-class);
}

.coar-code :deep(.token.important),
.coar-code :deep(.token.bold) {
  font-weight: bold;
}

.coar-code :deep(.token.italic) {
  font-style: italic;
}
.coar-code :deep(.token.entity) {
  cursor: help;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-code-toggle,
  .coar-code-copy-btn {
    transition: none;
  }

  .coar-code-chevron {
    transition: none;
  }
}

.coar-code :deep(.token.tag .token.tag) {
  color: var(--coar-code-block-tag);
}
.coar-code :deep(.token.tag .token.attr-name) {
  color: var(--coar-code-block-attr-name);
}
.coar-code :deep(.token.tag .token.attr-value),
.coar-code :deep(.token.tag .token.attr-value .token.punctuation) {
  color: var(--coar-code-block-attr-value);
}

/* Line number Prism tokens */
.coar-code-line-content :deep(.token.comment),
.coar-code-line-content :deep(.token.prolog),
.coar-code-line-content :deep(.token.doctype),
.coar-code-line-content :deep(.token.cdata) {
  color: var(--coar-code-block-comment);
}
.coar-code-line-content :deep(.token.punctuation) {
  color: var(--coar-code-block-punctuation);
}
.coar-code-line-content :deep(.token.property),
.coar-code-line-content :deep(.token.tag),
.coar-code-line-content :deep(.token.boolean),
.coar-code-line-content :deep(.token.number),
.coar-code-line-content :deep(.token.constant),
.coar-code-line-content :deep(.token.symbol),
.coar-code-line-content :deep(.token.deleted) {
  color: var(--coar-code-block-number);
}
.coar-code-line-content :deep(.token.selector),
.coar-code-line-content :deep(.token.attr-name),
.coar-code-line-content :deep(.token.string),
.coar-code-line-content :deep(.token.char),
.coar-code-line-content :deep(.token.builtin),
.coar-code-line-content :deep(.token.inserted) {
  color: var(--coar-code-block-string);
}
.coar-code-line-content :deep(.token.keyword) {
  color: var(--coar-code-block-keyword);
}
.coar-code-line-content :deep(.token.function),
.coar-code-line-content :deep(.token.class-name) {
  color: var(--coar-code-block-function);
}
</style>
