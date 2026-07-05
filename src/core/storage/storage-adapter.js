/**
 * storage-adapter.js — the StorageAdapter interface.
 *
 * PROJECT RULE 6: no UI or module code may ever touch a storage backend
 * directly. All persistence flows through this interface. That single
 * discipline is what makes "add cloud sync later" a no-UI-change
 * operation: a CloudStorageAdapter implements these same methods.
 *
 * JavaScript has no native interfaces, so this is an abstract base
 * class: every method throws unless a subclass implements it. It also
 * centralizes the store-name constants so adapters and callers agree.
 */

/**
 * Object-store names. Grow this list only additively; renaming or
 * removing a store is a breaking schema change (see PROJECT_RULES —
 * backward compatibility of stored data).
 */
export const STORES = Object.freeze({
  SETTINGS: 'settings',   // key/value user preferences (theme, goals, …)
  ATTEMPTS: 'attempts',   // one record per answered question (V1.0+)
  SESSIONS: 'sessions',   // one record per practice session (V1.0+)
  LEARNING: 'learning',   // learning artifacts the user authors or earns:
                          // reflections today (0.6.0), notebook records next.
                          // Records keep a minimal shape {id, kind, …} so
                          // they never need migration (ROADMAP_V2 §5).
});

/** Error type all adapters throw, so callers can distinguish storage
 *  failures from programming errors. */
export class StorageError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = 'StorageError';
    if (cause) this.cause = cause;
  }
}

export class StorageAdapter {
  /** Open/prepare the backend. Must be called (and awaited) once
   *  before any other method. Safe to call twice. */
  async init() { throw new Error('StorageAdapter.init not implemented'); }

  /** @returns {Promise<any|undefined>} the record, or undefined if absent. */
  async get(store, key) { throw new Error('StorageAdapter.get not implemented'); }

  /** Insert or replace one record. The record must carry its own key
   *  field (see the adapter's keyPath configuration). */
  async put(store, record) { throw new Error('StorageAdapter.put not implemented'); }

  /** Delete one record by key. Resolves even if the key was absent. */
  async delete(store, key) { throw new Error('StorageAdapter.delete not implemented'); }

  /** @returns {Promise<any[]>} every record in the store. */
  async getAll(store) { throw new Error('StorageAdapter.getAll not implemented'); }

  /** Remove every record in the store. */
  async clear(store) { throw new Error('StorageAdapter.clear not implemented'); }
}
