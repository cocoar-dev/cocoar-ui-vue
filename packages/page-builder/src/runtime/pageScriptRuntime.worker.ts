import 'ses';
import type {
  MainToRuntimeMessage,
  RuntimeBindingDefinition,
  RuntimeDefinition,
  RuntimeEndowmentDescriptor,
  RuntimeEndowmentGrants,
  RuntimePath,
  RuntimeReactiveUpdate,
  RuntimeResourceDefinition,
  RuntimeResourceState,
  RuntimeScriptDefinition,
  RuntimeStatePatch,
  RuntimeStateUpdateMetrics,
  RuntimeToMainMessage,
  RuntimeValue,
} from './runtimeProtocol';
import { cloneRuntimeValue } from './runtimeProtocol';

type ScriptEndowments = Readonly<Record<string, unknown>>;
type ScriptFunction = (input: RuntimeValue, endowments?: ScriptEndowments) => unknown;
type ScopeFunction = (scope: RuntimeValue) => unknown;

interface BindingRuntime {
  definition: RuntimeBindingDefinition;
  evaluate: ScopeFunction;
  dependencies: RuntimePath[];
  hasRun: boolean;
}

interface ResourceRuntime {
  definition: RuntimeResourceDefinition;
  selectInputs: ScopeFunction;
  run: ScriptFunction;
  dependencies: RuntimePath[];
  hasInputs: boolean;
  input?: RuntimeValue;
  state: RuntimeResourceState;
  generation: number;
  timer?: ReturnType<typeof setTimeout>;
  activeOwnerId?: string;
}

interface EndowmentCall {
  ownerId: string;
  resolve: (value: RuntimeValue) => void;
  reject: (reason: Error) => void;
}

const MAX_SOURCE_LENGTH = 50_000;
const MAX_DEBOUNCE_MS = 60_000;
const MAX_REACTIVE_PASSES = 100;
const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

const lockdownStarted = performance.now();
lockdown();
const lockdownMs = performance.now() - lockdownStarted;

let nextEndowmentCallId = 1;
const endowmentCalls = new Map<number, EndowmentCall>();
const activeEndowmentOwners = new Set<string>();
let scripts = new Map<string, ScriptFunction>();
let bindings = new Map<string, BindingRuntime>();
let resources = new Map<string, ResourceRuntime>();
let endowmentDescriptors = new Map<string, RuntimeEndowmentDescriptor>();
let endowmentGrants = new Map<string, readonly string[]>();
let state: RuntimeValue = Object.create(null) as RuntimeValue;

function post(message: RuntimeToMainMessage) {
  self.postMessage(message);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown script runtime error.');
}

function assertDefinitionId(id: string, ids: Set<string>) {
  if (!id) throw new Error('Every runtime definition requires an id.');
  if (ids.has(id)) throw new Error(`Duplicate runtime definition id "${id}".`);
  ids.add(id);
}

function assertSource(id: string, source: string) {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(`Script "${id}" exceeds the source length limit.`);
  }
}

function compileFunction<T>(
  compartment: Compartment,
  id: string,
  source: string,
): T {
  assertSource(id, source);
  const value = compartment.evaluate(`(${source}\n)`);
  if (typeof value !== 'function') {
    throw new Error(`Script "${id}" must evaluate to a function.`);
  }
  return harden(value as T);
}

function makeEndowments(definitionId: string, ownerId: string): ScriptEndowments | undefined {
  const grants = endowmentGrants.get(definitionId);
  if (!grants?.length) return undefined;
  activeEndowmentOwners.add(ownerId);
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const name of grants) {
    const descriptor = endowmentDescriptors.get(name);
    if (!descriptor) throw new Error(`Unknown host endowment "${name}".`);
    const facade: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [member, value] of Object.entries(descriptor.values)) {
      facade[member] = harden(cloneRuntimeValue(value));
    }
    for (const method of descriptor.methods) {
      facade[method] = harden((...args: unknown[]): Promise<RuntimeValue> => {
        if (!activeEndowmentOwners.has(ownerId)) {
          return Promise.reject(new Error('These host endowments are no longer active.'));
        }
        const callId = nextEndowmentCallId++;
        const safeArgs = args.map((arg) => cloneRuntimeValue(arg));
        const callResult = new Promise<RuntimeValue>((resolve, reject) => {
          endowmentCalls.set(callId, { ownerId, resolve, reject });
        });
        post({
          type: 'endowment-call',
          callId,
          ownerId,
          definitionId,
          endowment: name,
          method,
          args: safeArgs,
        });
        return callResult;
      });
    }
    result[name] = harden(facade);
  }
  return harden(result);
}

