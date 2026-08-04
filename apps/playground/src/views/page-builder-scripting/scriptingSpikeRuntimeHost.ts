import {
  definePageRuntimeHost,
  withRuntimeEndowmentContext,
  type RuntimeEndowmentContext,
  type RuntimeValue,
} from '@cocoar/vue-page-builder';

type TelemetryListener = (abortedCalls: number) => void;
const telemetryListeners = new Set<TelemetryListener>();
let abortedCalls = 0;

function publishTelemetry() {
  for (const listener of telemetryListeners) listener(abortedCalls);
}

export function subscribeScriptingSpikeHostTelemetry(listener: TelemetryListener): () => void {
  telemetryListeners.add(listener);
  listener(abortedCalls);
  return () => telemetryListeners.delete(listener);
}

function asRecord(value: RuntimeValue): Record<string, RuntimeValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, RuntimeValue>
    : {};
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Host call was aborted.', 'AbortError'));
    }, { once: true });
  });
}

// Represents a real application/third-party dependency. It and everything it
// imports remain in the main application bundle; the Worker never sees it.
class DemoIdentitySdk {
  async login(payload: Record<string, RuntimeValue>, signal: AbortSignal): Promise<RuntimeValue> {
    const username = typeof payload.username === 'string' ? payload.username.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    await abortableDelay(220, signal);
    if (password !== 'secret123') throw new Error('Invalid username or password.');
    return { message: `Authenticated ${username}.`, userId: 'demo-user' };
  }

  async regions(payload: Record<string, RuntimeValue>, signal: AbortSignal): Promise<RuntimeValue> {
    const version = typeof payload.catalogVersion === 'string' ? payload.catalogVersion : 'initial';
    const locale = payload.locale === 'de' ? 'de' : 'en';
    try {
      await abortableDelay(version === 'slow' ? 650 : version === 'fast' ? 40 : 180, signal);
    } catch (error) {
      if (signal.aborted) {
        abortedCalls += 1;
        publishTelemetry();
      }
      throw error;
    }
    const suffix = version === 'initial' ? '' : ` (${version})`;
    return [
      { id: 'eu-central', label: `${locale === 'de' ? 'Europa Zentral' : 'Europe Central'}${suffix}`, enabled: true },
      { id: 'us-east', label: `${locale === 'de' ? 'USA Ost' : 'US East'}${suffix}`, enabled: true },
      { id: 'retired', label: `Retired${suffix}`, enabled: false },
    ];
  }
}

const identitySdk = new DemoIdentitySdk();

class DemoThirdPartyLabelFormatter {
  constructor(private readonly suffix = '') {}

  decorateAll(labels: RuntimeValue): RuntimeValue {
    return Array.isArray(labels)
      ? labels.map((label) => `${typeof label === 'string' ? label : ''}${this.suffix}`)
      : [];
  }
}

const labelFormatter = new DemoThirdPartyLabelFormatter();

/**
 * Application singleton: defines available host objects and policy, but creates
 * no Worker until a renderer creates a PageRuntimeSession.
 */
export const scriptingSpikeRuntimeHost = definePageRuntimeHost({
  endowments: {
    api: {
      kind: 'host-rpc-v1',
      call: withRuntimeEndowmentContext(async (
        context: RuntimeEndowmentContext,
        operation: RuntimeValue,
        input: RuntimeValue,
      ) => {
        if (context.pageId !== 'scripting-spike.login' || context.tenantId !== 'demo-tenant') {
          throw new Error('This host API is not available for the current page session.');
        }
        if (context.definitionId === 'login.submit' && operation === 'auth.login') {
          return identitySdk.login(asRecord(input), context.signal);
        }
        if (context.definitionId === 'region-options' && operation === 'catalog.regions') {
          return identitySdk.regions(asRecord(input), context.signal);
        }
        throw new Error(
          `Operation "${String(operation)}" is not allowed for "${context.definitionId}".`,
        );
      }),
    },
    // Class instance: its prototype method is discovered automatically and is
    // invoked in the main thread with `this === labelFormatter`.
    labelFormatter,
  },
  grants: ({ pageId, tenantId, definition }) => {
    if (pageId !== 'scripting-spike.login' || tenantId !== 'demo-tenant') return [];
    if (definition.id === 'login.submit') return ['api'];
    if (definition.id === 'region-options') return ['api', 'labelFormatter'];
    return [];
  },
});
