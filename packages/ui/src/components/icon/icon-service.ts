import type { InjectionKey } from 'vue';

// ─── Size tokens ─────────────────────────────────────────────────────────────

export type CoarIconSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'auto';

export const PRESET_SIZES: ReadonlySet<string> = new Set(['xs', 's', 'm', 'l', 'xl', 'auto']);

// ─── Icon source interface ───────────────────────────────────────────────────

/**
 * A pluggable icon source that resolves icon names to SVG strings.
 *
 * Sources can be synchronous (map-based) or asynchronous (HTTP-based).
 */
export interface CoarIconSource {
  getIcon(name: string): string | null | Promise<string | null>;
  getAvailableIconKeys?(): readonly string[] | Promise<readonly string[]>;
  clearCache?(): void;
  clearIconCache?(name: string): void;
}

export interface CoarIconSourceEntry {
  readonly key: string;
  readonly source: CoarIconSource;
}

// ─── Injection key ───────────────────────────────────────────────────────────

export const COAR_ICON_SERVICE_KEY: InjectionKey<CoarIconService> = Symbol('CoarIconService');

export const COAR_BUILTIN_ICON_SOURCE_KEY = 'coar-builtin' as const;

// ─── Icon sources ────────────────────────────────────────────────────────────

/**
 * Map-based icon source. Resolves icons synchronously from a plain object.
 */
export class CoarIconMapSource implements CoarIconSource {
  constructor(private readonly icons: Readonly<Record<string, string>>) {}

  getIcon(name: string): string | null {
    return this.icons[name] ?? null;
  }

  getAvailableIconKeys(): readonly string[] {
    return Object.keys(this.icons).sort();
  }
}

/**
 * HTTP-based icon source. Fetches SVGs from URLs with built-in caching.
 */
export class CoarHttpIconSource implements CoarIconSource {
  private readonly cache = new Map<string, Promise<string | null>>();

  constructor(
    private readonly getUrl: (iconName: string) => string,
    private readonly fetchIconKeys?: () => Promise<readonly string[]>,
  ) {}

  getIcon(name: string): Promise<string | null> {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const request = fetch(this.getUrl(name))
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);

    this.cache.set(name, request);
    return request;
  }

  getAvailableIconKeys(): Promise<readonly string[]> {
    return this.fetchIconKeys?.() ?? Promise.resolve([]);
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearIconCache(name: string): void {
    this.cache.delete(name);
  }
}

// ─── Icon service ────────────────────────────────────────────────────────────

export interface CoarIconRegisteredSource {
  readonly key: string;
  readonly isDefault: boolean;
  readonly canProvideIconKeys: boolean;
}

/**
 * Manages icon sources and resolves icon names to SVG strings.
 *
 * Provided at the app level via `CoarIconPlugin` or `createCoarIconService()`.
 */
export class CoarIconService {
  private readonly sources = new Map<string, CoarIconSource>();
  private readonly sourcePriority: string[] = [];
  private defaultSourceKey: string = COAR_BUILTIN_ICON_SOURCE_KEY;

  registerSource(key: string, source: CoarIconSource): void {
    this.sources.set(key, source);
    if (!this.sourcePriority.includes(key)) {
      this.sourcePriority.push(key);
    }
  }

  setDefaultSource(key: string): void {
    if (!this.sources.has(key)) {
      throw new Error(
        `Cannot set default icon source "${key}": no source registered with that key.`,
      );
    }
    this.defaultSourceKey = key;
    // Move to front of priority list
    const idx = this.sourcePriority.indexOf(key);
    if (idx > 0) {
      this.sourcePriority.splice(idx, 1);
      this.sourcePriority.unshift(key);
    }
  }

  getIcon(name: string, sourceKey?: string): string | null | Promise<string | null> {
    if (sourceKey) {
      return this.getSourceOrThrow(sourceKey).getIcon(name);
    }
    return this.resolveWithFallback(name);
  }

  getRegisteredSources(): ReadonlyArray<CoarIconRegisteredSource> {
    return Array.from(this.sources.entries()).map(([key, source]) => ({
      key,
      isDefault: key === this.defaultSourceKey,
      canProvideIconKeys: typeof source.getAvailableIconKeys === 'function',
    }));
  }

  getAvailableIconKeys(
    sourceKey?: string,
  ): readonly string[] | Promise<readonly string[]> {
    if (sourceKey) {
      const source = this.sources.get(sourceKey);
      return source?.getAvailableIconKeys?.() ?? [];
    }

    // Aggregate keys from all sources
    const syncKeys: string[] = [];
    const asyncResults: Promise<readonly string[]>[] = [];

    for (const source of this.sources.values()) {
      const keys = source.getAvailableIconKeys?.();
      if (!keys) continue;
      if (keys instanceof Promise) {
        asyncResults.push(keys);
      } else {
        syncKeys.push(...keys);
      }
    }

    if (asyncResults.length === 0) {
      return [...new Set(syncKeys)].sort();
    }

    return Promise.all(asyncResults).then((results) => {
      const all = [...syncKeys, ...results.flat()];
      return [...new Set(all)].sort();
    });
  }

  clearCache(): void {
    for (const source of this.sources.values()) {
      source.clearCache?.();
    }
  }

  clearIconCache(name: string): void {
    for (const source of this.sources.values()) {
      source.clearIconCache?.(name);
    }
  }

  /**
   * Try each source in priority order. Return the first non-null result.
   * Handles mixed sync/async sources correctly by chaining promises
   * once the first async source is encountered.
   */
  private resolveWithFallback(name: string): string | null | Promise<string | null> {
    let asyncChain: Promise<string | null> | null = null;

    for (const key of this.sourcePriority) {
      const source = this.sources.get(key);
      if (!source) continue;

      if (asyncChain !== null) {
        const s = source;
        asyncChain = asyncChain.then((result) =>
          result !== null ? result : s.getIcon(name),
        );
      } else {
        const result = source.getIcon(name);
        if (result instanceof Promise) {
          asyncChain = result;
        } else if (result !== null) {
          return result;
        }
      }
    }

    return asyncChain ?? null;
  }

  private getSourceOrThrow(sourceKey: string): CoarIconSource {
    const source = this.sources.get(sourceKey);
    if (!source) {
      throw new Error(`Unknown icon source key: "${sourceKey}".`);
    }
    return source;
  }
}