function cancelOwner(ownerId: string, reason = 'Async resource was superseded.') {
  activeEndowmentOwners.delete(ownerId);
  for (const [callId, pending] of endowmentCalls) {
    if (pending.ownerId !== ownerId) continue;
    endowmentCalls.delete(callId);
    pending.reject(new Error(reason));
    post({ type: 'endowment-cancel', callId });
  }
}

function pathKey(path: RuntimePath): string {
  return JSON.stringify(path);
}

function isPathPrefix(prefix: RuntimePath, path: RuntimePath): boolean {
  return prefix.length <= path.length && prefix.every((part, index) => part === path[index]);
}

function pathsIntersect(left: RuntimePath, right: RuntimePath): boolean {
  return isPathPrefix(left, right) || isPathPrefix(right, left);
}

function dependsOnAny(dependencies: RuntimePath[], changedPaths: RuntimePath[]): boolean {
  return changedPaths.some((changed) =>
    dependencies.some((dependency) => pathsIntersect(dependency, changed)),
  );
}

function finalizeDependencies(accessed: Map<string, RuntimePath>): RuntimePath[] {
  const paths = [...accessed.values()];
  // Intermediate reads (`fields`, `fields.userName`) are necessary to reach a
  // leaf but are not separate dependencies. Parent replacement still matches
  // the leaf through prefix intersection.
  return paths.filter((candidate) =>
    !paths.some((other) =>
      other.length > candidate.length && isPathPrefix(candidate, other),
    ),
  );
}

function createTrackingScope(value: RuntimeValue): {
  scope: RuntimeValue;
  dependencies: () => RuntimePath[];
} {
  const accessed = new Map<string, RuntimePath>();

  const track = (path: RuntimePath) => {
    if (path.length > 0) accessed.set(pathKey(path), path);
  };

  const wrap = (current: RuntimeValue, path: RuntimePath): RuntimeValue => {
    if (!current || typeof current !== 'object') return current;
    return new Proxy(current, {
      get(target, property, receiver) {
        const next = Reflect.get(target, property, receiver) as RuntimeValue;
        if (typeof property === 'string' && typeof next !== 'function') {
          const nextPath = [...path, property];
          track(nextPath);
          return wrap(next, nextPath);
        }
        return next;
      },
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (!descriptor || typeof property !== 'string' || !('value' in descriptor)) {
          return descriptor;
        }
        const nextPath = [...path, property];
        track(nextPath);
        return { ...descriptor, value: wrap(descriptor.value as RuntimeValue, nextPath) };
      },
      ownKeys(target) {
        track(path);
        return Reflect.ownKeys(target);
      },
      set() { throw new TypeError('Runtime scope is read-only.'); },
      defineProperty() { throw new TypeError('Runtime scope is read-only.'); },
      deleteProperty() { throw new TypeError('Runtime scope is read-only.'); },
      setPrototypeOf() { throw new TypeError('Runtime scope is read-only.'); },
      preventExtensions() { throw new TypeError('Runtime scope is read-only.'); },
    }) as RuntimeValue;
  };

  return {
    scope: wrap(value, []),
    dependencies: () => finalizeDependencies(accessed),
  };
}

function resourceStates(): RuntimeValue {
  const result: Record<string, RuntimeValue> = Object.create(null) as Record<string, RuntimeValue>;
  for (const [id, resource] of resources) result[id] = cloneRuntimeValue(resource.state);
  return result;
}

function scopeSnapshot(): RuntimeValue {
  const safeState = cloneRuntimeValue(state);
  if (!safeState || typeof safeState !== 'object' || Array.isArray(safeState)) {
    throw new Error('Reactive runtime state must be a plain object.');
  }
  const scope = safeState as Record<string, RuntimeValue>;
  // `resources` is runtime-owned and cannot be injected by page state.
  scope.resources = resourceStates();
  return scope;
}

function runtimeValuesEqual(left: RuntimeValue, right: RuntimeValue): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => runtimeValuesEqual(entry, right[index]));
  }
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length && leftEntries.every(([key, value]) =>
    Object.hasOwn(right, key) && runtimeValuesEqual(value, right[key]),
  );
}

