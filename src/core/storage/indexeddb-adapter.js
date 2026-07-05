/**
 * indexeddb-adapter.js — the local IndexedDB implementation of
 * StorageAdapter. This is the default (and currently only) backend.
 *
 * Design notes:
 * - DB versioning: bump DB_VERSION only to ADD stores or indexes in
 *   `upgrade()`. Never rename or drop a store that shipped — stored
 *   data must stay backward compatible (PROJECT_RULES).
 * - Every store uses keyPath 'id': records are plain objects that
 *   carry their own identity, which keeps export/import trivial and
 *   mirrors the content system's "stable IDs" discipline.
 * - All IDB callbacks are wrapped in promises here, once, so the rest
 *   of the app never sees an IDBRequest.
 */

import { StorageAdapter, StorageError, STORES } from './storage-adapter.js';

const DB_NAME = 'cat-os';
const DB_VERSION = 2; // v2 (app 0.6.0): adds the 'learning' store, additively

export class IndexedDBAdapter extends StorageAdapter {
  #db = null;

  async init() {
    if (this.#db) return; // idempotent
    if (!('indexedDB' in globalThis)) {
      throw new StorageError('IndexedDB is not available in this browser.');
    }
    this.#db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => this.#upgrade(req.result);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () =>
        reject(new StorageError('Could not open local storage.', { cause: req.error }));
      req.onblocked = () =>
        reject(new StorageError('Local storage is blocked by another open tab.'));
    });
    // If a future version of the app upgrades the DB in another tab,
    // close here so that upgrade isn't blocked forever.
    this.#db.onversionchange = () => { this.#db.close(); this.#db = null; };
  }

  /** Runs inside onupgradeneeded. Creates whichever STORES are missing,
   *  so the same loop carries v1 (three stores) and v2 (+ learning). */
  #upgrade(db) {
    for (const name of Object.values(STORES)) {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, { keyPath: 'id' });
      }
    }
  }

  /** Promise wrapper around one transaction on one store. */
  #tx(store, mode, run) {
    if (!this.#db) {
      return Promise.reject(new StorageError('Storage used before init().'));
    }
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = this.#db.transaction(store, mode);
      } catch (err) {
        reject(new StorageError(`Unknown store "${store}".`, { cause: err }));
        return;
      }
      const req = run(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () =>
        reject(new StorageError(`Storage ${mode} failed on "${store}".`, { cause: req.error }));
    });
  }

  get(store, key)     { return this.#tx(store, 'readonly',  (s) => s.get(key)); }
  put(store, record)  { return this.#tx(store, 'readwrite', (s) => s.put(record)); }
  delete(store, key)  { return this.#tx(store, 'readwrite', (s) => s.delete(key)); }
  getAll(store)       { return this.#tx(store, 'readonly',  (s) => s.getAll()); }
  clear(store)        { return this.#tx(store, 'readwrite', (s) => s.clear()); }
}
