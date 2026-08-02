<script setup lang="ts">
import { computed, provide, reactive, ref, watch } from 'vue';
import { CoarButton, CoarNotice } from '@cocoar/vue-ui';
import {
  CoarPageBuilder,
  CoarPageRenderer,
  type ActionHandler,
  type ActionValues,
  type PageNode,
} from '@cocoar/vue-page-builder';
import AuthReferenceSurface from './auth-customization/AuthReferenceSurface.vue';
import {
  AUTH_LAB_COPY,
  createAuthLabConfig,
  createAuthLabSchema,
  type AuthLabLocale,
  type AuthLabSlot,
} from './auth-customization/authLabSchemas';
import { AUTH_LAB_RUNTIME_KEY, type AuthLabProvider } from './auth-customization/authLabRuntime';
import { postAuthLab } from './auth-customization/authLabClient';

type LabMode = 'compare' | 'renderer' | 'builder' | 'json' | 'requirements';
type ViewportId = 'compact' | 'phone' | 'tablet' | 'desktop' | 'fluid';

const slots: { id: AuthLabSlot; label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'password-forgot', label: 'Forgot password' },
  { id: 'logout', label: 'Logout' },
];

const modes: { id: LabMode; label: string }[] = [
  { id: 'compare', label: 'Reference ↔ Renderer' },
  { id: 'renderer', label: 'Renderer' },
  { id: 'builder', label: 'Builder' },
  { id: 'json', label: 'JSON' },
  { id: 'requirements', label: 'Use cases & gaps' },
];

const viewports: Record<ViewportId, { label: string; width?: number; height: number }> = {
  compact: { label: 'Compact · 320×568', width: 320, height: 568 },
  phone: { label: 'Phone · 390×844', width: 390, height: 844 },
  tablet: { label: 'Tablet · 768×1024', width: 768, height: 1024 },
  desktop: { label: 'Desktop · 1280×800', width: 1280, height: 800 },
  fluid: { label: 'Fluid container', height: 720 },
};

const slot = ref<AuthLabSlot>('login');
const mode = ref<LabMode>('compare');
const viewport = ref<ViewportId>('phone');
const locale = ref<AuthLabLocale>('de');
const productName = ref('Modgud');
const accent = ref('#1666cc');
const showLegal = ref(true);
const internalLogin = ref(true);
const passwordless = ref(false);
const magicLink = ref(true);
const registration = ref(true);
const providerCount = ref(2);
const rendererResult = ref('');

const providers = computed<AuthLabProvider[]>(() =>
  [
    { id: 'entra', name: 'Microsoft Entra ID', color: '#2563eb' },
    { id: 'github', name: 'GitHub', color: '#24292f' },
    { id: 'partner', name: 'Partner SSO with a deliberately long provider name', color: '#7c3aed' },
  ].slice(0, providerCount.value),
);

provide(AUTH_LAB_RUNTIME_KEY, { productName, showLegal, providers });

const schemas = reactive<Record<AuthLabLocale, Record<AuthLabSlot, PageNode>>>({
  de: {
    login: createAuthLabSchema('login', 'de'),
    'password-forgot': createAuthLabSchema('password-forgot', 'de'),
    logout: createAuthLabSchema('logout', 'de'),
  },
  en: {
    login: createAuthLabSchema('login', 'en'),
    'password-forgot': createAuthLabSchema('password-forgot', 'en'),
    logout: createAuthLabSchema('logout', 'en'),
  },
});

const schema = computed<PageNode>({
  get: () => schemas[locale.value][slot.value],
  set: (value) => {
    schemas[locale.value][slot.value] = value;
  },
});
const pageConfig = computed(() => createAuthLabConfig(slot.value, locale.value));
const copy = computed(() => AUTH_LAB_COPY[locale.value]);

watch([slot, locale], () => {
  rendererResult.value = '';
});

const rendererActions: Record<string, ActionHandler> = {
  'auth:login': async (values: ActionValues) => {
    rendererResult.value = '';
    const response = await postAuthLab('login', values);
    rendererResult.value = response.message;
  },
  'auth:send-reset-link': async (values: ActionValues) => {
    rendererResult.value = '';
    const response = await postAuthLab('forgot-password', values);
    rendererResult.value = response.message;
  },
  'auth:passkey': () => {
    rendererResult.value = `${copy.value.passkey} (demo navigation suppressed).`;
  },
  'auth:magic-link': () => {
    rendererResult.value = `${copy.value.magic} (demo navigation suppressed).`;
  },
  'auth:forgot-password': () => {
    rendererResult.value = `${copy.value.forgot} (demo navigation suppressed).`;
  },
  'auth:register': () => {
    rendererResult.value = `${copy.value.register} (demo navigation suppressed).`;
  },
  'auth:back-to-login': () => {
    rendererResult.value = `${copy.value.back} (demo navigation suppressed).`;
  },
};

