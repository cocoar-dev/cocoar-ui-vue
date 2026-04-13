/**
 * IndexedDB-backed storage for AG Grid column state.
 *
 * Column states are keyed by a grid identifier + width bucket so that
 * different container widths (monitor switch, sidebar collapse) each
 * get their own persisted layout.
 *
 * Each entry stores `{ state, lastAccessedAt }`. The timestamp is updated
 * on every read and write, enabling time-based cleanup of stale entries.
 */

const DB_NAME = 'coar-grid-settings';
const STORE_NAME = 'column-states';
const DB_VERSION = 1;

/** Internal storage format */
interface StoredEntry {
  state: unknown[];
  lastAccessedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function storeKey(gridKey: string, bucket: number): string {
  return `${gridKey}:${bucket}`;
}

function parseEntry(raw: unknown): StoredEntry | null {
  if (!raw) return null;
  const entry = raw as Partial<StoredEntry>;
  if (entry.state && Array.isArray(entry.state)) return entry as StoredEntry;
  return null;
}

export async function loadColumnState(gridKey: string, bucket: number): Promise<unknown[] | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const key = storeKey(gridKey, bucket);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = parseEntry(request.result);
        if (!entry) { resolve(null); return; }
        // Touch lastAccessedAt on read
        store.put({ state: entry.state, lastAccessedAt: Date.now() } satisfies StoredEntry, key);
        resolve(entry.state);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveColumnState(gridKey: string, bucket: number, state: unknown[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(
      { state, lastAccessedAt: Date.now() } satisfies StoredEntry,
      storeKey(gridKey, bucket),
    );
  } catch {
    // IndexedDB unavailable — silently ignore
  }
}

export async function getSavedBuckets(gridKey: string): Promise<number[]> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const prefix = `${gridKey}:`;
        const buckets = (request.result as string[])
          .filter((k) => typeof k === 'string' && k.startsWith(prefix))
          .map((k) => parseInt(k.slice(prefix.length), 10))
          .filter((n) => !isNaN(n));
        resolve(buckets);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteColumnState(gridKey: string, bucket: number): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(storeKey(gridKey, bucket));
  } catch {
    // silently ignore
  }
}

export async function deleteAllColumnStates(gridKey: string): Promise<void> {
  try {
    const buckets = await getSavedBuckets(gridKey);
    if (buckets.length === 0) return;
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const bucket of buckets) {
      store.delete(storeKey(gridKey, bucket));
    }
  } catch {
    // silently ignore
  }
}

/**
 * Remove column state entries that haven't been read or written
 * within the specified number of days.
 *
 * Call once at application startup to prevent unbounded growth.
 *
 * @param maxAgeDays - Maximum age in days. Entries older than this are deleted.
 * @returns Number of deleted entries.
 *
 * @example
 * ```ts
 * // main.ts — clean up entries older than 6 months
 * import { cleanupColumnStates } from '@cocoar/vue-data-grid';
 * cleanupColumnStates(180);
 * ```
 */
export async function cleanupColumnStates(maxAgeDays: number): Promise<number> {
  try {
    const db = await openDb();
    const cutoff = Date.now() - maxAgeDays * 86_400_000;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      let deleted = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { resolve(deleted); return; }

        const entry = parseEntry(cursor.value);
        if (!entry || entry.lastAccessedAt < cutoff) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      };
      request.onerror = () => resolve(deleted);
    });
  } catch {
    return 0;
  }
}

export function toBucket(width: number, bucketSize: number): number {
  return Math.round(width / bucketSize) * bucketSize;
}

export function findNearestBucket(target: number, savedBuckets: number[]): number | null {
  if (savedBuckets.length === 0) return null;
  let nearest = savedBuckets[0];
  let minDist = Math.abs(target - nearest);
  for (const b of savedBuckets) {
    const dist = Math.abs(target - b);
    if (dist < minDist) {
      nearest = b;
      minDist = dist;
    }
  }
  return nearest;
}

// ── Cross-instance sync ─────────────────────────────────────────────

export type ColumnStateListener = (state: unknown[], senderId: number) => void;

let nextInstanceId = 1;
const listeners = new Map<string, Map<number, ColumnStateListener>>();

/** Generate a unique instance ID for a grid builder */
export function createPersistenceInstanceId(): number {
  return nextInstanceId++;
}

/** Subscribe to column state changes from other grids with the same key */
export function onColumnStateChanged(
  gridKey: string,
  instanceId: number,
  listener: ColumnStateListener,
): () => void {
  if (!listeners.has(gridKey)) {
    listeners.set(gridKey, new Map());
  }
  listeners.get(gridKey)!.set(instanceId, listener);

  return () => {
    const keyListeners = listeners.get(gridKey);
    if (keyListeners) {
      keyListeners.delete(instanceId);
      if (keyListeners.size === 0) listeners.delete(gridKey);
    }
  };
}

/** Notify other grids with the same key about a column state change */
export function broadcastColumnState(gridKey: string, senderId: number, state: unknown[]): void {
  const keyListeners = listeners.get(gridKey);
  if (!keyListeners) return;
  for (const [id, listener] of keyListeners) {
    if (id !== senderId) listener(state, senderId);
  }
}