function emitUpdate(update: RuntimeReactiveUpdate) {
  post({ type: 'reactive-update', update });
}

let queuedChanges: RuntimePath[] = [];
let processingChanges = false;
let activeMetrics: RuntimeStateUpdateMetrics | undefined;

function setResourceState(resource: ResourceRuntime, nextState: RuntimeResourceState, durationMs?: number) {
  resource.state = nextState;
  emitUpdate({
    kind: 'resource',
    id: resource.definition.id,
    state: cloneRuntimeValue(nextState) as unknown as RuntimeResourceState,
    dependencies: resource.dependencies,
    durationMs,
  });
  notifyChanges([['resources', resource.definition.id]]);
}

function scheduleResource(resource: ResourceRuntime, input: RuntimeValue) {
  resource.generation += 1;
  const runId = resource.generation;
  if (resource.timer) clearTimeout(resource.timer);
  if (resource.activeOwnerId) cancelOwner(resource.activeOwnerId);
  resource.activeOwnerId = undefined;

  setResourceState(resource, {
    status: 'pending',
    value: resource.state.value,
    runId,
  });

  const debounceMs = Math.min(
    MAX_DEBOUNCE_MS,
    Math.max(0, resource.definition.debounceMs ?? 0),
  );
  resource.timer = setTimeout(() => {
    resource.timer = undefined;
    if (runId !== resource.generation) return;
    const ownerId = `resource:${resource.definition.id}:${runId}`;
    resource.activeOwnerId = ownerId;
    const started = performance.now();

    let result: unknown;
    try {
      result = resource.run(
        harden(cloneRuntimeValue(input)),
        makeEndowments(resource.definition.id, ownerId),
      );
    } catch (error) {
      result = Promise.reject(error);
    }

    void Promise.resolve(result).then(
      (value) => {
        if (runId !== resource.generation) return;
        cancelOwner(ownerId, 'Async resource completed.');
        resource.activeOwnerId = undefined;
        setResourceState(resource, {
          status: 'success',
          value: cloneRuntimeValue(value),
          runId,
        }, performance.now() - started);
      },
      (error) => {
        if (runId !== resource.generation) return;
        cancelOwner(ownerId, 'Async resource failed.');
        resource.activeOwnerId = undefined;
        setResourceState(resource, {
          status: 'error',
          error: errorMessage(error),
          runId,
        }, performance.now() - started);
      },
    );
  }, debounceMs);
}

function evaluateResourceInputs(resource: ResourceRuntime, snapshot: RuntimeValue) {
  const tracked = createTrackingScope(snapshot);
  const input = cloneRuntimeValue(resource.selectInputs(tracked.scope));
  resource.dependencies = tracked.dependencies();
  const changed = !resource.hasInputs || !runtimeValuesEqual(resource.input, input);
  resource.hasInputs = true;
  resource.input = input;
  activeMetrics?.evaluatedResourceInputs.push(resource.definition.id);
  if (changed) scheduleResource(resource, input);
}

function evaluateBinding(binding: BindingRuntime, snapshot: RuntimeValue) {
  const started = performance.now();
  const tracked = createTrackingScope(snapshot);
  const value = cloneRuntimeValue(binding.evaluate(tracked.scope));
  binding.dependencies = tracked.dependencies();
  binding.hasRun = true;
  activeMetrics?.evaluatedBindings.push(binding.definition.id);
  emitUpdate({
    kind: 'binding',
    id: binding.definition.id,
    value,
    dependencies: binding.dependencies,
    durationMs: performance.now() - started,
  });
}

function notifyChanges(paths: RuntimePath[]) {
  queuedChanges.push(...paths);
  if (processingChanges) return;
  processingChanges = true;
  let pass = 0;
  try {
    while (queuedChanges.length > 0) {
      pass += 1;
      if (pass > MAX_REACTIVE_PASSES) {
        throw new Error('Reactive runtime exceeded its cascading update limit.');
      }
      const changedPaths = queuedChanges;
      queuedChanges = [];
      const snapshot = scopeSnapshot();

      for (const resource of resources.values()) {
        if (!resource.hasInputs || dependsOnAny(resource.dependencies, changedPaths)) {
          evaluateResourceInputs(resource, snapshot);
        }
      }
      for (const binding of bindings.values()) {
        if (!binding.hasRun || dependsOnAny(binding.dependencies, changedPaths)) {
          evaluateBinding(binding, snapshot);
        }
      }
    }
  } finally {
    processingChanges = false;
  }
}

