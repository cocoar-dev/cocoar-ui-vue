<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarPageRenderer,
  CoarPageBuilder,
  type PageNode,
  type ActionValues,
  type PageConfig,
} from '@cocoar/vue-page-builder';
import { CoarButton, CoarIcon, useDialog } from '@cocoar/vue-ui';
import PlaygroundAssetPicker, { type AssetItem } from '../components/PlaygroundAssetPicker.vue';
import { ratingElement } from '../components/rating/ratingElement';

// ─── Login schema ─────────────────────────────────────────────────────────────

const loginSchema: PageNode = {
  id: 'root',
  type: 'page',
  style: { align: 'center', padding: '48px' },
  children: [
    {
      id: 'card',
      type: 'card',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', props: { text: 'Welcome back', level: 1 } },
        { id: 'sub', type: 'paragraph', props: { text: 'Sign in to your account.' } },
        { id: 'div1', type: 'divider', props: {} },
        {
          id: 'email',
          type: 'text-input',
          name: 'email',
          props: {
            label: 'Email',
            inputType: 'email',
            placeholder: 'you@example.com',
          },
          validation: { required: true },
        },
        {
          id: 'password',
          type: 'text-input',
          name: 'password',
          props: {
            label: 'Password',
            inputType: 'password',
          },
          validation: { required: true, minLength: 8 },
        },
        {
          id: 'row-bottom',
          type: 'stack',
          props: { direction: 'row' },
          style: { gap: '8px', align: 'center' },
          children: [
            { id: 'remember', type: 'checkbox', name: 'rememberMe', props: { label: 'Remember me' }, defaultValue: false },
            { id: 'spacer', type: 'spacer', props: {} },
            { id: 'forgot', type: 'link', props: { label: 'Forgot password?', action: 'auth:forgot' } },
          ],
        },
        {
          id: 'login-btn',
          type: 'button',
          props: {
            label: 'Sign in',
            action: 'auth:login',
            validates: true,
          },
          style: { width: '100%' },
        },
      ],
    },
  ],
};

// ─── Register schema ──────────────────────────────────────────────────────────

const registerSchema: PageNode = {
  id: 'root',
  type: 'page',
  style: { align: 'center', padding: '48px' },
  children: [
    {
      id: 'card',
      type: 'card',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', props: { text: 'Create account', level: 1 } },
        { id: 'sub', type: 'paragraph', props: { text: 'Fill in your details to get started.' } },
        { id: 'div1', type: 'divider', props: {} },
        {
          id: 'name-row',
          type: 'stack',
          props: { direction: 'row' },
          style: { gap: '12px' },
          children: [
            {
              id: 'firstName',
              type: 'text-input',
              name: 'firstName',
              props: {
                label: 'First name',
                placeholder: 'Jane',
              },
              validation: { required: true },
            },
            {
              id: 'lastName',
              type: 'text-input',
              name: 'lastName',
              props: {
                label: 'Last name',
                placeholder: 'Doe',
              },
              validation: { required: true },
            },
          ],
        },
        {
          id: 'email',
          type: 'text-input',
          name: 'email',
          props: {
            label: 'Email',
            inputType: 'email',
            placeholder: 'you@example.com',
          },
          validation: { required: true },
        },
        {
          id: 'password',
          type: 'text-input',
          name: 'password',
          props: {
            label: 'Password',
            inputType: 'password',
            placeholder: 'Min. 8 characters',
          },
          validation: { required: true, minLength: 8 },
        },
        {
          id: 'confirmPassword',
          type: 'text-input',
          name: 'confirmPassword',
          props: {
            label: 'Confirm password',
            inputType: 'password',
          },
          validation: {
            required: true,
            matchField: 'password',
            message: 'Passwords do not match',
          },
        },
        {
          id: 'terms',
          type: 'checkbox',
          name: 'acceptTerms',
          props: { label: 'I accept the terms and conditions' },
          validation: { required: true },
        },
        {
          id: 'register-btn',
          type: 'button',
          props: {
            label: 'Create account',
            action: 'auth:register',
            validates: true,
          },
          style: { width: '100%' },
        },
        {
          id: 'login-link-row',
          type: 'stack',
          props: { direction: 'row' },
          style: { gap: '4px', align: 'center' },
          children: [
            { id: 'login-hint', type: 'paragraph', props: { text: 'Already have an account?' } },
            { id: 'login-link', type: 'link', props: { label: 'Sign in', action: 'nav:login' } },
          ],
        },
      ],
    },
  ],
};

