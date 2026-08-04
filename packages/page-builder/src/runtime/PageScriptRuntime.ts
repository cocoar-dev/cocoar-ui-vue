import type {
  MainToRuntimeMessage,
  RuntimeBootstrapMetrics,
  RuntimeDefinition,
  RuntimeEndowmentDescriptor,
  RuntimeEndowmentGrants,
  RuntimeInitializationMetrics,
  RuntimeReactiveUpdate,
  RuntimeStatePatch,
  RuntimeStateUpdateMetrics,
  RuntimeToMainMessage,
  RuntimeValue,
} from './runtimeProtocol';
import { cloneRuntimeValue } from './runtimeProtocol';

/** Identity and cancellation metadata supplied only to opted-in host methods. */
export interface RuntimeEndowmentContext {
  signal: AbortSignal;
  definitionId: string;
  sessionId: string;
  pageId: string;
  tenantId?: string;
}

export type ContextualRuntimeEndowmentMethodHandler = (
  context: RuntimeEndowmentContext,
  ...args: RuntimeValue[]
) => RuntimeValue | Promise<RuntimeValue>;

const CONTEXTUAL_ENDOWMENT_METHOD = Symbol('page-runtime-contextual-endowment-method');

export interface ContextualRuntimeEndowmentMethod {
  readonly [CONTEXTUAL_ENDOWMENT_METHOD]: true;
  readonly invoke: ContextualRuntimeEndowmentMethodHandler;
}

/** Opt-in only for host methods that need caller identity or cancellation. */
export function withRuntimeEndowmentContext(
  invoke: ContextualRuntimeEndowmentMethodHandler,
): ContextualRuntimeEndowmentMethod {
  return Object.freeze({ [CONTEXTUAL_ENDOWMENT_METHOD]: true as const, invoke });
}

export type RuntimeEndowmentObject = object;
export type RuntimeEndowments = Record<string, RuntimeEndowmentObject>;

export interface PageScriptRuntimeContext {
  sessionId: string;
  pageId: string;
  tenantId?: string;
}

export interface RuntimeInvocation<T extends RuntimeValue = RuntimeValue> {
  value: T;
  durationMs: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const FORBIDDEN_ENDOWMENT_MEMBERS = new Set(['__proto__', 'prototype', 'constructor']);

function isContextualMethod(value: unknown): value is ContextualRuntimeEndowmentMethod {
  return !!value && typeof value === 'object' &&
    (value as ContextualRuntimeEndowmentMethod)[CONTEXTUAL_ENDOWMENT_METHOD] === true;
}

function describeEndowment(name: string, endowment: RuntimeEndowmentObject): RuntimeEndowmentDescriptor {
  if (!name || FORBIDDEN_ENDOWMENT_MEMBERS.has(name) || Array.isArray(endowment)) {
    throw new Error(`Host endowment "${name}" is invalid.`);
  }
  const methods = new Set<string>();
  const values: Record<string, RuntimeValue> = Object.create(null) as Record<string, RuntimeValue>;
  const directPrototype = Object.getPrototypeOf(endowment);
  const isPlainObject = directPrototype === Object.prototype || directPrototype === null;

  for (const member of Object.keys(endowment)) {
    if (FORBIDDEN_ENDOWMENT_MEMBERS.has(member)) continue;
    const value = Reflect.get(endowment, member, endowment);
    if (typeof value === 'function' || isContextualMethod(value)) methods.add(member);
    else if (isPlainObject) values[member] = cloneRuntimeValue(value);
  }

  // Class methods live on prototypes. Only data descriptors containing
  // functions are reflected: constructors, accessors and internal fields stay
  // host-side and are never observed while generating the remote facade.
  let prototype = directPrototype;
  while (prototype && prototype !== Object.prototype) {
    for (const member of Object.getOwnPropertyNames(prototype)) {
      if (FORBIDDEN_ENDOWMENT_MEMBERS.has(member)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, member);
      if (typeof descriptor?.value === 'function') methods.add(member);
    }
    prototype = Object.getPrototypeOf(prototype);
  }

  return { name, methods: [...methods], values };
}

export class PageScriptRuntime {
  private readonly worker: Worker;
  private readonly endowments: RuntimeEndowments;
  private readonly context: PageScriptRuntimeContext;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly endowmentCalls = new Map<number, AbortController>();
  private readonly listeners = new Set<(update: RuntimeReactiveUpdate) => void>();
  private readonly resourceTimeouts = new Map<string, number>();
  private readonly resourceTimeoutHandles = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly workerStarted = performance.now();
  private nextRequestId = 1;
  private stopped = false;
  private resolveBootstrap!: (metrics: RuntimeBootstrapMetrics) => void;
  private rejectBootstrap!: (reason: Error) => void;