function applyPatch(root: RuntimeValue, patch: RuntimeStatePatch) {
  if (!patch.path.length) throw new Error('Runtime state patches require a non-empty path.');
  if (patch.path.some((part) => !part || FORBIDDEN_PATH_SEGMENTS.has(part))) {
    throw new Error('Runtime state patch contains an invalid path.');
  }
  if (!root || typeof root !== 'object') throw new Error('Runtime state must be an object.');

  let parent = root as Record<string, RuntimeValue>;
  for (const part of patch.path.slice(0, -1)) {
    const next = parent[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      throw new Error(`Runtime state patch parent "${part}" does not exist.`);
    }
    parent = next as Record<string, RuntimeValue>;
  }
  const property = patch.path[patch.path.length - 1]!;
  if (patch.op === 'delete') delete parent[property];
  else parent[property] = cloneRuntimeValue(patch.value);
}

function updateState(requestId: number, nextState?: RuntimeValue, patches?: RuntimeStatePatch[]) {
  const started = performance.now();
  const metrics: RuntimeStateUpdateMetrics = {
    durationMs: 0,
    evaluatedBindings: [],
    evaluatedResourceInputs: [],
  };
  try {
    if (nextState !== undefined) state = cloneRuntimeValue(nextState);
    const changedPaths: RuntimePath[] = nextState !== undefined ? [[]] : [];
    for (const patch of patches ?? []) {
      applyPatch(state, patch);
      changedPaths.push(patch.path);
    }
    activeMetrics = metrics;
    if (changedPaths.length > 0) notifyChanges(changedPaths);
    metrics.durationMs = performance.now() - started;
    post({ type: 'state-updated', requestId, metrics });
  } catch (error) {
    post({ type: 'failure', requestId, error: errorMessage(error) });
  } finally {
    activeMetrics = undefined;
  }
}

function cancelResource(resourceId: string) {
  const resource = resources.get(resourceId);
  if (!resource) return;
  resource.generation += 1;
  if (resource.timer) clearTimeout(resource.timer);
  if (resource.activeOwnerId) cancelOwner(resource.activeOwnerId, 'Async resource was cancelled.');
  resource.timer = undefined;
  resource.activeOwnerId = undefined;
  setResourceState(resource, { status: 'idle', runId: resource.generation });
}

