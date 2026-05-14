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

import { persistenceType } from "./storage_types.js";

/**
 * Provides session storage persistence for authentication data in the browser.
 */
class BrowserSessionPersistence {
  /**
   * The type of persistence.
   * @type {string}
   */
  type = persistenceType.SESSION;

  /**
   * Key prefix for storage.
   * @type {string}
   */
  storagekey = "__ORACLE";

  /**
   * Internal reference to window.sessionStorage.
   * @private
   * @type {Storage}
   */
  #storage = null;

  /**
   * Constructor for BrowserSessionPersistence.
   */
  constructor() {
    this.#storage = window.sessionStorage;
  }

  /**
   * Checks if session storage is available.
   * @returns {boolean} True if available, false otherwise.
   */
  _isAvailable() {
    try {
      this.#storage.setItem(this.storagekey, '1');
      this.#storage.removeItem(this.storagekey);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Sets a value in session storage.
   * @param {string} key - The key to set.
   * @param {Object} value - The value to store.
   * @returns {Promise<boolean>} True if successful.
   * @throws {Error} If an error occurs.
   */
  async _set(key, value) {
    const t = value.access_token.stringify();
    value.access_token = t;
    value = JSON.stringify(value);
    try {
      this.#storage.setItem(key, value);
    } catch (err) {
      throw err;
    }
    return true;
  }

  /**
   * Gets a value from session storage.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<string|null>} The stored value or null.
   * @throws {Error} If an error occurs.
   */
  async _get(key) {
    var value = null;
    try {
      value = this.#storage.getItem(key);
    } catch (err) {
      throw err;
    }
    if (!value) {
      return null;
    }
    return value;
  }

  /**
   * Removes a value from session storage.
   * @param {string} key - The key to remove.
   * @returns {Promise<boolean>} True if successful.
   * @throws {Error} If an error occurs.
   */
  async _remove(key) {
    try {
      this.#storage.removeItem(key);
    } catch (err) {
      throw err;
    }
    return true;
  }
}

export default BrowserSessionPersistence;
