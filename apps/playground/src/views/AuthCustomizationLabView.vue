<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { CoarButton, CoarNotice } from '@cocoar/vue-ui';
import {
  CoarPageBuilder,
  CoarPageRenderer,
  usePageCodeRuntime,
  AUTH_PAGE_COPY as AUTH_LAB_COPY,
  createAuthPageConfig as createAuthLabConfig,
  createAuthPageDocument as createAuthLabSchema,
  type ActionHandler,
  type ActionValues,
  type AuthPageLocale as AuthLabLocale,
  type AuthPageSlot as AuthLabSlot,
  type PageNode,
} from '@cocoar/vue-page-builder';
import AuthReferenceSurface from './auth-customization/AuthReferenceSurface.vue';
import ConsentReferenceSurface from './auth-customization/ConsentReferenceSurface.vue';
import type { AuthLabConsentScope, AuthLabProvider } from './auth-customization/authLabRuntime';
import { postAuthLab } from './auth-customization/authLabClient';

type LabMode = 'compare' | 'renderer' | 'builder' | 'json' | 'contract' | 'requirements';
type ViewportId = 'compact' | 'phone' | 'tablet' | 'desktop' | 'fluid';

const slots: { id: AuthLabSlot; label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'password-forgot', label: 'Forgot password' },
  { id: 'logout', label: 'Logout' },
  { id: 'consent', label: 'Consent · scopes[]' },
];

