import {
  PageScriptRuntime,
  type RuntimeEndowments,
  type RuntimeInvocation,
} from '#page-runtime-worker';
import type {
  RuntimeBootstrapMetrics,
  RuntimeDefinition,
  RuntimeEndowmentGrants,
  RuntimeInitializationMetrics,
  RuntimeReactiveUpdate,
  RuntimeStatePatch,
  RuntimeStateUpdateMetrics,
  RuntimeValue,
} from './runtimeProtocol';

/** Host-owned information used to decide which capabilities a definition receives. */
export interface PageRuntimeGrantContext {
  sessionId: string;
  pageId: string;
  tenantId?: string;
  definition: RuntimeDefinition;
}

export interface PageRuntimeHostOptions {
  /** Application-owned objects. Their implementations never enter the Worker. */
  endowments?: RuntimeEndowments;
  /** Application-owned policy. Tenant-authored documents cannot grant themselves authority. */
  grants?: (context: PageRuntimeGrantContext) => readonly string[];
}

export interface PageRuntimeSessionOptions {
  pageId: string;
  tenantId?: string;
  definitions: RuntimeDefinition[];
}

let nextSessionId = 1;

export class PageRuntimeSession {
  private initializing = false;
  private initialized = false;
  private disposed = false;

  readonly bootstrap: Promise<RuntimeBootstrapMetrics>;

  constructor(
    readonly sessionId: string,
    readonly pageId: string,
    readonly tenantId: string | undefined,
    private readonly definitions: RuntimeDefinition[],
    private readonly grants: RuntimeEndowmentGrants,
    private readonly runtime: PageScriptRuntime,
    private readonly release: (session: PageRuntimeSession) => void,
  ) {
    this.bootstrap = runtime.bootstrap;
  }

  async initialize(): Promise<RuntimeInitializationMetrics> {
    this.assertActive();
    if (this.initialized || this.initializing) {
      throw new Error(`Page runtime session "${this.sessionId}" is already initialized or initializing.`);
    }
    this.initializing = true;
    try {
      const metrics = await this.runtime.initialize(this.definitions, this.grants);
      this.initialized = true;
      return metrics;
    } finally {
      this.initializing = false;
    }
  }

  invoke<T extends RuntimeValue = RuntimeValue>(
    scriptId: string,
    input: unknown,
    timeoutMs = 1_000,
  ): Promise<RuntimeInvocation<T>> {
    this.assertReady();
    return this.runtime.invoke<T>(scriptId, input, timeoutMs);
  }

  setState(state: unknown, timeoutMs = 1_000): Promise<RuntimeStateUpdateMetrics> {
    this.assertReady();
    return this.runtime.setState(state, timeoutMs);
  }

  patchState(patches: RuntimeStatePatch[], timeoutMs = 1_000): Promise<RuntimeStateUpdateMetrics> {
    this.assertReady();
    return this.runtime.patchState(patches, timeoutMs);
  }

  subscribe(listener: (update: RuntimeReactiveUpdate) => void): () => void {
    this.assertActive();
    return this.runtime.subscribe(listener);
  }

  cancelResource(resourceId: string) {
    this.assertReady();
    this.runtime.cancelResource(resourceId);
  }

  dispose(reason = `Page runtime session "${this.sessionId}" was disposed.`) {
    if (this.disposed) return;
    this.disposed = true;
    this.runtime.terminate(reason);
    this.release(this);
  }

  private assertActive() {
    if (this.disposed) throw new Error(`Page runtime session "${this.sessionId}" is disposed.`);
  }

  private assertReady() {
    this.assertActive();
    if (!this.initialized) throw new Error(`Page runtime session "${this.sessionId}" is not initialized.`);
  }
}

export class PageRuntimeHost {
  private readonly endowments: RuntimeEndowments;
  private readonly grantPolicy: NonNullable<PageRuntimeHostOptions['grants']>;
  private readonly sessions = new Set<PageRuntimeSession>();

  constructor(options: PageRuntimeHostOptions) {
    this.endowments = options.endowments ?? {};
    this.grantPolicy = options.grants ?? (() => []);
  }

  get activeSessionCount(): number {
    return this.sessions.size;
  }

  createSession(options: PageRuntimeSessionOptions): PageRuntimeSession {
    if (!options.pageId) throw new Error('A PageRuntimeSession requires a pageId.');
    const sessionId = `${options.pageId}:${nextSessionId++}`;
    const grants: RuntimeEndowmentGrants = Object.create(null) as RuntimeEndowmentGrants;
    const grantedNames = new Set<string>();

    for (const definition of options.definitions) {
      const requested = [...new Set(this.grantPolicy({
        sessionId,
        pageId: options.pageId,
        tenantId: options.tenantId,
        definition,
      }))];
      if (definition.kind === 'binding' && requested.length > 0) {
        throw new Error(`Host policy must not grant endowments to binding "${definition.id}".`);
      }
      for (const name of requested) {
        if (!Object.hasOwn(this.endowments, name)) {
          throw new Error(`Host policy granted unknown endowment "${name}".`);
        }
        grantedNames.add(name);
      }
      if (requested.length > 0) grants[definition.id] = requested;
    }

    // The Worker learns only the union actually granted to this page. Objects
    // present in the application catalog but absent from this session's policy
    // are not even described across the boundary.
    const sessionEndowments: RuntimeEndowments = Object.create(null) as RuntimeEndowments;
    for (const name of grantedNames) sessionEndowments[name] = this.endowments[name]!;

    const runtime = new PageScriptRuntime(sessionEndowments, {
      sessionId,
      pageId: options.pageId,
      tenantId: options.tenantId,
    });
    const session = new PageRuntimeSession(
      sessionId,
      options.pageId,
      options.tenantId,
      [...options.definitions],
      grants,
      runtime,
      (released) => this.sessions.delete(released),
    );
    this.sessions.add(session);
    return session;
  }

  disposeAll(reason = 'Page runtime host was disposed.') {
    for (const session of [...this.sessions]) session.dispose(reason);
  }
}

/** Defines the application-wide host catalog; it does not create a Worker. */
export function definePageRuntimeHost(options: PageRuntimeHostOptions): PageRuntimeHost {
  return new PageRuntimeHost(options);
}