const frameStyle = computed(() => ({
  width: viewports[viewport.value].width ? `${viewports[viewport.value].width}px` : '100%',
  height: `${viewports[viewport.value].height}px`,
  '--auth-lab-accent': accent.value,
  '--coar-background-accent-primary': accent.value,
  '--coar-border-accent': accent.value,
  '--coar-text-accent-primary': accent.value,
}));

const frameClass = computed(() => ({ 'device-frame--fluid': viewport.value === 'fluid' }));

function resetCurrentSchema() {
  schemas[locale.value][slot.value] = createAuthLabSchema(slot.value, locale.value);
  rendererResult.value = '';
}

async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(schema.value, null, 2));
  rendererResult.value = 'JSON copied to clipboard.';
}

const requirements = [
  {
    area: 'JSON tree, actions and form values',
    state: 'works',
    detail:
      'Fields, validation, async actions and Enter-to-submit already form a useful secure base.',
  },
  {
    area: 'Request failure without navigation',
    state: 'works',
    detail:
      'Rejected actions remain in the renderer and preserve its value model. Test with invalid, locked or server-error.',
  },
  {
    area: 'Timeout and broken connection',
    state: 'works',
    detail:
      'The host can abort Fetch and return a user-facing Error; the renderer stays mounted and keeps values.',
  },
  {
    area: 'Schema-positioned form feedback',
    state: 'missing',
    detail:
      'Action errors currently render above the root document. Auth parity needs an error node or an explicit in-form feedback slot for errors and success states.',
  },
  {
    area: 'Fixed min/max widths',
    state: 'workaround',
    detail:
      'CSS min() can be typed into Width, but min-width/max-width are not first-class style controls.',
  },
  {
    area: 'Responsive overrides',
    state: 'missing',
    detail:
      'No per-breakpoint styles, visibility or stack direction; the compact 320 px case needs explicit authoring support.',
  },
  {
    area: 'Viewport preview in Builder',
    state: 'missing',
    detail:
      'Authors need phone/tablet/desktop presets inside the Builder, not only an external lab frame.',
  },
  {
    area: 'Page/card/text/button colours',
    state: 'missing',
    detail:
      'NodeStyle currently exposes layout only. Background, foreground, accent and token-aware colour controls are required.',
  },
  {
    area: 'Typography',
    state: 'missing',
    detail: 'Font size, weight, alignment, line height and responsive type scale are not editable.',
  },
  {
    area: 'Elevated card parity',
    state: 'missing',
    detail: 'CoarCard supports elevation, but the PageBuilder card schema does not expose it.',
  },
  {
    area: 'Runtime capability conditions',
    state: 'missing',
    detail:
      'visibleWhen only reads page fields. Auth pages also need safe host context such as passwordless, magic-link and registration availability.',
  },
  {
    area: 'Repeating login providers',
    state: 'host-seam',
    detail:
      'Dynamic provider lists belong in a registered consumer element; their placement still belongs to the page schema.',
  },
  {
    area: 'Runtime branding and legal links',
    state: 'host-seam',
    detail:
      'Product name, logo and legal URLs come from realm/app metadata and are rendered by a registered consumer element.',
  },
  {
    area: 'Multilingual defaults and overrides',
    state: 'missing',
    detail:
      'The lab keeps separate DE/EN JSON because built-in text props do not yet support localized values.',
  },
  {
    area: 'Multi-state pages',
    state: 'missing',
    detail:
      'Forgot success/passwordless and Login passwordless/MFA need variants or host-state conditions without leaving the page slot.',
  },
  {
    area: 'Safe fallback',
    state: 'works',
    detail:
      'Allowed-element enforcement, normalization and the fixed reference give the IDP an emergency fallback contract.',
  },
] as const;
</script>

