<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { CoarNotice } from '@cocoar/vue-ui';
import {
  CoarPageRenderer,
  type ActionHandler,
  type ActionValues,
  type ElementNode,
  type OptionItem,
  type PageNode,
  type SelectNode,
  type RuntimeBootstrapMetrics,
  type RuntimeInitializationMetrics,
  type RuntimeDefinition,
  type RuntimeReactiveUpdate,
  type RuntimeResourceState,
  type RuntimeValue,
} from '@cocoar/vue-page-builder';
import { createAuthPageConfig as createAuthLabConfig } from './auth-customization/authPageConfig';
import { loadAuthDemoDocument as createAuthLabSchema } from './auth-customization/documents';
import {
  scriptingSpikeRuntimeHost,
  subscribeScriptingSpikeHostTelemetry,
} from './page-builder-scripting/scriptingSpikeRuntimeHost';

const viewStarted = performance.now();
const runtimeState = ref<'booting' | 'ready' | 'failed'>('booting');
const runtimeError = ref('');
const firstRenderMs = ref<number>();
const readyMs = ref<number>();
const bootstrapMetrics = ref<RuntimeBootstrapMetrics>();
const initializationMetrics = ref<RuntimeInitializationMetrics>();
const lastBindingRoundtripMs = ref<number>();
const actionResult = ref('');
const diagnostics = ref<Record<string, RuntimeValue>>({});
const currentValues = ref<ActionValues>({ username: '', password: '', region: '' });
const regionResource = ref<RuntimeResourceState>({ status: 'idle', runId: 0 });
const lastEvaluatedBindings = ref<string[]>([]);
const catalogVersion = ref('initial');
const abortedHostCalls = ref(0);

const disabledBindingSource = `(scope) => {
  const username = typeof scope.fields.username === "string"
    ? scope.fields.username.trim()
    : "";
  const password = typeof scope.fields.password === "string"
    ? scope.fields.password
    : "";
  const region = typeof scope.fields.region === "string"
    ? scope.fields.region
    : "";

  return !username || !password || !region
    || scope.resources["region-options"].status !== "success";
}`;

const labelBindingSource = `(scope) => {
  const username = typeof scope.fields.username === "string"
    ? scope.fields.username.trim()
    : "";
  return username ? \`Sign in as \${username}\` : "Sign in";
}`;

const regionPropsBindingSource = `(scope) => {
  const resource = scope.resources["region-options"];
  if (resource.status === "pending" || resource.status === "idle") {
    return { disabled: true, placeholder: "Loading regions…", options: [] };
  }
  if (resource.status === "error") {
    return { disabled: true, placeholder: resource.error, options: [] };
  }
  return {
    disabled: false,
    placeholder: "Choose a region",
    options: resource.value
  };
}`;

const regionInputsSource = `(scope) => ({
  locale: scope.context.locale,
  catalogVersion: scope.context.catalogVersion
})`;

const regionResourceSource = `async (input, { api, labelFormatter }) => {
  if (api.kind !== "host-rpc-v1") throw new Error("Unexpected host API version");
  const result = await api.call("catalog.regions", input);
  const enabled = result.filter((region) => region.enabled);
  const labels = await labelFormatter.decorateAll(enabled.map((region) => region.label));
  return enabled.map((region, index) => ({ value: region.id, label: labels[index] }));
}`;

const actionSource = `async (input, { api }) => {
  return api.call("auth.login", {
    username: input.fields.username,
    password: input.fields.password,
    region: input.fields.region
  });
}`;

const diagnosticSource = `(input, endowments) => ({
  windowType: typeof window,
  fetchType: typeof fetch,
  postMessageType: typeof postMessage,
  endowmentsType: typeof endowments,
  apiType: typeof endowments?.api,
  globalIsFrozen: Object.isFrozen(globalThis),
  functionType: typeof Function,
  evalType: typeof eval
})`;

