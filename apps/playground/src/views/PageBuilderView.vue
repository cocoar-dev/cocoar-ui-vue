<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  CoarPageRenderer,
  CoarPageBuilder,
  createPageCodeDrafts,
  normalizePageCodeOutput,
  pageStateRuntimeSource,
  elementComputeRuntimeSource,
  elementActionRuntimeSource,
  elementBindingId,
  elementActionDefinitionId,
  elementClickActionId,
  setElementQuickProperty,
  definePageRuntimeHost,
  type ElementNode,
  type PageNode,
  type ActionHandler,
  type ActionValues,
  type PageCodeRuntimeInput,
  type PageCodeRuntimeValues,
  type PageConfig,
  type PageRuntimeSession,
  type RuntimeDefinition,
  type RuntimeReactiveUpdate,
  type RuntimeStatePatch,
  type RuntimeValue,
} from '@cocoar/vue-page-builder';
import { CoarButton, CoarIcon, useDialog } from '@cocoar/vue-ui';
import PlaygroundAssetPicker, { type AssetItem } from '../components/PlaygroundAssetPicker.vue';
import { ratingElement } from '../components/rating/ratingElement';

// ─── Login schema ─────────────────────────────────────────────────────────────

const loginSchema: PageNode = {
  id: 'root',
  type: 'page',
  // Enter inside any single-line input fires the default button below.
  enterSubmits: true,
  style: { align: 'center', padding: '48px' },
  children: [
    {
      id: 'card',
      type: 'card',
      name: 'loginCard',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', name: 'loginTitle', props: { text: 'Welcome back', level: 1 } },
        { id: 'sub', type: 'paragraph', name: 'loginSubtitle', props: { text: 'Sign in to your account.' } },
        { id: 'div1', type: 'divider', name: 'loginDivider', props: {} },
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
          type: 'password-input',
          name: 'password',
          props: {
            label: 'Password',
          },
          validation: { required: true, minLength: 8 },
        },
        {
          id: 'row-bottom',
          type: 'stack',
          name: 'loginActions',
          props: { direction: 'row' },
          style: { gap: '8px', align: 'center' },
          children: [
            { id: 'remember', type: 'checkbox', name: 'rememberMe', props: { label: 'Remember me' }, defaultValue: false },
            { id: 'spacer', type: 'spacer', name: 'loginSpacer', props: {} },
            { id: 'forgot', type: 'link', name: 'forgotPasswordLink', props: { label: 'Forgot password?', action: 'auth:forgot' } },
          ],
        },
        {
          id: 'login-btn',
          type: 'button',
          name: 'loginButton',
          props: {
            label: 'Sign in',
            action: 'auth:login',
            validates: true,
            default: true,
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
      name: 'registerCard',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', name: 'registerTitle', props: { text: 'Create account', level: 1 } },
        { id: 'sub', type: 'paragraph', name: 'registerSubtitle', props: { text: 'Fill in your details to get started.' } },
        { id: 'div1', type: 'divider', name: 'registerDivider', props: {} },
        {
          id: 'name-row',
          type: 'stack',
          name: 'nameRow',
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
          type: 'password-input',
          name: 'password',
          props: {
            label: 'Password',
            placeholder: 'Min. 8 characters',
          },
          validation: { required: true, minLength: 8 },
        },
        {
          id: 'confirmPassword',
          type: 'password-input',
          name: 'confirmPassword',
          props: {
            label: 'Confirm password',
          },
          validation: {
            required: true,
            matchField: 'password',
            message: 'Passwords do not match',
          },
        },
        {
          id: 'country',
          type: 'select',
          name: 'country',
          // Dynamic list: resolved through config.optionsSource at render time.
          props: { label: 'Country', placeholder: 'Select your country', optionsSourceId: 'countries' },
          validation: { required: true },
        },
        {
          id: 'business',
          type: 'checkbox',
          name: 'isBusiness',
          props: { label: 'This is a business account' },
        },
        {
          id: 'companyName',
          type: 'text-input',
          name: 'companyName',
          props: { label: 'Company name', placeholder: 'ACME Inc.' },
          validation: { required: true },
          // Hidden (and exempt from required + payload) until the checkbox is on.
          visibleWhen: { field: 'isBusiness', equals: true },
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
          name: 'registerButton',
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
          name: 'loginLinkRow',
          props: { direction: 'row' },
          style: { gap: '4px', align: 'center' },
          children: [
            { id: 'login-hint', type: 'paragraph', name: 'loginHint', props: { text: 'Already have an account?' } },
            { id: 'login-link', type: 'link', name: 'loginLink', props: { label: 'Sign in', action: 'nav:login' } },
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
  // The data contract behind the page (the LoginDto, say): the builder's
  // Field section becomes a pick from these — filtered per element to the
  // compatible value types (string → text/password/…, boolean → checkbox/
  // switch, number → number-input AND acme-rating, date → date picker).
  dataContract: [
    { name: 'username',   valueType: 'string',  label: 'Username', required: true },
    { name: 'password',   valueType: 'string',  label: 'Password', required: true, defaultElement: 'password-input' },
    { name: 'rememberMe', valueType: 'boolean', label: 'Remember me' },
    { name: 'age',        valueType: 'number',  label: 'Age' },
    { name: 'dueUntil',   valueType: 'date',    label: 'Due until' },
  ],
  allowCustomFields: true,
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
    'password-input',
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
    'repeat',
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

function withQuickProperties(
  source: string | undefined,
  values: Record<string, unknown>,
): string {
  let result = source;
  for (const [path, value] of Object.entries(values)) {
    result = setElementQuickProperty(result, path, value);
  }
  return result!;
}

const builderSchema = ref<PageNode>({
  id: 'root',
  type: 'page',
  stateCode: `definePageState({
    recentUsers: [
      { id: 'initial', label: 'First runtime item' },
    ],
    nextUserId: 1,
    lastSubmit: null,
})`,
  style: { gap: '16px', padding: '24px' },
  children: [
    {
      id: 'loginCard',
      type: 'card',
      name: 'loginCard',
      props: {},
      style: {},
      elementCode: withQuickProperties(undefined, {
        'style.width': '380px',
        'style.gap': '16px',
      }),
      children: [
        {
          id: 'pageTitle',
          type: 'heading',
          name: 'pageTitle',
          props: { text: '', level: 2 },
          elementCode: withQuickProperties(`defineElement({
  compute(element, page) {
    element.props.level = 2;
  },
})`, { 'props.text': 'Element code + Page State' }),
        },
        {
          id: 'stateSummary',
          type: 'paragraph',
          name: 'stateSummary',
          props: { text: '' },
          elementCode: `defineElement({
  compute(element, page) {
    element.props.text = 'Runtime items: ' + page.state.recentUsers.length;
  },
})`,
        },
        {
          id: 'username',
          type: 'text-input',
          name: 'username',
          props: {},
          elementCode: withQuickProperties(undefined, {
            'props.label': 'Username',
            'props.placeholder': 'Type to drive element code',
            'validation.required': true,
          }),
        },
        {
          id: 'password',
          type: 'password-input',
          name: 'password',
          props: {},
          style: {},
          elementCode: withQuickProperties(`defineElement({
  compute(element, page) {
    const userNameLength = String(page.fields.username || '').length;
    element.style.size = 'fixed';
    element.style.width = (200 + userNameLength * 8) + 'px';
  },
})`, {
            'props.label': 'Password',
            'validation.required': true,
          }),
        },
        {
          id: 'recentUsers',
          type: 'repeat',
          name: 'recentUsers',
          props: { items: [], keyPath: 'id' },
          elementCode: `defineElement({
  compute(element, page) {
    element.props.items = page.state.recentUsers;
    element.props.keyPath = 'id';
    element.props.emptyText = 'No runtime items';
  },
})`,
          children: [
            {
              id: 'recentUserLabel',
              type: 'paragraph',
              name: 'recentUserLabel',
              props: { text: '' },
              elementCode: `defineElement({
  compute(element, page) {
    element.bindings.text = { source: 'item', path: 'label', fallback: '' };
  },
})`,
            },
          ],
        },
        {
          id: 'addUserButton',
          type: 'button',
          name: 'addUserButton',
          props: { label: 'Button' },
          elementCode: withQuickProperties(`defineElement({
  compute(element, page) {
  },
  actions: {
    async click(element, page, action) {
      const id = page.state.nextUserId++;
      page.state.recentUsers.push({ id: String(id), label: 'Runtime item ' + id });
    },
  },
})`, {
            'props.label': 'Add array item',
            'props.variant': 'secondary',
          }),
        },
        {
          id: 'submitButton',
          type: 'button',
          name: 'submitButton',
          props: { label: 'Button' },
          style: {},
          elementCode: withQuickProperties(`defineElement({
  compute(element, page) {
    element.props.validates = true;
    element.props.disabled = !page.fields.username?.trim() || !page.fields.password || !page.form.valid;
  },
  actions: {
    async click(element, page, action) {
      page.state.lastSubmit = action.payload;
    },
  },
})`, {
            'props.label': 'Sign in',
            'style.width': '100%',
          }),
        },
      ],
    },
  ],
});

// The builder persists state/element source but never evaluates it. This
// playground is the host: one SES Worker session per renderer preview.
const builderRuntimeHost = definePageRuntimeHost({});
const builderPageCodeValues = ref<PageCodeRuntimeValues>();
const builderRuntimeScope = ref<Pick<PageCodeRuntimeInput, 'fields' | 'form'>>({
  fields: {},
  form: { valid: false, dirty: false, validating: false, submitting: false },
});
let builderPageState: Record<string, unknown> = {};
let builderRuntimeSession: PageRuntimeSession | undefined;
let builderRuntimeRestartTimer: ReturnType<typeof setTimeout> | undefined;
let builderRuntimeGeneration = 0;
let builderRuntimeQueue: Promise<void> = Promise.resolve();
let builderRuntimeDrafts = createPageCodeDrafts(builderSchema.value);
let builderElementActions = new Map<string, { definitionId: string; nodeName: string }>();

function runtimeScope() {
  return {
    state: builderPageState,
    elements: builderRuntimeDrafts.elements,
    fields: builderRuntimeScope.value.fields,
    form: builderRuntimeScope.value.form,
    context: {},
    viewport: { width: 1280, breakpoint: 'desktop' },
  };
}

function collectRuntimeDefinitions(schema: PageNode): RuntimeDefinition[] {
  const definitions: RuntimeDefinition[] = [];
  builderElementActions = new Map();
  const stateCode = schema.type === 'page' ? schema.stateCode ?? 'definePageState({})' : 'definePageState({})';
  definitions.push({ id: 'page-state', source: pageStateRuntimeSource(stateCode) });
  const walk = (node: PageNode) => {
    if (node.type !== 'page') {
      const element = node as ElementNode;
      if (element.elementCode && element.name) {
        const actionId = elementClickActionId(element.id);
        const actionDefinition = elementActionDefinitionId(element.id);
        definitions.push({
          id: elementBindingId(element.id),
          kind: 'binding',
          source: elementComputeRuntimeSource(element.elementCode, element.name, actionId),
        });
        definitions.push({
          id: actionDefinition,
          source: elementActionRuntimeSource(element.elementCode, element.name),
        });
        builderElementActions.set(actionId, { definitionId: actionDefinition, nodeName: element.name });
      }
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(schema);
  return definitions;
}

function applyElementUpdate(update: RuntimeReactiveUpdate) {
  if (update.kind !== 'binding') return;
  const nodeId = update.id.startsWith('element-binding:') ? update.id.slice('element-binding:'.length) : '';
  const alias = Object.entries(builderRuntimeDrafts.nodeIds).find(([, id]) => id === nodeId)?.[0];
  if (!alias) return;
  const normalized = normalizePageCodeOutput({ elements: { [alias]: update.value }, state: builderPageState }, builderRuntimeDrafts);
  builderPageCodeValues.value = {
    nodes: { ...(builderPageCodeValues.value?.nodes ?? {}), ...normalized.nodes },
    state: { ...builderPageState },
    actionIds: [...builderElementActions.keys()],
  };
}

function runtimePatches(previous: unknown, next: unknown, path: string[]): RuntimeStatePatch[] {
  if (Object.is(previous, next)) return [];
  if (
    !previous || !next || typeof previous !== 'object' || typeof next !== 'object' ||
    Array.isArray(previous) || Array.isArray(next)
  ) return [{ op: 'set', path, value: next as RuntimeValue }];
  const left = previous as Record<string, unknown>;
  const right = next as Record<string, unknown>;
  const patches: RuntimeStatePatch[] = [];
  for (const key of Object.keys(left)) if (!(key in right)) patches.push({ op: 'delete', path: [...path, key] });
  for (const [key, value] of Object.entries(right)) {
    if (!(key in left)) patches.push({ op: 'set', path: [...path, key], value: value as RuntimeValue });
    else patches.push(...runtimePatches(left[key], value, [...path, key]));
  }
  return patches;
}

async function restartBuilderRuntime() {
  const generation = ++builderRuntimeGeneration;
  builderRuntimeSession?.dispose('Builder state, element code, or structure changed.');
  builderRuntimeSession = undefined;
  builderPageCodeValues.value = undefined;
  builderPageState = {};
  builderRuntimeQueue = Promise.resolve();
  builderRuntimeDrafts = createPageCodeDrafts(builderSchema.value);
  const definitions = collectRuntimeDefinitions(builderSchema.value);

  const session = builderRuntimeHost.createSession({
    pageId: 'page-builder.preview',
    tenantId: 'authoring-preview',
    definitions,
  });
  builderRuntimeSession = session;
  session.subscribe(applyElementUpdate);
  try {
    await session.initialize();
    if (generation !== builderRuntimeGeneration) return;
    const initialState = await session.invoke('page-state', {});
    if (generation !== builderRuntimeGeneration || session !== builderRuntimeSession) return;
    if (!initialState.value || typeof initialState.value !== 'object' || Array.isArray(initialState.value)) {
      throw new Error('Page State must return a plain object.');
    }
    builderPageState = { ...(initialState.value as Record<string, unknown>) };
    builderPageCodeValues.value = {
      nodes: {},
      state: { ...builderPageState },
      actionIds: [...builderElementActions.keys()],
    };
    await session.setState(runtimeScope());
  } catch (error) {
    if (generation === builderRuntimeGeneration) {
      console.warn('[PageBuilder demo] Element runtime preview failed; structural fallbacks remain active.', error);
    }
  }
}

function scheduleBuilderRuntimeRestart() {
  if (builderRuntimeRestartTimer) clearTimeout(builderRuntimeRestartTimer);
  builderRuntimeRestartTimer = setTimeout(() => { void restartBuilderRuntime(); }, 250);
}

watch(
  () => builderSchema.value,
  scheduleBuilderRuntimeRestart,
  { immediate: true, deep: true },
);

let builderComputeTimer: ReturnType<typeof setTimeout> | undefined;
function onBuilderRuntimeChange(scope: Pick<PageCodeRuntimeInput, 'fields' | 'form'>) {
  const previous = builderRuntimeScope.value;
  builderRuntimeScope.value = scope;
  if (builderComputeTimer) clearTimeout(builderComputeTimer);
  builderComputeTimer = setTimeout(() => {
    const session = builderRuntimeSession;
    if (!session) return;
    const patches = [
      ...runtimePatches(previous.fields, scope.fields, ['fields']),
      ...runtimePatches(previous.form, scope.form, ['form']),
    ];
    if (patches.length === 0) return;
    const operation = builderRuntimeQueue.then(() => session.patchState(patches));
    builderRuntimeQueue = operation.then(() => undefined, () => undefined);
    void operation.catch((error) => {
      console.warn('[PageBuilder demo] Reactive element update failed.', error);
    });
  }, 0);
}

async function runBuilderPageAction(id: string, payload: ActionValues) {
  const session = builderRuntimeSession;
  const action = builderElementActions.get(id);
  if (!session || !action) return;
  const operation = builderRuntimeQueue.then(async () => {
    const result = await session.invoke(action.definitionId, {
      ...runtimeScope(),
      actionName: 'click',
      payload,
    });
    const value = result.value as { state?: unknown } | undefined;
    if (!value?.state || typeof value.state !== 'object' || Array.isArray(value.state)) {
      throw new Error('Element action returned invalid Page State.');
    }
    const nextState = value.state as Record<string, unknown>;
    const patches = runtimePatches(builderPageState, nextState, ['state']);
    builderPageState = { ...nextState };
    builderPageCodeValues.value = builderPageCodeValues.value && {
      ...builderPageCodeValues.value,
      state: { ...builderPageState },
    };
    if (patches.length > 0) await session.patchState(patches);
  });
  builderRuntimeQueue = operation.then(() => undefined, () => undefined);
  await operation;
}

onBeforeUnmount(() => {
  if (builderRuntimeRestartTimer) clearTimeout(builderRuntimeRestartTimer);
  if (builderComputeTimer) clearTimeout(builderComputeTimer);
  builderRuntimeSession?.dispose();
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
      name: 'feedbackCard',
      props: {},
      style: { width: '380px', gap: '20px' },
      children: [
        { id: 'h1', type: 'heading', name: 'feedbackTitle', props: { text: 'How did we do?', level: 2 } },
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
          name: 'feedbackSubmit',
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const feedbackActions: Record<string, ActionHandler> = {
  'feedback:submit': (v) => { feedbackPayload.value = v; },
};

const loginActions: Record<string, ActionHandler> = {
  // Async action: the Sign-in button spins while the "API call" runs, every
  // other action disables, and a thrown Error surfaces in the form banner.
  'auth:login': async (v) => {
    loginPayload.value = null;
    await wait(900);
    if (v.password !== 'secret123') {
      throw new Error('Invalid credentials — try password "secret123".');
    }
    loginPayload.value = v;
  },
  'auth:forgot': () => { alert('Forgot password flow'); },
};

const registerActions: Record<string, ActionHandler> = {
  'auth:register': async (v) => {
    registerPayload.value = null;
    await wait(800);
    registerPayload.value = v;
  },
  'nav:login': () => { alert('Navigate to login'); },
};

/** Renderer-side config for the register demo: API-backed country list. */
const registerConfig: PageConfig = {
  optionsSource: async (sourceId) => {
    await wait(600);
    if (sourceId !== 'countries') return [];
    return [
      { value: 'at', label: 'Austria' },
      { value: 'de', label: 'Germany' },
      { value: 'ch', label: 'Switzerland' },
      { value: 'gb', label: 'United Kingdom' },
      { value: 'us', label: 'United States' },
    ];
  },
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
    <CoarPageBuilder
      v-model="builderSchema"
      :config="idpLoginConfig"
      authoring-mode="code"
      :preview-page-code-values="builderPageCodeValues"
      :preview-on-action="runBuilderPageAction"
      @preview-runtime="onBuilderRuntimeChange"
    />

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
        <div v-else class="pb-view__placeholder">
          Enter submits (async action — button spins). Password "secret123"; anything else hits the error banner.
        </div>
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
            :config="registerConfig"
            />
        </div>
        <div class="pb-view__result-label">ACTION PAYLOAD</div>
        <pre v-if="registerPayload" class="pb-view__json">{{ JSON.stringify(registerPayload, null, 2) }}</pre>
        <div v-else class="pb-view__placeholder">
          Countries load async (optionsSource); "Company name" appears only for business accounts (visibleWhen) and is required while shown.
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
