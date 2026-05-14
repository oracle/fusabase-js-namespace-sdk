// Copyright (c) 2015, 2026, Oracle and/or its affiliates.
//
//-----------------------------------------------------------------------------
//
// Minimal IndexedDB wrapper used by App Check.
//
// Notes:
// - Browser-only. In Node environments (no `indexedDB`) this becomes a no-op.
// - Intentionally small (no external deps).
//
//-----------------------------------------------------------------------------

const DB_NAME = 'fusabase-app-trust';
const DB_VERSION = 1;
const STORE_NAME = 'tokens';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined' && indexedDB != null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
}

export async function idbGetAppCheckToken(key) {
  if (!hasIndexedDb()) return undefined;
  const result = await withStore('readonly', (store) => store.get(key));
  if (!result || typeof result !== 'object') return undefined;
  return result;
}

export async function idbSetAppCheckToken(key, value) {
  if (!hasIndexedDb()) return;
  await withStore('readwrite', (store) => store.put(value, key));
}

export async function idbRemoveAppCheckToken(key) {
  if (!hasIndexedDb()) return;
  await withStore('readwrite', (store) => store.delete(key));
}