const definitions: RuntimeDefinition[] = [
  { id: 'login.submit.disabled', kind: 'binding', source: disabledBindingSource },
  { id: 'login.submit.label', kind: 'binding', source: labelBindingSource },
  { id: 'login.region.props', kind: 'binding', source: regionPropsBindingSource },
  {
    id: 'region-options',
    kind: 'resource',
    inputsSource: regionInputsSource,
    source: regionResourceSource,
    debounceMs: 80,
    timeoutMs: 2_000,
  },
  { id: 'login.submit', source: actionSource },
  { id: 'security.diagnostics', source: diagnosticSource },
];

function asRecord(value: RuntimeValue): Record<string, RuntimeValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, RuntimeValue>
    : {};
}

function findNode(node: PageNode, id: string): ElementNode | undefined {
  if (node.id === id && node.type !== 'page') return node as ElementNode;
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

const schema = reactive(createAuthLabSchema('login')) as PageNode;
const regionNode: SelectNode = reactive({
  id: 'region',
  type: 'select',
  name: 'region',
  props: {
    label: 'Region',
    placeholder: 'Runtime is starting…',
    options: [],
    disabled: true,
  },
  validation: { required: true },
});
const credentialsNode = findNode(schema, 'credentials') as (ElementNode & { children: PageNode[] });
if (!credentialsNode?.children) throw new Error('Login spike schema is missing its credentials stack.');
credentialsNode.children.splice(2, 0, regionNode);

const submitNode = (() => {
  const node = findNode(schema, 'submit');
  if (!node) throw new Error('Login spike schema is missing its submit button.');
  return node;
})();

// Fail closed before the worker has even started. The page itself can render
// immediately; only script-dependent interaction waits for the runtime.
submitNode.props.disabled = true;

const authConfig = createAuthLabConfig('login', 'en');
const config = {
  ...authConfig,
  allowedElements: [...(authConfig.allowedElements ?? []), 'select'],
  fields: [
    ...(authConfig.fields ?? []),
    { name: 'region', valueType: 'string' as const, label: 'Region', required: true },
  ],
};
const runtimeContext = {
  branding: { productName: 'Cocoar IDP', showLegal: true },
  auth: {
    internalLoginEnabled: true,
    passwordless: false,
    magicLinkEnabled: false,
    registrationEnabled: false,
    externalProviders: [],
  },
  feedback: { message: '', success: false },
};

const runtime = scriptingSpikeRuntimeHost.createSession({
  pageId: 'scripting-spike.login',
  tenantId: 'demo-tenant',
  definitions,
});
const runtimeSessionId = runtime.sessionId;
const unsubscribeHostTelemetry = subscribeScriptingSpikeHostTelemetry((aborted) => {
  abortedHostCalls.value = aborted;
});

const underOneSecond = computed(() => readyMs.value !== undefined && readyMs.value < 1_000);

function optionItems(value: RuntimeValue): OptionItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const option = asRecord(entry);
    return typeof option.value === 'string' && typeof option.label === 'string'
      ? [{ value: option.value, label: option.label }]
      : [];
  });
}

function onRuntimeUpdate(update: RuntimeReactiveUpdate) {
  if (update.kind === 'resource') {
    if (update.id === 'region-options') regionResource.value = update.state;
    return;
  }

  lastBindingRoundtripMs.value = update.durationMs;
  lastEvaluatedBindings.value = [
    update.id,
    ...lastEvaluatedBindings.value.filter((id) => id !== update.id),
  ].slice(0, 3);
  if (update.id === 'login.submit.disabled') {
    submitNode.props.disabled = update.value !== false;
  } else if (update.id === 'login.submit.label' && typeof update.value === 'string') {
    submitNode.props.label = update.value;
  } else if (update.id === 'login.region.props') {
    const props = asRecord(update.value);
    regionNode.props.disabled = props.disabled !== false;
    if (typeof props.placeholder === 'string') regionNode.props.placeholder = props.placeholder;
    regionNode.props.options = optionItems(props.options);
  }
}