// ─── Builder schema ───────────────────────────────────────────────────────────

/**
 * IDP-style allowlist: a tenant-facing login customizer would set this to lock
 * down what a tenant can drop on the canvas. The renderer enforces it as a
 * security boundary — any disallowed node in hand-written JSON is skipped.
 */
/**
 * In-memory asset registry — a real IDP would back this with its CDN. The
 * page-builder library no longer ships an asset picker; the consumer builds
 * one (see `PlaygroundAssetPicker.vue`) and wires it via `config.pickAsset`.
 */
const memoryAssets = ref<AssetItem[]>([
  {
    id: 'asset-logo-cocoar',
    name: 'cocoar-logo.svg',
    alt: 'COCOAR logo',
    url:
      'data:image/svg+xml;utf8,'
      + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">`
        + `<rect width="200" height="80" rx="8" fill="#1666cc"/>`
        + `<text x="100" y="50" font-size="22" font-family="sans-serif" font-weight="700" `
        + `fill="white" text-anchor="middle">COCOAR</text></svg>`,
      ),
  },
  {
    id: 'asset-banner-blue',
    name: 'banner-blue.svg',
    alt: 'Blue banner',
    url:
      'data:image/svg+xml;utf8,'
      + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">`
        + `<rect width="400" height="120" fill="#0ea5e9"/>`
        + `<text x="200" y="70" font-size="28" font-family="sans-serif" font-weight="700" `
        + `fill="white" text-anchor="middle">Welcome</text></svg>`,
      ),
  },
]);

const dialog = useDialog();

const idpLoginConfig: PageConfig = {
  // A consumer-registered element (defined entirely in this app) — appears in
  // the palette, canvas, inspector, preview and value model like a built-in.
  elements: { 'acme-rating': ratingElement },
  // section + spacer stay excluded on purpose, so the allowlist gating
  // (hidden palette entries, blocked-node banners) remains visible in the demo.
  allowedElements: [
    'stack',
    'card',
    'heading',
    'paragraph',
    'note',
    'divider',
    'text-input',
    'number-input',
    'checkbox',
    'switch',
    'radio-group',
    'select',
    'multi-select',
    'otp-input',
    'date-input',
    'datetime-input',
    'button',
    'link',
    'image',
    'acme-rating',
  ],
  availableActions: [
    { id: 'auth:login',           label: 'Sign in' },
    { id: 'auth:register',        label: 'Create account' },
    { id: 'auth:forgot-password', label: 'Forgot password' },
    { id: 'auth:sso-google',      label: 'Sign in with Google' },
    { id: 'auth:sso-microsoft',   label: 'Sign in with Microsoft' },
    { id: 'nav:login',            label: 'Go to login' },
    { id: 'nav:register',         label: 'Go to register' },
  ],
  // Same `assetResolver` shape as the renderer's :asset-resolver prop — used
  // by the builder for thumbnails and the Preview-tab renderer.
  assetResolver: (id: string) => memoryAssets.value.find((a) => a.id === id)?.url ?? '',
  // Opens our own asset picker (built externally, in the playground); returns
  // the chosen asset's id or null on cancel.
  async pickAsset(currentId?: string) {
    const { result } = dialog.open<string>(
      PlaygroundAssetPicker,
      { title: 'Choose image', size: 'l' },
      { assets: memoryAssets, currentId },
    );
    const picked = await result;
    return picked ?? null;
  },
};