const modes: { id: LabMode; label: string }[] = [
  { id: 'compare', label: 'Reference ↔ Renderer' },
  { id: 'renderer', label: 'Renderer' },
  { id: 'builder', label: 'Builder' },
  { id: 'json', label: 'JSON' },
  { id: 'contract', label: 'View contract' },
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
const scopeCount = ref(3);
const consentScenario = ref('success');
const consentClientName = ref('Northwind Analytics');
const consentClientHostname = ref('analytics.northwind.example');
const dynamicConsentClient = ref(true);
const rendererResult = ref('');
const stateOverride = ref('');

const providers = computed<AuthLabProvider[]>(() =>
  [
    { id: 'entra', name: 'Microsoft Entra ID', color: '#2563eb' },
    { id: 'github', name: 'GitHub', color: '#24292f' },
    { id: 'partner', name: 'Partner SSO with a deliberately long provider name', color: '#7c3aed' },
  ].slice(0, providerCount.value),
);

const consentScopes = computed<AuthLabConsentScope[]>(() =>
  [
    {
      name: 'openid',
      displayName: 'Sign-in identity',
      description: 'Confirms who you are. Required to sign in.',
      required: true,
    },
    {
      name: 'profile',
      displayName: 'Profile',
      description: 'Name, picture and locale.',
      required: false,
    },
    {
      name: 'email',
      displayName: 'Email address',
      description: 'Your email address and whether it is verified.',
      required: false,
    },
    {
      name: 'offline_access',
      displayName: 'Stay signed in',
      description: 'Allows the app to refresh its access without prompting again.',
      required: false,
    },
    {
      name: 'roles',
      displayName: 'Roles',
      description: 'Lets the app see which roles you have in this realm.',
      required: false,
    },
    {
      name: 'permissions',
      displayName: 'Permissions',
      description: 'Lets the app see which fine-grained permissions you have.',
      required: false,
    },
    {
      name: 'invoices.read',
      displayName: 'Read invoices for all assigned organisations',
      description:
        'A deliberately long custom permission to test wrapping and narrow viewport behaviour.',
      required: false,
    },
    {
      name: 'projects.write',
      displayName: 'Create and update projects',
      description: 'Allows this application to change project data on your behalf.',
      required: false,
    },
  ].slice(0, scopeCount.value),
);

const schemas = reactive<Record<AuthLabSlot, PageNode>>({
  login: createAuthLabSchema('login'),
  'password-forgot': createAuthLabSchema('password-forgot'),
  logout: createAuthLabSchema('logout'),
  consent: createAuthLabSchema('consent'),
});

const schema = computed<PageNode>({
  get: () => schemas[slot.value],
  set: (value) => {
    schemas[slot.value] = value;
  },
});
const pageConfig = computed(() => createAuthLabConfig(slot.value, locale.value));
const copy = computed(() => AUTH_LAB_COPY[locale.value]);

watch([slot, locale], () => {
  rendererResult.value = '';
  stateOverride.value = '';
});

const defaultViewState = computed(() => {
  if (slot.value === 'login') return passwordless.value ? 'passwordless' : 'credentials';
  if (slot.value === 'password-forgot') return passwordless.value ? 'passwordless-unavailable' : 'form';
  if (slot.value === 'consent') return 'prompt';
  return 'complete';
});
const viewState = computed(() => stateOverride.value || defaultViewState.value);
const runtimeContext = computed<Record<string, unknown>>(() => ({
  branding: { productName: productName.value, showLegal: showLegal.value },
  auth: {
    internalLoginEnabled: internalLogin.value,
    passwordless: passwordless.value,
    magicLinkEnabled: magicLink.value,
    registrationEnabled: registration.value,
    externalProviders: providers.value,
  },
  consent: {
    clientName: consentClientName.value,
    clientHostname: consentClientHostname.value,
    isDynamicallyRegistered: dynamicConsentClient.value,
    requestedScopes: consentScopes.value,
  },
  feedback: { message: rendererResult.value, success: rendererResult.value.length > 0 },
  runtime: { viewState: viewState.value },
}));
const fallbackSchema = computed(() => createAuthLabSchema(slot.value));

const runtimeViewport = computed(() => {
  const width = viewports[viewport.value].width ?? 1280;
  const breakpoint = width <= 359
    ? 'compact'
    : width <= 599
      ? 'phone'
      : width <= 899
        ? 'tablet'
        : 'desktop';
  return { width, breakpoint };
});

const {
  pageCodeValues,
  onRuntimeChange,
  runPageAction,
} = usePageCodeRuntime({
  pageId: computed(() => `auth-lab:${slot.value}`),
  schema,
  context: runtimeContext,
  viewport: runtimeViewport,
  tenantId: 'auth-lab',
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
    stateOverride.value = 'accepted';
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
  'auth:external-provider': (values: ActionValues) => {
    const provider = providers.value.find((entry) => entry.id === values.providerId);
    rendererResult.value = `${copy.value.externalPrefix} ${provider?.name ?? String(values.providerId ?? '')} (demo navigation suppressed).`;
  },
  'auth:back-to-login': () => {
    rendererResult.value = `${copy.value.back} (demo navigation suppressed).`;
  },
  'auth:consent-deny': async (values: ActionValues) => {
    rendererResult.value = '';
    const response = await postAuthLab('consent', {
      decision: 'deny',
      scenario: consentScenario.value,
      approvedScopes: Array.isArray(values.approvedScopes) ? values.approvedScopes : [],
    });
    rendererResult.value = response.message;
  },
  'auth:consent-allow': async (values: ActionValues) => {
    rendererResult.value = '';
    const response = await postAuthLab('consent', {
      decision: 'allow',
      scenario: consentScenario.value,
      approvedScopes: Array.isArray(values.approvedScopes) ? values.approvedScopes : [],
    });
    rendererResult.value = response.message;
  },
  'legal:terms': () => { rendererResult.value = 'Terms (demo navigation suppressed).'; },
  'legal:privacy': () => { rendererResult.value = 'Privacy (demo navigation suppressed).'; },
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
  schemas[slot.value] = createAuthLabSchema(slot.value);
  rendererResult.value = '';
}

async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(schema.value, null, 2));
  rendererResult.value = 'JSON copied to clipboard.';
}

const viewContracts: Record<
  AuthLabSlot,
  {
    purpose: string;
    runtimeData: string[];
    states: string[];
    actions: string[];
    invariants: string[];
    responsive: string[];
  }