const unsubscribeRuntime = runtime.subscribe(onRuntimeUpdate);

function onValues(values: ActionValues) {
  const previous = currentValues.value;
  currentValues.value = { ...values };
  if (runtimeState.value !== 'ready') return;
  const keys = new Set([...Object.keys(previous), ...Object.keys(values)]);
  const patches = [...keys]
    .filter((key) => !Object.is(previous[key], values[key]))
    .map((key) => Object.hasOwn(values, key)
      ? { op: 'set' as const, path: ['fields', key], value: values[key] as RuntimeValue }
      : { op: 'delete' as const, path: ['fields', key] });
  if (!patches.length) return;
  const started = performance.now();
  void runtime.patchState(patches).then((metrics) => {
    lastBindingRoundtripMs.value = performance.now() - started;
    lastEvaluatedBindings.value = metrics.evaluatedBindings;
  }).catch((error) => {
    submitNode.props.disabled = true;
    runtimeError.value = error instanceof Error ? error.message : String(error);
  });
}

function loadCatalog(version: 'slow' | 'fast') {
  catalogVersion.value = version;
  void runtime.patchState([{
    op: 'set',
    path: ['context', 'catalogVersion'],
    value: version,
  }]);
}

const actions: Record<string, ActionHandler> = {
  'auth:login': async (values) => {
    actionResult.value = '';
    if (runtimeState.value !== 'ready') throw new Error('Script runtime is not ready.');
    const invocation = await runtime.invoke<Record<string, RuntimeValue>>(
      'login.submit',
      { fields: { ...values } },
      5_000,
    );
    const result = asRecord(invocation.value);
    actionResult.value = typeof result.message === 'string' ? result.message : 'Action completed.';
  },
  // The full auth schema contains these fixed host actions. They are inert in
  // this focused credentials spike but remain allowlisted by the page config.
  'auth:passkey': () => undefined,
  'auth:magic-link': () => undefined,
  'auth:forgot-password': () => undefined,
  'auth:register': () => undefined,
  'auth:external-provider': () => undefined,
  'legal:terms': () => undefined,
  'legal:privacy': () => undefined,
};

async function startRuntime() {
  try {
    bootstrapMetrics.value = await runtime.bootstrap;
    initializationMetrics.value = await runtime.initialize();
    readyMs.value = performance.now() - viewStarted;
    runtimeState.value = 'ready';

    const diagnosticResult = await runtime.invoke<Record<string, RuntimeValue>>(
      'security.diagnostics',
      {},
    );
    diagnostics.value = asRecord(diagnosticResult.value);
    await runtime.setState({
      fields: { ...currentValues.value },
      context: { locale: 'en', catalogVersion: catalogVersion.value },
    });
  } catch (error) {
    runtimeState.value = 'failed';
    runtimeError.value = error instanceof Error ? error.message : String(error);
    submitNode.props.disabled = true;
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    firstRenderMs.value = performance.now() - viewStarted;
  });
});
onBeforeUnmount(() => {
  unsubscribeRuntime();
  unsubscribeHostTelemetry();
  runtime.dispose();
});

void startRuntime();
</script>