<template>
  <div class="auth-lab">
    <header class="lab-heading">
      <h1>Auth Customization Lab</h1>
      <p>
        Executable hand-off for PageBuilder parity: fixed Modgud reference, JSON renderer, visual
        builder, responsive fixtures and deterministic Node API failures.
      </p>
    </header>

    <section class="lab-toolbar" aria-label="Lab controls">
      <div class="control-group">
        <strong>Page slot</strong>
        <div class="button-row">
          <button
            v-for="item in slots"
            :key="item.id"
            :class="{ active: slot === item.id }"
            @click="slot = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="control-group">
        <strong>View</strong>
        <div class="button-row">
          <button
            v-for="item in modes"
            :key="item.id"
            :class="{ active: mode === item.id }"
            @click="mode = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <label class="field-control">
        <strong>Viewport</strong>
        <select v-model="viewport">
          <option v-for="(item, id) in viewports" :key="id" :value="id">{{ item.label }}</option>
        </select>
      </label>
      <label class="field-control">
        <strong>Language</strong>
        <select v-model="locale">
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <label class="field-control field-control--grow">
        <strong>Runtime product name</strong>
        <input v-model="productName" type="text" />
      </label>
      <label class="field-control field-control--color">
        <strong>Runtime accent</strong>
        <input v-model="accent" type="color" />
        <code>{{ accent }}</code>
      </label>
    </section>

    <section class="scenario-toolbar" aria-label="Host runtime scenarios">
      <strong>Host context</strong>
      <label><input v-model="showLegal" type="checkbox" /> Legal links</label>
      <label><input v-model="internalLogin" type="checkbox" /> Internal login</label>
      <label><input v-model="passwordless" type="checkbox" /> Passwordless</label>
      <label><input v-model="magicLink" type="checkbox" /> Magic link</label>
      <label><input v-model="registration" type="checkbox" /> Registration</label>
      <label>
        Providers
        <select v-model.number="providerCount">
          <option :value="0">0</option>
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3 + long label</option>
        </select>
      </label>
      <span class="scenario-note"
        >Reference reacts to every flag. Renderer differences expose missing host-context
        conditions.</span
      >
    </section>

    <CoarNotice v-if="slot !== 'logout'" variant="info" class="edge-cases">
      <strong>Node API edge-case usernames:</strong>
      <code>invalid</code> → validation response, <code>locked</code> → account locked,
      <code>server-error</code> → HTTP 500, <code>slow</code> → client timeout/abort,
      <code>disconnect</code> → broken connection, <code>mfa</code> → successful MFA continuation.
      Any other username succeeds. For Login, enter any non-empty password.
    </CoarNotice>

    <div v-if="mode === 'compare'" class="comparison-stage">
      <article>
        <header>
          <strong>Fixed Modgud reference</strong><span>Expected behaviour and layout</span>
        </header>
        <div class="device-frame" :class="frameClass" :style="frameStyle">
          <AuthReferenceSurface
            :slot="slot"
            :locale="locale"
            :product-name="productName"
            :show-legal="showLegal"
            :internal-login="internalLogin"
            :passwordless="passwordless"
            :magic-link="magicLink"
            :registration="registration"
            :providers="providers"
          />
        </div>
      </article>
      <article>
        <header>
          <strong>Current JSON renderer</strong
          ><span>Differences are requirements, not hidden demo CSS</span>
        </header>
        <div class="device-frame renderer-frame" :class="frameClass" :style="frameStyle">
          <CoarPageRenderer :schema="schema" :config="pageConfig" :actions="rendererActions" />
        </div>
      </article>
    </div>

    <div v-else-if="mode === 'renderer'" class="single-stage">
      <div class="device-frame renderer-frame" :class="frameClass" :style="frameStyle">
        <CoarPageRenderer :schema="schema" :config="pageConfig" :actions="rendererActions" />
      </div>
    </div>

    <section v-else-if="mode === 'builder'" class="builder-stage">
      <div class="builder-actions">
        <p>
          Edit the same JSON rendered above. Switch to Renderer or Compare to validate the result.
        </p>
        <CoarButton variant="secondary" @click="resetCurrentSchema"
          >Reset {{ slot }} / {{ locale.toUpperCase() }}</CoarButton
        >
      </div>
      <CoarPageBuilder v-model="schema" :config="pageConfig" class="builder" />
    </section>

    <section v-else-if="mode === 'json'" class="json-stage">
      <div class="builder-actions">
        <p>
          This is the actual persisted PageNode document for the selected slot and language fixture.
        </p>
        <div class="button-row">
          <CoarButton variant="secondary" @click="copyJson">Copy JSON</CoarButton>
          <CoarButton variant="secondary" @click="resetCurrentSchema">Reset</CoarButton>
        </div>
      </div>
      <pre><code>{{ JSON.stringify(schema, null, 2) }}</code></pre>
    </section>

    <section v-else class="requirements-stage">
      <header>
        <h2>PageBuilder hand-off matrix</h2>
        <p>
          “Works” is already covered by the package. “Missing” is a package use case. “Host seam”
          intentionally remains consumer-owned.
        </p>
      </header>
      <div class="requirements-table" role="table">
        <div class="requirements-row requirements-row--head" role="row">
          <strong>Capability</strong><strong>Status</strong><strong>Executable requirement</strong>
        </div>
        <div v-for="item in requirements" :key="item.area" class="requirements-row" role="row">
          <strong>{{ item.area }}</strong>
          <span class="status" :class="`status--${item.state}`">{{ item.state }}</span>
          <span>{{ item.detail }}</span>
        </div>
      </div>
    </section>

    <CoarNotice v-if="rendererResult" variant="success" class="renderer-result">
      <strong>Renderer action:</strong> {{ rendererResult }}
    </CoarNotice>
  </div>
</template>