const builderSchema = ref<PageNode>({
  id: 'root',
  type: 'page',
  style: { gap: '16px', padding: '24px' },
  children: [],
});

const initialBuilderSchema = JSON.stringify(builderSchema.value);

const copyState = ref<'idle' | 'copied'>('idle');

async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(builderSchema.value, null, 2));
  copyState.value = 'copied';
  setTimeout(() => (copyState.value = 'idle'), 1200);
}

function resetBuilder() {
  builderSchema.value = JSON.parse(initialBuilderSchema);
}

// ─── Feedback schema (exercises the consumer-registered rating element) ──────

const feedbackSchema: PageNode = {
  id: 'root',
  type: 'page',
  style: { align: 'center', padding: '48px' },
  children: [
    {
      id: 'card',
      type: 'card',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', props: { text: 'How did we do?', level: 2 } },
        {
          id: 'rating',
          type: 'acme-rating',
          name: 'rating',
          props: { label: 'Your rating', max: 5 },
          validation: { required: true },
        },
        {
          id: 'comment',
          type: 'text-input',
          name: 'comment',
          props: { label: 'Comment', rows: 3, placeholder: 'Tell us more (optional)' },
        },
        {
          id: 'submit',
          type: 'button',
          props: { label: 'Send feedback', action: 'feedback:submit', validates: true },
          style: { width: '100%' },
        },
      ],
    },
  ],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const loginPayload = ref<ActionValues | null>(null);
const registerPayload = ref<ActionValues | null>(null);
const feedbackPayload = ref<ActionValues | null>(null);

const feedbackActions: Record<string, (v: ActionValues) => void> = {
  'feedback:submit': (v) => { feedbackPayload.value = v; },
};

const loginActions: Record<string, (v: ActionValues) => void> = {
  'auth:login': (v) => { loginPayload.value = v; },
  'auth:forgot': () => { alert('Forgot password flow'); },
};

const registerActions: Record<string, (v: ActionValues) => void> = {
  'auth:register': (v) => { registerPayload.value = v; },
  'nav:login': () => { alert('Navigate to login'); },
};
</script>