<template>
  <div class="spike-view">
    <header class="spike-heading">
      <div>
        <h1>PageBuilder Browser Scripting Spike</h1>
        <p>
          The PageBuilder schema renders immediately. A browser Web Worker initializes SES in
          parallel and applies tracked bindings, async resources and actions afterwards.
        </p>
      </div>
      <span
        class="runtime-badge"
        :class="`runtime-badge--${runtimeState}`"
        data-testid="runtime-status"
      >
        {{ runtimeState === 'ready' ? 'Runtime ready' : runtimeState === 'failed' ? 'Runtime failed' : 'Runtime booting' }}
      </span>
    </header>

    <section class="metrics" aria-label="Runtime measurements">
      <article>
        <strong>Initial form render</strong>
        <span data-testid="first-render-ms">{{ firstRenderMs?.toFixed(1) ?? '…' }} ms</span>
      </article>
      <article>
        <strong>Worker + SES + scripts</strong>
        <span data-testid="runtime-ready-ms">{{ readyMs?.toFixed(1) ?? '…' }} ms</span>
      </article>
      <article>
        <strong>SES lockdown</strong>
        <span>{{ bootstrapMetrics?.lockdownMs.toFixed(1) ?? '…' }} ms</span>
      </article>
      <article>
        <strong>Compartment + compile</strong>
        <span>
          {{ initializationMetrics
            ? `${(initializationMetrics.compartmentMs + initializationMetrics.compileMs).toFixed(1)} ms`
            : '…' }}
        </span>
      </article>
      <article>
        <strong>Last reactive update</strong>
        <span>{{ lastBindingRoundtripMs?.toFixed(2) ?? '…' }} ms</span>
      </article>
    </section>

    <CoarNotice
      v-if="runtimeState === 'ready'"
      :variant="underOneSecond ? 'success' : 'warning'"
      data-testid="startup-budget"
    >
      {{ underOneSecond
        ? 'Cold browser runtime was ready within the 1,000 ms guardrail. The form rendered independently.'
        : 'Runtime exceeded 1,000 ms on this run. The form still rendered immediately with its action disabled.' }}
    </CoarNotice>
    <CoarNotice v-else-if="runtimeError" variant="error">{{ runtimeError }}</CoarNotice>

    <div class="stage-grid">
      <article class="login-stage">
        <header>
          <strong>Actual CoarPageRenderer</strong>
          <span>Use password <code>secret123</code></span>
        </header>
        <div class="login-frame" data-testid="login-form">
          <CoarPageRenderer
            :schema="schema"
            :config="config"
            :actions="actions"
            :runtime-context="runtimeContext"
            view-state="credentials"
            locale="en"
            :viewport-width="390"
            @update:values="onValues"
          />
          <CoarNotice v-if="actionResult" variant="success" data-testid="action-result">
            {{ actionResult }}
          </CoarNotice>
        </div>
      </article>

      <article class="security-stage">
        <header>
          <strong>Observed inside the SES Compartment</strong>
          <span>Values come from the executing guest script</span>
        </header>
        <dl data-testid="security-diagnostics">
          <dt><code>typeof window</code></dt><dd>{{ diagnostics.windowType ?? '…' }}</dd>
          <dt><code>typeof fetch</code></dt><dd>{{ diagnostics.fetchType ?? '…' }}</dd>
          <dt><code>typeof postMessage</code></dt><dd>{{ diagnostics.postMessageType ?? '…' }}</dd>
          <dt><code>typeof endowments</code> without a host grant</dt><dd>{{ diagnostics.endowmentsType ?? '…' }}</dd>
          <dt><code>typeof endowments?.api</code></dt><dd>{{ diagnostics.apiType ?? '…' }}</dd>
          <dt><code>Object.isFrozen(globalThis)</code></dt><dd>{{ diagnostics.globalIsFrozen ?? '…' }}</dd>
          <dt><code>typeof Function</code></dt><dd>{{ diagnostics.functionType ?? '…' }}</dd>
          <dt><code>typeof eval</code></dt><dd>{{ diagnostics.evalType ?? '…' }}</dd>
        </dl>
        <p class="capability-note">
          The host constructs the complete <code>api</code> object and selectively endows the
          submit script and region resource with it. Its host-owned <code>call</code> method
          decides which operation each caller may use. The diagnostic script receives no
          endowments at all.
        </p>
        <div class="resource-demo">
          <strong>Renderer-owned session</strong>
          <span data-testid="runtime-session">
            {{ runtimeSessionId }} · {{ scriptingSpikeRuntimeHost.activeSessionCount }} active host session
          </span>
          <strong>Async resource</strong>
          <span data-testid="resource-status">
            {{ regionResource.status }} · run {{ regionResource.runId }} · {{ catalogVersion }}
          </span>
          <span data-testid="last-bindings">
            Last affected bindings: {{ lastEvaluatedBindings.join(', ') || 'none' }}
          </span>
          <span data-testid="aborted-host-calls">
            Aborted host calls: {{ abortedHostCalls }}
          </span>
          <div>
            <button type="button" data-testid="load-slow" @click="loadCatalog('slow')">
              Start slow load
            </button>
            <button type="button" data-testid="load-fast" @click="loadCatalog('fast')">
              Supersede with fast load
            </button>
          </div>
        </div>
      </article>
    </div>

    <section class="script-sources">
      <h2>Scripts loaded into the worker</h2>
      <details open>
        <summary>Tracked button disabled binding</summary>
        <pre><code>{{ disabledBindingSource }}</code></pre>
      </details>
      <details open>
        <summary>Async select resource with await</summary>
        <pre><code>{{ regionInputsSource }}