<style scoped>
.auth-lab {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.lab-heading h1 {
  margin: 0;
  font-size: 1.7rem;
}
.lab-heading p {
  margin: 0.25rem 0 0;
  color: var(--coar-text-neutral-secondary, #5f6470);
}

.lab-toolbar,
.scenario-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem 1rem;
  padding: 1rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.75rem;
  background: var(--coar-surface-default, white);
}

.control-group,
.field-control {
  display: grid;
  gap: 0.35rem;
}

.control-group strong,
.field-control strong,
.scenario-toolbar > strong {
  color: var(--coar-text-neutral-secondary, #5f6470);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.button-row > button,
.field-control input,
.field-control select,
.scenario-toolbar select {
  min-height: 2rem;
  border: 1px solid var(--coar-border-neutral, #d6d8df);
  border-radius: 0.45rem;
  background: var(--coar-surface-default, white);
  color: var(--coar-text-neutral-primary, #20242d);
  font: inherit;
}

.button-row > button {
  padding: 0.3rem 0.65rem;
  cursor: pointer;
}

.button-row > button.active {
  border-color: var(--coar-border-accent, #1666cc);
  background: var(--coar-surface-accent-subtle, #eaf2ff);
  color: var(--coar-text-accent-primary, #1666cc);
  font-weight: 600;
}

.field-control input,
.field-control select,
.scenario-toolbar select {
  padding: 0.25rem 0.5rem;
}

.field-control--grow {
  min-width: min(16rem, 100%);
  flex: 1;
}
.field-control--color {
  grid-template-columns: auto auto;
}
.field-control--color strong {
  grid-column: 1 / -1;
}
.field-control--color input {
  width: 3rem;
  padding: 0.1rem;
}

.scenario-toolbar {
  align-items: center;
  font-size: 0.82rem;
}
.scenario-toolbar label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.scenario-note {
  flex: 1 1 22rem;
  color: var(--coar-text-neutral-tertiary, #777b86);
}

.edge-cases code {
  margin-inline: 0.2rem;
}

.comparison-stage {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 1rem;
  padding-bottom: 1rem;
  overflow: auto;
}

.comparison-stage article,
.single-stage,
.builder-stage,
.json-stage,
.requirements-stage {
  min-width: 0;
}

.comparison-stage article > header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.45rem;
  color: var(--coar-text-neutral-secondary, #5f6470);
  font-size: 0.78rem;
}

.comparison-stage article > header span {
  color: var(--coar-text-neutral-tertiary, #828691);
}

.device-frame {
  position: relative;
  flex: none;
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--coar-border-neutral, #d7d9df);
  border-radius: 0.8rem;
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
  box-shadow: 0 8px 26px rgb(31 38 50 / 9%);
}

.device-frame--fluid {
  min-width: min(70rem, calc(100vw - 8rem));
}

.renderer-frame {
  display: block;
}

.renderer-frame :deep(.coar-page-renderer),
.renderer-frame :deep(.pb-page) {
  min-height: 100%;
}

.single-stage {
  display: grid;
  justify-content: center;
  overflow: auto;
}

.builder-stage,
.json-stage,
.requirements-stage {
  padding: 1rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.75rem;
  background: var(--coar-surface-default, white);
}

.builder-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.builder-actions p {
  margin: 0;
  color: var(--coar-text-neutral-secondary, #5f6470);
}
.builder {
  height: 68vh;
  min-height: 36rem;
}

.json-stage pre {
  max-height: 70vh;
  margin: 0;
  padding: 1rem;
  overflow: auto;
  border-radius: 0.5rem;
  background: #151922;
  color: #e6edf7;
  font-size: 0.78rem;
  line-height: 1.55;
}

.requirements-stage > header h2 {
  margin: 0;
}
.requirements-stage > header p {
  color: var(--coar-text-neutral-secondary, #5f6470);
}
.requirements-table {
  display: grid;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.6rem;
  overflow: hidden;
}
.requirements-row {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) 7rem minmax(18rem, 2fr);
  gap: 1rem;
  padding: 0.75rem;
  border-top: 1px solid var(--coar-border-neutral-subtle, #eceef2);
}
.requirements-row--head {
  border-top: 0;
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
}
.status {
  align-self: start;
  justify-self: start;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}
.status--works {
  background: #dcfce7;
  color: #166534;
}
.status--missing {
  background: #fee2e2;
  color: #991b1b;
}
.status--workaround {
  background: #fef3c7;
  color: #92400e;
}
.status--host-seam {
  background: #e0e7ff;
  color: #3730a3;
}
.renderer-result {
  position: sticky;
  bottom: 0.5rem;
  z-index: 5;
}

@media (max-width: 800px) {
  .device-frame--fluid {
    min-width: calc(100vw - 4rem);
  }
  .requirements-row {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }
  .requirements-row--head {
    display: none;
  }
  .builder-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