  readonly bootstrap: Promise<RuntimeBootstrapMetrics>;

  constructor(
    endowments: RuntimeEndowments = {},
    context: PageScriptRuntimeContext = { sessionId: 'standalone', pageId: 'standalone' },
  ) {
    this.endowments = endowments;
    this.context = context;
    this.bootstrap = new Promise<RuntimeBootstrapMetrics>((resolve, reject) => {
      this.resolveBootstrap = resolve;
      this.rejectBootstrap = reject;
    });
    // Keep the worker URL import in the published library so the downstream
    // Vite consumer owns emitting the asset and applying its configured base.
    // A network worker also has its own CSP context; unlike a Blob worker it
    // does not inherit the document's `script-src` restriction used by IDPs.
    this.worker = new Worker(new URL('./pageScriptRuntime.worker.js', import.meta.url), {
      name: 'page-script-runtime',
      type: 'module',
    });
    this.worker.addEventListener('message', (event: MessageEvent<RuntimeToMainMessage>) => {
      void this.onMessage(event.data);
    });
    this.worker.addEventListener('error', (event) => {
      this.failAll(new Error(event.message || 'The script worker failed.'));
    });
  }

  async initialize(
    definitions: RuntimeDefinition[],
    endowmentGrants: RuntimeEndowmentGrants = {},
  ): Promise<RuntimeInitializationMetrics> {
    await this.bootstrap;
    this.resourceTimeouts.clear();
    for (const definition of definitions) {
      if (definition.kind === 'resource') {
        this.resourceTimeouts.set(definition.id, Math.max(1, definition.timeoutMs ?? 10_000));
      }
    }
    const descriptors = Object.entries(this.endowments)
      .map(([name, endowment]) => describeEndowment(name, endowment));
    return this.request<RuntimeInitializationMetrics>(
      (requestId) => ({
        type: 'initialize',
        requestId,
        definitions,
        endowments: descriptors,
        endowmentGrants: Object.fromEntries(
          Object.entries(endowmentGrants).map(([id, grants]) => [id, [...grants]]),
        ),
      }),
      2_000,
    );
  }

  invoke<T extends RuntimeValue = RuntimeValue>(
    scriptId: string,
    input: unknown,
    timeoutMs = 1_000,
  ): Promise<RuntimeInvocation<T>> {
    return this.request<RuntimeInvocation<T>>(
      (requestId) => ({ type: 'invoke', requestId, scriptId, input: cloneRuntimeValue(input) }),
      timeoutMs,
    );
  }

  setState(state: unknown, timeoutMs = 1_000): Promise<RuntimeStateUpdateMetrics> {
    return this.request<RuntimeStateUpdateMetrics>(
      (requestId) => ({ type: 'set-state', requestId, state: cloneRuntimeValue(state) }),
      timeoutMs,
    );
  }

  patchState(patches: RuntimeStatePatch[], timeoutMs = 1_000): Promise<RuntimeStateUpdateMetrics> {
    const safePatches = patches.map((patch) => ({
      op: patch.op,
      path: [...patch.path],
      ...(patch.op === 'set' ? { value: cloneRuntimeValue(patch.value) } : {}),
    })) as RuntimeStatePatch[];
    return this.request<RuntimeStateUpdateMetrics>(
      (requestId) => ({ type: 'patch-state', requestId, patches: safePatches }),
      timeoutMs,
    );
  }

