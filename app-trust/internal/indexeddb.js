// Copyright (c) 2015, 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