> = {
  login: {
    purpose: 'Authenticate a user and safely resume the originating application flow.',
    runtimeData: [
      'Realm branding, legal URLs and selected language',
      'Internal/passwordless capability flags and remember-me policy',
      'Zero to many external identity providers with runtime labels',
      'Application continuation and self-registration availability',
    ],
    states: [
      'Credentials, passwordless, magic-link sent, submitting and error',
      'MFA continuation after accepted credentials',
      'No internal provider, no external provider and mixed-provider variants',
    ],
    actions: [
      'Password login with Enter-to-submit and duplicate-submit protection',
      'Passkey, magic link, external provider, forgot password and registration',
    ],
    invariants: [
      'A failed or aborted request never navigates and preserves entered values',
      'Password values never enter persisted page JSON, logs or URL parameters',
      'Continuation targets are host-owned and validated; a design cannot define arbitrary redirects',
      'Errors are announced accessibly and focus returns to a useful control',
    ],
    responsive: [
      'Long provider names, translated labels and multiple providers must wrap safely',
      'Keyboard, password-manager/autofill, 200% zoom and 320 px width',
    ],
  },
  'password-forgot': {
    purpose: 'Request a reset message without disclosing whether an account exists.',
    runtimeData: [
      'Realm branding, language, passwordless capability and continuation',
      'Username/email policy and server-side rate-limit result',
    ],
    states: [
      'Form, submitting, generic accepted result, validation/rate-limit error',
      'Passwordless-disabled explanation instead of a dead form',
    ],
    actions: ['Send reset request and return to the preserved login continuation'],
    invariants: [
      'Success copy is account-enumeration safe and identical for existing/non-existing users',
      'Timeout and server failure keep the identifier for a retry',
      'Reset tokens and destination URLs are generated and validated by the host, never by page JSON',
    ],
    responsive: [
      'Long generic success/error text must wrap without moving actions off-screen',
      'Works with mobile keyboards, 200% zoom and 320 px width',
    ],
  },
  logout: {
    purpose: 'Confirm the local session ended and offer a safe next step.',
    runtimeData: [
      'Realm branding and language',
      'Local versus federated logout result and validated post-logout destination',
    ],
    states: ['Local logout complete, federated logout complete and recoverable provider failure'],
    actions: ['Sign in again or continue to a host-approved application destination'],
    invariants: [
      'The session is invalidated before the confirmation is rendered',
      'The PageBuilder cannot inject an arbitrary post-logout redirect',
      'Browser back must not restore authenticated content from cache',
    ],
    responsive: ['Short page must remain vertically balanced without hiding the primary action'],
  },
  consent: {
    purpose:
      'Let an authenticated user make an informed, ticket-bound OAuth authorization decision.',
    runtimeData: [
      'Trusted ticket, client id/name, expiry and zero-to-many RequestedScopes[]',
      'Per-scope stable name, localized label, description and required flag',
      'Dynamic/unverified-client flag and verified client-id hostname',
    ],
    states: [
      'Loading, prompt, submitting, denied, expired/consumed ticket, forbidden and connection error',
      'One required scope, typical list and long overflowing list',
    ],
    actions: [
      'Allow submits selected ApprovedScopes[]; Deny submits an empty list',
      'Expired tickets may expose only a host-validated authorization retry action',
    ],
    invariants: [
      'Required scopes are selected and cannot be unchecked',
      'Scope names and ticket are immutable runtime values, never editable design props',
      'The host revalidates ticket ownership, expiry and approved scopes on submit',
      'RedirectUrl stays host-owned and same-origin; page JSON cannot choose the OAuth destination',
      'Unverified/DCR/CIMD identity warnings cannot be removed or visually de-emphasised by customization',
      'A failed submit keeps the exact scope selection and does not consume or leave the prompt',
    ],
    responsive: [
      'Unknown scope count, long localized descriptions and long custom scope names',
      'Actions remain reachable with 8+ scopes, 320 px width, 200% zoom and keyboard navigation',
    ],
  },
};