  subscribe(listener: (update: RuntimeReactiveUpdate) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  cancelResource(resourceId: string) {
    this.clearResourceTimeout(resourceId);
    if (!this.stopped) {
      this.worker.postMessage({ type: 'cancel-resource', resourceId } satisfies MainToRuntimeMessage);
    }
  }

  terminate(reason = 'Script runtime terminated.') {
    if (this.stopped) return;
    this.stopped = true;
    this.worker.terminate();
    for (const controller of this.endowmentCalls.values()) controller.abort(reason);
    this.endowmentCalls.clear();
    for (const timeout of this.resourceTimeoutHandles.values()) clearTimeout(timeout);
    this.resourceTimeoutHandles.clear();
    this.failAll(new Error(reason));
  }

  private request<T>(
    createMessage: (requestId: number) => MainToRuntimeMessage,
    timeoutMs: number,
  ): Promise<T> {
    if (this.stopped) return Promise.reject(new Error('Script runtime is not available.'));
    const requestId = this.nextRequestId++;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        this.terminate(`Script runtime exceeded its ${timeoutMs} ms limit.`);
        reject(new Error(`Script runtime exceeded its ${timeoutMs} ms limit.`));
      }, timeoutMs);
      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
      this.worker.postMessage(createMessage(requestId));
    });
  }

  private settle(requestId: number, value: unknown, error?: string) {
    const request = this.pending.get(requestId);
    if (!request) return;
    this.pending.delete(requestId);
    clearTimeout(request.timeout);
    if (error) request.reject(new Error(error));
    else request.resolve(value);
  }

  private startResourceTimeout(id: string) {
    this.clearResourceTimeout(id);
    const timeoutMs = this.resourceTimeouts.get(id);
    if (!timeoutMs) return;
    this.resourceTimeoutHandles.set(id, setTimeout(() => {
      this.resourceTimeoutHandles.delete(id);
      this.terminate(`Async resource "${id}" exceeded its ${timeoutMs} ms limit.`);
    }, timeoutMs));
  }

  private clearResourceTimeout(id: string) {
    const timeout = this.resourceTimeoutHandles.get(id);
    if (timeout) clearTimeout(timeout);
    this.resourceTimeoutHandles.delete(id);
  }

  private publishReactiveUpdate(update: RuntimeReactiveUpdate) {
    if (update.kind === 'resource') {
      if (update.state.status === 'pending') this.startResourceTimeout(update.id);
      else this.clearResourceTimeout(update.id);
    }
    for (const listener of this.listeners) listener(update);
  }

  private async onMessage(message: RuntimeToMainMessage) {
    if (message.type === 'worker-ready') {
      this.resolveBootstrap({
        workerBootstrapMs: performance.now() - this.workerStarted,
        lockdownMs: message.lockdownMs,
      });
      return;
    }
    if (message.type === 'initialized') {
      this.settle(message.requestId, message.metrics);
      return;
    }
    if (message.type === 'state-updated') {
      this.settle(message.requestId, message.metrics);
      return;
    }
    if (message.type === 'result') {
      this.settle(message.requestId, {
        value: message.value,
        durationMs: message.durationMs,
      });
      return;
    }
    if (message.type === 'failure') {
      this.settle(message.requestId, undefined, message.error);
      return;
    }
    if (message.type === 'reactive-update') {
      this.publishReactiveUpdate(message.update);
      return;
    }
    if (message.type === 'endowment-cancel') {
      const controller = this.endowmentCalls.get(message.callId);
      if (controller) controller.abort('Host endowment call was superseded.');
      this.endowmentCalls.delete(message.callId);
      return;
    }

    const endowment = this.endowments[message.endowment];
    const method = endowment && Reflect.get(endowment, message.method, endowment);
    if (typeof method !== 'function' && !isContextualMethod(method)) {
      this.worker.postMessage({
        type: 'endowment-result',
        callId: message.callId,
        ok: false,
        error: `Host endowment method "${message.endowment}.${message.method}" is not available.`,
      } satisfies MainToRuntimeMessage);
      return;
    }

    const controller = new AbortController();
    this.endowmentCalls.set(message.callId, controller);
    try {
      const context: RuntimeEndowmentContext = {
        signal: controller.signal,
        definitionId: message.definitionId,
        sessionId: this.context.sessionId,
        pageId: this.context.pageId,
        tenantId: this.context.tenantId,
      };
      const value = isContextualMethod(method)
        ? await method.invoke(context, ...message.args)
        : await Reflect.apply(method, endowment, message.args);
      if (this.endowmentCalls.get(message.callId) !== controller) return;
      this.endowmentCalls.delete(message.callId);
      this.worker.postMessage({
        type: 'endowment-result',
        callId: message.callId,
        ok: true,
        value: cloneRuntimeValue(value),
      } satisfies MainToRuntimeMessage);
    } catch (error) {
      if (this.endowmentCalls.get(message.callId) !== controller) return;
      this.endowmentCalls.delete(message.callId);
      this.worker.postMessage({
        type: 'endowment-result',
        callId: message.callId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies MainToRuntimeMessage);
    }
  }

  private failAll(error: Error) {
    this.rejectBootstrap(error);
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}