{{ regionResourceSource }}</code></pre>
      </details>
      <details>
        <summary>Resource-state to select-props binding</summary>
        <pre><code>{{ regionPropsBindingSource }}</code></pre>
      </details>
      <details>
        <summary>Action using one explicit host capability</summary>
        <pre><code>{{ actionSource }}</code></pre>
      </details>
    </section>
  </div>
</template>

<style scoped>
.spike-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
}

.spike-heading,
.login-stage > header,
.security-stage > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.spike-heading h1,
.spike-heading p,
.script-sources h2 {
  margin: 0;
}

.spike-heading p {
  max-width: 820px;
  margin-top: 6px;
  color: var(--coar-text-neutral-secondary, #5f6470);
}

.runtime-badge {
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff3cd;
  color: #664d03;
  font-size: 13px;
  font-weight: 600;
}

.runtime-badge--ready { background: #dff5e5; color: #176b36; }
.runtime-badge--failed { background: #fde8e4; color: #a72b1f; }

.metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 10px;
}

.metrics article,
.login-stage,
.security-stage,
.script-sources {
  border: 1px solid var(--coar-border-neutral, #d9dce2);
  border-radius: 10px;
  background: var(--coar-surface-default, #fff);
}

.metrics article {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}

.metrics strong,
.login-stage header span,
.security-stage header span {
  color: var(--coar-text-neutral-secondary, #5f6470);
  font-size: 12px;
}

.metrics span { font-size: 18px; font-variant-numeric: tabular-nums; }

.stage-grid {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(340px, 1fr);
  gap: 20px;
  align-items: start;
}

.login-stage > header,
.security-stage > header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--coar-border-neutral, #d9dce2);
}

.login-frame {
  width: min(100%, 390px);
  min-height: 580px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  background: #f4f7fb;
}

.security-stage dl {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 0;
  margin: 0;
  padding: 8px 16px;
}

.security-stage dt,
.security-stage dd {
  margin: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--coar-border-neutral, #eceef2);
}

.security-stage dd {
  font-weight: 700;
  text-align: right;
}

.capability-note { margin: 8px 16px 18px; line-height: 1.55; }

.resource-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 16px 18px;
  padding: 12px;
  border-radius: 8px;
  background: var(--coar-surface-neutral, #f4f6f8);
  font-size: 13px;
}

.resource-demo div { display: flex; flex-wrap: wrap; gap: 8px; }
.resource-demo button { cursor: pointer; padding: 6px 10px; }

.script-sources { padding: 16px; }
.script-sources details { margin-top: 12px; }
.script-sources summary { cursor: pointer; font-weight: 600; }
.script-sources pre {
  overflow: auto;
  padding: 14px;
  border-radius: 6px;
  background: #172033;
  color: #eef3ff;
  font-size: 12px;
}

@media (max-width: 980px) {
  .metrics { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
  .stage-grid { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .spike-heading { flex-direction: column; }
  .metrics { grid-template-columns: 1fr; }
  .security-stage dl { grid-template-columns: 1fr; }
  .security-stage dd { padding-top: 0; text-align: left; }
  .login-frame { padding: 8px; }
}
</style>
