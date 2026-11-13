// Copyright (c) 2015, 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------

import { getAppStorageScope } from "./storage-scope.js";
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

/**
 * The browser local-storage key used for the persisted SDK instance ID.
 *
 * @type {string}
 * @example
 * const instanceId = localStorage.getItem(FUSABASE_INSTANCE_ID_STORAGE_KEY);
 */
export const FUSABASE_INSTANCE_ID_STORAGE_KEY = 'fusabase_instance_id';

/**
 * Creates a cryptographically random instance ID.
 *
 * @returns {string} A UUID when `crypto.randomUUID()` is available, otherwise
 * a random hexadecimal identifier.
 * @throws {Error} When secure browser crypto is unavailable.
 *
 * @example
 * const instanceId = generateInstanceId();
 * @internal
 */
export function generateInstanceId() {
  try {
    const c = globalThis.crypto;
    if (c?.randomUUID) return String(c.randomUUID());
    if (c?.getRandomValues) {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // ignore
  }

  throw new Error('Unable to generate instance ID: crypto.getRandomValues is unavailable');
}

/**
 * Gets the browser's persisted instance ID, creating and persisting one when
 * needed. If local storage is unavailable, returns a new in-memory ID.
 *
 * @param {object} [app] - App whose browser-storage namespace owns the ID.
 * @returns {string} The existing or newly generated instance ID.
 * @throws {Error} When secure browser crypto is unavailable.
 *
 * @example
 * const instanceId = getOrCreateBrowserInstanceId();
 * @internal
 */
export function getOrCreateBrowserInstanceId(app) {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const storageKey = `${FUSABASE_INSTANCE_ID_STORAGE_KEY}:${getAppStorageScope(app)}`;
      const existing = ls.getItem(storageKey);
      if (existing) return existing;
      const created = generateInstanceId();
      ls.setItem(storageKey, created);
      return created;
    }
  } catch {
    // ignore
  }

  return generateInstanceId();
}