<template>
  <div class="pb-view">
    <!-- ── Page header ── -->
    <header class="pb-view__header">
      <div>
        <h1>Page Builder</h1>
        <p>Edit the tree on the left, preview in the middle, tune node properties on the right.</p>
      </div>
      <div class="pb-view__header-actions">
        <CoarButton variant="secondary" @click="resetBuilder">
          <CoarIcon name="refresh-cw" size="s" />
          Reset
        </CoarButton>
        <CoarButton variant="primary" @click="copyJson">
          <CoarIcon :name="copyState === 'copied' ? 'check' : 'copy'" size="s" />
          {{ copyState === 'copied' ? 'Copied!' : 'Copy JSON' }}
        </CoarButton>
      </div>
    </header>

    <!-- ── Builder (fills remaining height) ── -->
    <CoarPageBuilder v-model="builderSchema" :config="idpLoginConfig" />

    <!-- ── Renderer demos ── -->
    <section class="pb-view__section">
      <h2>Renderer demos</h2>

    <div class="pb-view__demos">
      <!-- Login -->
      <div class="pb-view__demo">
        <div class="pb-view__demo-title">Login</div>
        <div class="pb-view__canvas">
          <CoarPageRenderer :schema="loginSchema" :actions="loginActions" />
        </div>
        <div class="pb-view__result-label">ACTION PAYLOAD</div>
        <pre v-if="loginPayload" class="pb-view__json">{{ JSON.stringify(loginPayload, null, 2) }}</pre>
        <div v-else class="pb-view__placeholder">Fill in the form and click Sign in</div>
        <details class="pb-view__schema-details">
          <summary class="pb-view__result-label">SCHEMA JSON</summary>
          <pre class="pb-view__json pb-view__json--schema">{{ JSON.stringify(loginSchema, null, 2) }}</pre>
        </details>
      </div>

      <!-- Register -->
      <div class="pb-view__demo">
        <div class="pb-view__demo-title">Register</div>
        <div class="pb-view__canvas">
          <CoarPageRenderer
            :schema="registerSchema"
            :actions="registerActions"
            />
        </div>
        <div class="pb-view__result-label">ACTION PAYLOAD</div>
        <pre v-if="registerPayload" class="pb-view__json">{{ JSON.stringify(registerPayload, null, 2) }}</pre>
        <div v-else class="pb-view__placeholder">
          Button disabled until all fields valid + passwords match
        </div>
        <details class="pb-view__schema-details">
          <summary class="pb-view__result-label">SCHEMA JSON</summary>
          <pre class="pb-view__json pb-view__json--schema">{{ JSON.stringify(registerSchema, null, 2) }}</pre>
        </details>
      </div>

      <!-- Feedback (consumer-registered rating element) -->
      <div class="pb-view__demo">
        <div class="pb-view__demo-title">Feedback (custom element)</div>
        <div class="pb-view__canvas">
          <CoarPageRenderer
            :schema="feedbackSchema"
            :actions="feedbackActions"
            :config="{ elements: { 'acme-rating': ratingElement } }"
          />
        </div>
        <div class="pb-view__result-label">ACTION PAYLOAD</div>
        <pre v-if="feedbackPayload" class="pb-view__json">{{ JSON.stringify(feedbackPayload, null, 2) }}</pre>
        <div v-else class="pb-view__placeholder">Rating is required — submit reveals the error until a star is set</div>
        <details class="pb-view__schema-details">
          <summary class="pb-view__result-label">SCHEMA JSON</summary>
          <pre class="pb-view__json pb-view__json--schema">{{ JSON.stringify(feedbackSchema, null, 2) }}</pre>
        </details>
      </div>
    </div>
    </section>
  </div>
</template>

<style scoped>
.pb-view {
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Builder: flexible height, min 600px so it's usable */
.pb-view > :nth-child(2) {
  min-height: 600px;
  height: clamp(600px, 75vh, 900px);
}

.pb-view__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.pb-view__header h1 {
  margin: 0 0 4px;
}

.pb-view__header p {
  margin: 0;
  color: var(--coar-text-neutral-secondary, #666);
}

.pb-view__header-actions {
  display: flex;
  gap: 8px;
}

.pb-view__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
  padding-top: 16px;
}

.pb-view__section h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #222);
  margin: 0;
}

.pb-view__demos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

.pb-view__demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pb-view__demo-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--coar-text-neutral-secondary, #888);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.pb-view__canvas {
  border: 1px solid var(--coar-border-neutral, #e0e0e0);
  border-radius: 8px;
  padding: 24px;
  background: var(--coar-surface-subtle, #f9f9f9);
}

.pb-view__result-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--coar-text-neutral-secondary, #888);
  letter-spacing: 0.05em;
}

.pb-view__json {
  margin: 0;
  padding: 16px;
  background: var(--coar-surface-subtle, #f5f5f5);
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-view__placeholder {
  padding: 12px 16px;
  color: var(--coar-text-neutral-secondary, #999);
  font-size: 13px;
  font-style: italic;
  border: 1px dashed var(--coar-border-neutral, #ddd);
  border-radius: 8px;
}

.pb-view__schema-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pb-view__schema-details summary {
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pb-view__schema-details summary::before {
  content: '▶ ';
  font-size: 9px;
  vertical-align: middle;
}

.pb-view__schema-details[open] summary::before {
  content: '▼ ';
}

.pb-view__json--schema {
  max-height: 400px;
  overflow-y: auto;
}
</style>