const viewContract = computed(() => viewContracts[slot.value]);

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
    state: 'works',
    detail:
      'Generic feedback nodes place action errors, loading, success and host messages inside the authored tree with live-region semantics.',
  },
  {
    area: 'Fixed min/max widths',
    state: 'works',
    detail:
      'Width, min-width, max-width, height and min-height are first-class responsive style controls.',
  },
  {
    area: 'Responsive overrides',
    state: 'works',
    detail:
      'Compact/base, phone, tablet and desktop share a mobile-first cascade with per-property reset.',
  },
  {
    area: 'Viewport preview in Builder',
    state: 'works',
    detail:
      'Compact, phone, tablet, desktop and fluid presets run through the same renderer cascade.',
  },
  {
    area: 'Page/card/text/button colours',
    state: 'works',
    detail:
      'Surface, foreground, semantic border, radius and elevation use controlled design tokens.',
  },
  {
    area: 'Typography',
    state: 'works',
    detail: 'Font family, size, weight, alignment, line height and letter spacing are token-controlled and responsive.',
  },
  {
    area: 'Elevated card parity',
    state: 'works',
    detail: 'Elevation is a controlled NodeStyle token and works on cards and other nodes.',
  },
  {
    area: 'Runtime capability conditions',
    state: 'works',
    detail:
      'Conditions support typed form, allowlisted context, host state and repeat-item sources without expressions.',
  },
  {
    area: 'Dynamic arrays / repeaters',
    state: 'works',
    detail:
      'The native repeat template supports allowlisted arrays, stable keys, item bindings, caps, empty text and a freely named selected-key array output.',
  },
  {
    area: 'Repeating login providers',
    state: 'works',
    detail:
      'Dynamic provider lists now use the same native repeat template as other host arrays; the fixed action id receives a host-owned provider id.',
  },
  {
    area: 'Runtime branding and legal links',
    state: 'works',
    detail:
      'Branding and legal affordances are normal nodes bound to allowlisted metadata and fixed host actions.',
  },
  {
    area: 'Multilingual defaults and overrides',
    state: 'works',
    detail:
      'DE and EN use one structure tree with localized props, typed placeholders and deterministic fallback.',
  },
  {
    area: 'Multi-state pages',
    state: 'works',
    detail:
      'Host-controlled state conditions keep accepted, passwordless and error variants inside one page document.',
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
      <template v-if="slot !== 'consent'">
        <label><input v-model="internalLogin" type="checkbox" /> Internal login</label>
        <label><input v-model="passwordless" type="checkbox" /> Passwordless</label>
        <label><input v-model="magicLink" type="checkbox" /> Magic link</label>
        <label><input v-model="registration" type="checkbox" /> Registration</label>
      </template>
      <label v-if="slot !== 'consent'">
        Providers
        <select v-model.number="providerCount">
          <option :value="0">0</option>
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3 + long label</option>
        </select>
      </label>
      <template v-else>
        <label>
          Scopes[]
          <select v-model.number="scopeCount" aria-label="Consent scope count">
            <option :value="1">1 · required only</option>
            <option :value="3">3 · typical</option>
            <option :value="8">8 · overflow + long copy</option>
          </select>
        </label>
        <label>
          API result
          <select v-model="consentScenario" aria-label="Consent API result">
            <option value="success">Success</option>
            <option value="expired">Expired ticket · 409</option>
            <option value="server-error">Server error · 500</option>
            <option value="slow">Timeout / abort</option>
            <option value="disconnect">Broken connection</option>
          </select>
        </label>
        <label><input v-model="dynamicConsentClient" type="checkbox" /> Unverified client</label>
        <label class="field-control field-control--grow">
          Client name
          <input v-model="consentClientName" type="text" />
        </label>
      </template>
      <label>
        View state
        <select v-model="stateOverride" aria-label="Host view state">
          <option value="">Automatic · {{ defaultViewState }}</option>
          <option v-for="state in pageConfig.availableStates" :key="state.id" :value="state.id">{{ state.label }}</option>
        </select>
      </label>
      <span class="scenario-note"
        >Reference and JSON renderer react to the same host context; differences reveal remaining parity work.</span
      >
    </section>

    <CoarNotice v-if="slot === 'consent'" variant="info" class="edge-cases">
      <strong>Array fixture:</strong> switch between <code>1</code>, <code>3</code> and
      <code>8</code> server-provided scopes. The JSON uses the generic native repeater and names
      this document's selected-key output <code>approvedScopes</code>.
    </CoarNotice>
    <CoarNotice v-else-if="slot !== 'logout'" variant="info" class="edge-cases">
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
          <ConsentReferenceSurface
            v-if="slot === 'consent'"
            :locale="locale"
            :product-name="productName"
            :show-legal="showLegal"
            :client-name="consentClientName"
            :client-hostname="consentClientHostname"
            :dynamic-client="dynamicConsentClient"
            :scopes="consentScopes"
            :scenario="consentScenario"
          />
          <AuthReferenceSurface
            v-else
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
          <CoarPageRenderer
            :schema="schema" :fallback-schema="fallbackSchema" :config="pageConfig"
            :actions="rendererActions" :runtime-context="runtimeContext"
            :view-state="viewState" :locale="locale" :viewport-width="viewports[viewport].width"
            :page-code-values="pageCodeValues" :on-action="runPageAction"
            @runtime-change="onRuntimeChange"
          />
        </div>
      </article>
    </div>

    <div v-else-if="mode === 'renderer'" class="single-stage">
      <div class="device-frame renderer-frame" :class="frameClass" :style="frameStyle">
        <CoarPageRenderer
          :schema="schema" :fallback-schema="fallbackSchema" :config="pageConfig"
          :actions="rendererActions" :runtime-context="runtimeContext"
          :view-state="viewState" :locale="locale" :viewport-width="viewports[viewport].width"
          :page-code-values="pageCodeValues" :on-action="runPageAction"
          @runtime-change="onRuntimeChange"
        />
      </div>
    </div>

    <section v-else-if="mode === 'builder'" class="builder-stage">
      <div class="builder-actions">
        <p>
          Edit structure, Quick Properties, Page State and per-element code. The preview executes
          the same browser runtime as the standalone renderer.
        </p>
        <CoarButton variant="secondary" @click="resetCurrentSchema"
          >Reset {{ slot }} / {{ locale.toUpperCase() }}</CoarButton
        >
      </div>
      <CoarPageBuilder
        v-model="schema" :config="pageConfig" class="builder"
        authoring-mode="code"
        :preview-context="runtimeContext" :preview-state="viewState"
        :preview-locale="locale" :preview-actions="rendererActions"
        :preview-fallback-schema="fallbackSchema"
      />
    </section>

    <section v-else-if="mode === 'json'" class="json-stage">
      <div class="builder-actions">
        <p>
          This is the actual persisted PageNode document. DE and EN share this same structure tree.
        </p>
        <div class="button-row">
          <CoarButton variant="secondary" @click="copyJson">Copy JSON</CoarButton>
          <CoarButton variant="secondary" @click="resetCurrentSchema">Reset</CoarButton>
        </div>
      </div>
      <pre><code>{{ JSON.stringify(schema, null, 2) }}</code></pre>
    </section>

    <section v-else-if="mode === 'contract'" class="contract-stage">
      <header>
        <p class="contract-eyebrow">{{ slots.find((item) => item.id === slot)?.label }}</p>
        <h2>View contract</h2>
        <p>{{ viewContract.purpose }}</p>
      </header>
      <div class="contract-grid">
        <article>
          <h3>Runtime data</h3>
          <ul>
            <li v-for="item in viewContract.runtimeData" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article>
          <h3>Required states</h3>
          <ul>
            <li v-for="item in viewContract.states" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article>
          <h3>Actions</h3>
          <ul>
            <li v-for="item in viewContract.actions" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article class="contract-invariants">
          <h3>Non-negotiable security & behaviour</h3>
          <ul>
            <li v-for="item in viewContract.invariants" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article>
          <h3>Responsive & accessibility cases</h3>
          <ul>
            <li v-for="item in viewContract.responsive" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
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
.contract-stage,
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
.contract-stage,
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

.contract-stage > header h2,
.contract-stage > header p,
.contract-grid h3,
.contract-grid ul {
  margin: 0;
}
.contract-stage > header > p:last-child {
  margin-top: 0.35rem;
  color: var(--coar-text-neutral-secondary, #5f6470);
}
.contract-eyebrow {
  color: var(--coar-text-accent-primary, #1666cc);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.contract-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}
.contract-grid article {
  padding: 1rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.6rem;
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
}
.contract-grid h3 {
  font-size: 0.9rem;
}
.contract-grid ul {
  display: grid;
  gap: 0.45rem;
  padding: 0.65rem 0 0 1.1rem;
  color: var(--coar-text-neutral-secondary, #5f6470);
  font-size: 0.82rem;
}
.contract-invariants {
  border-color: #f59e0b !important;
  background: #fffbeb !important;
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
