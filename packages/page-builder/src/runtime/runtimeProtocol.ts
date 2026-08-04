/** Data-only value accepted at the public Page Runtime boundary. */
export type RuntimeValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Copy and validate the data-only values allowed across the runtime boundary. */
export function cloneRuntimeValue(value: unknown): RuntimeValue {
  const seen = new WeakSet<object>();
  let nodes = 0;

  const copy = (current: unknown, depth: number): RuntimeValue => {
    nodes += 1;
    if (nodes > 10_000) throw new Error('Runtime value exceeds the node limit.');
    if (depth > 32) throw new Error('Runtime value exceeds the depth limit.');
    if (
      current === undefined || current === null || typeof current === 'boolean' ||
      typeof current === 'string'
    ) return current;
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new Error('Runtime value contains a non-finite number.');
      return current;
    }
    if (typeof current !== 'object') {
      throw new Error(`Runtime value contains unsupported type "${typeof current}".`);
    }
    if (seen.has(current)) throw new Error('Runtime value contains a cycle.');
    seen.add(current);

    if (Array.isArray(current)) {
      const result = current.map((entry) => copy(entry, depth + 1));
      seen.delete(current);
      return result;
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Runtime value must contain plain objects only.');
    }
    const result: Record<string, RuntimeValue> = Object.create(null) as Record<string, RuntimeValue>;
    for (const [key, entry] of Object.entries(current)) {
      if (FORBIDDEN_KEYS.has(key)) throw new Error(`Runtime value contains forbidden key "${key}".`);
      result[key] = copy(entry, depth + 1);
    }
    seen.delete(current);
    return result;
  };

  return copy(value, 0);
}

export type RuntimePath = string[];

export interface RuntimeStatePatch {
  op: 'set' | 'delete';
  path: RuntimePath;
  value?: RuntimeValue;
}

export interface RuntimeScriptDefinition {
  id: string;
  kind?: 'script';
  /** Function source: `(input, endowments) => value`. */
  source: string;
}

export interface RuntimeBindingDefinition {
  id: string;
  kind: 'binding';
  /** Pure synchronous function source: `(scope) => value`. */
  source: string;
}

export interface RuntimeResourceDefinition {
  id: string;
  kind: 'resource';
  /** Pure synchronous function source. Its property reads become dependencies. */
  inputsSource: string;
  /** Async-capable function source: `async (input, endowments) => value`. */
  source: string;
  debounceMs?: number;
  timeoutMs?: number;
}

export type RuntimeDefinition =
  | RuntimeScriptDefinition
  | RuntimeBindingDefinition
  | RuntimeResourceDefinition;

/**
 * Host-owned grants from definition id to host-defined endowment names. They
 * are runtime configuration, never authority persisted in a tenant document.
 */
export type RuntimeEndowmentGrants = Record<string, string[]>;

export interface RuntimeEndowmentDescriptor {
  name: string;
  methods: string[];
  values: Record<string, RuntimeValue>;
}

export type RuntimeResourceStatus = 'idle' | 'pending' | 'success' | 'error';

export interface RuntimeResourceState {
  status: RuntimeResourceStatus;
  value?: RuntimeValue;
  error?: string;
  runId: number;
}

export type RuntimeReactiveUpdate =
  | {
      kind: 'binding';
      id: string;
      value: RuntimeValue;
      dependencies: RuntimePath[];
      durationMs: number;
    }
  | {
      kind: 'resource';
      id: string;
      state: RuntimeResourceState;
      dependencies: RuntimePath[];
      durationMs?: number;
    };

export interface RuntimeBootstrapMetrics {
  workerBootstrapMs: number;
  lockdownMs: number;
}

export interface RuntimeInitializationMetrics {
  compartmentMs: number;
  compileMs: number;
  scriptCount: number;
  bindingCount: number;
  resourceCount: number;
}

export interface RuntimeStateUpdateMetrics {
  durationMs: number;
  evaluatedBindings: string[];
  evaluatedResourceInputs: string[];
}

export type MainToRuntimeMessage =
  | {
      type: 'initialize';
      requestId: number;
      definitions: RuntimeDefinition[];
      endowments: RuntimeEndowmentDescriptor[];
      endowmentGrants: RuntimeEndowmentGrants;
    }
  | {
      type: 'invoke';
      requestId: number;
      scriptId: string;
      input: RuntimeValue;
    }
  | {
      type: 'set-state';
      requestId: number;
      state: RuntimeValue;
    }
  | {
      type: 'patch-state';
      requestId: number;
      patches: RuntimeStatePatch[];
    }
  | {
      type: 'endowment-result';
      callId: number;
      ok: true;
      value: RuntimeValue;
    }
  | {
      type: 'endowment-result';
      callId: number;
      ok: false;
      error: string;
    }
  | {
      type: 'cancel-resource';
      resourceId: string;
    };

export type RuntimeToMainMessage =
  | {
      type: 'worker-ready';
      lockdownMs: number;
    }
  | {
      type: 'initialized';
      requestId: number;
      metrics: RuntimeInitializationMetrics;
    }
  | {
      type: 'state-updated';
      requestId: number;
      metrics: RuntimeStateUpdateMetrics;
    }
  | {
      type: 'result';
      requestId: number;
      value: RuntimeValue;
      durationMs: number;
    }
  | {
      type: 'failure';
      requestId: number;
      error: string;
    }
  | {
      type: 'reactive-update';
      update: RuntimeReactiveUpdate;
    }
  | {
      type: 'endowment-call';
      callId: number;
      ownerId: string;
      definitionId: string;
      endowment: string;
      method: string;
      args: RuntimeValue[];
    }
  | {
      type: 'endowment-cancel';
      callId: number;
    };