async function initialize(
  requestId: number,
  definitions: RuntimeDefinition[],
  descriptors: RuntimeEndowmentDescriptor[],
  grants: RuntimeEndowmentGrants,
) {
  try {
    for (const resource of resources.values()) {
      if (resource.timer) clearTimeout(resource.timer);
      if (resource.activeOwnerId) cancelOwner(resource.activeOwnerId);
    }

    const compartmentStarted = performance.now();
    // SES keeps eval/Function confined to the compartment, but the public page
    // contract is stricter: tenant code must not dynamically compile source at
    // all. Shadow both globals explicitly instead of merely relying on SES'
    // confinement semantics.
    const compartment = new Compartment({ eval: undefined, Function: undefined });
    harden(compartment.globalThis);
    const compartmentMs = performance.now() - compartmentStarted;

    const compileStarted = performance.now();
    const ids = new Set<string>();
    const nextScripts = new Map<string, ScriptFunction>();
    const nextBindings = new Map<string, BindingRuntime>();
    const nextResources = new Map<string, ResourceRuntime>();
    const nextEndowmentDescriptors = new Map<string, RuntimeEndowmentDescriptor>();
    const nextEndowmentGrants = new Map<string, readonly string[]>();

    for (const descriptor of descriptors) {
      if (!descriptor.name || FORBIDDEN_PATH_SEGMENTS.has(descriptor.name)) {
        throw new Error('Host endowment has an invalid name.');
      }
      if (nextEndowmentDescriptors.has(descriptor.name)) {
        throw new Error(`Duplicate host endowment "${descriptor.name}".`);
      }
      const memberNames = [...descriptor.methods, ...Object.keys(descriptor.values)];
      if (memberNames.some((name) => !name || FORBIDDEN_PATH_SEGMENTS.has(name)) ||
        new Set(memberNames).size !== memberNames.length) {
        throw new Error(`Host endowment "${descriptor.name}" has invalid members.`);
      }
      nextEndowmentDescriptors.set(descriptor.name, {
        name: descriptor.name,
        methods: [...descriptor.methods],
        values: cloneRuntimeValue(descriptor.values) as Record<string, RuntimeValue>,
      });
    }

    for (const [definitionId, endowmentNames] of Object.entries(grants)) {
      if (!Array.isArray(endowmentNames) || endowmentNames.some((id) => typeof id !== 'string' || !id)) {
        throw new Error(`Endowment grants for "${definitionId}" are malformed.`);
      }
      if (endowmentNames.some((name) => !nextEndowmentDescriptors.has(name))) {
        throw new Error(`Endowment grants for "${definitionId}" reference an unknown object.`);
      }
      nextEndowmentGrants.set(definitionId, harden([...new Set(endowmentNames)]));
    }

    for (const definition of definitions) {
      assertDefinitionId(definition.id, ids);
      if (definition.kind === 'binding') {
        nextBindings.set(definition.id, {
          definition,
          evaluate: compileFunction<ScopeFunction>(compartment, definition.id, definition.source),
          dependencies: [],
          hasRun: false,
        });
      } else if (definition.kind === 'resource') {
        nextResources.set(definition.id, {
          definition,
          selectInputs: compileFunction<ScopeFunction>(
            compartment,
            `${definition.id}.inputs`,
            definition.inputsSource,
          ),
          run: compileFunction<ScriptFunction>(compartment, definition.id, definition.source),
          dependencies: [],
          hasInputs: false,
          state: { status: 'idle', runId: 0 },
          generation: 0,
        });
      } else {
        const script = definition as RuntimeScriptDefinition;
        nextScripts.set(
          script.id,
          compileFunction<ScriptFunction>(compartment, script.id, script.source),
        );
      }
    }

    for (const [definitionId, grantedEndowments] of nextEndowmentGrants) {
      if (!ids.has(definitionId)) {
        throw new Error(`Endowments were granted to unknown definition "${definitionId}".`);
      }
      if (grantedEndowments.length > 0 && nextBindings.has(definitionId)) {
        throw new Error(`Bindings cannot receive host endowments ("${definitionId}").`);
      }
    }

    scripts = nextScripts;
    bindings = nextBindings;
    resources = nextResources;
    endowmentDescriptors = nextEndowmentDescriptors;
    endowmentGrants = nextEndowmentGrants;
    queuedChanges = [];
    const compileMs = performance.now() - compileStarted;
    post({
      type: 'initialized',
      requestId,
      metrics: {
        compartmentMs,
        compileMs,
        scriptCount: scripts.size,
        bindingCount: bindings.size,
        resourceCount: resources.size,
      },
    });
  } catch (error) {
    post({ type: 'failure', requestId, error: errorMessage(error) });
  }
}

async function invoke(requestId: number, scriptId: string, input: RuntimeValue) {
  const script = scripts.get(scriptId);
  if (!script) {
    post({ type: 'failure', requestId, error: `Unknown script "${scriptId}".` });
    return;
  }
  const ownerId = `invoke:${requestId}`;
  try {
    const started = performance.now();
    const value = await script(harden(input), makeEndowments(scriptId, ownerId));
    post({
      type: 'result',
      requestId,
      value: cloneRuntimeValue(value),
      durationMs: performance.now() - started,
    });
  } catch (error) {
    post({ type: 'failure', requestId, error: errorMessage(error) });
  } finally {
    cancelOwner(ownerId, 'Script invocation completed.');
  }
}

self.addEventListener('message', (event: MessageEvent<MainToRuntimeMessage>) => {
  const message = event.data;
  if (message.type === 'initialize') {
    void initialize(
      message.requestId,
      message.definitions,
      message.endowments,
      message.endowmentGrants,
    );
  } else if (message.type === 'invoke') {
    void invoke(message.requestId, message.scriptId, message.input);
  } else if (message.type === 'set-state') {
    updateState(message.requestId, message.state);
  } else if (message.type === 'patch-state') {
    updateState(message.requestId, undefined, message.patches);
  } else if (message.type === 'cancel-resource') {
    cancelResource(message.resourceId);
  } else if (message.type === 'endowment-result') {
    const pending = endowmentCalls.get(message.callId);
    if (!pending) return;
    endowmentCalls.delete(message.callId);
    if (message.ok) pending.resolve(harden(message.value));
    else pending.reject(new Error(message.error));
  }
});

post({ type: 'worker-ready', lockdownMs });
