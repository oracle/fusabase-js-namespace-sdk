// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

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
 * Provides in-memory persistence for authentication data.
 */
class InMemoryPersistence {
  /**
   * The type of persistence.
   * @type {string}
   */
  type = persistenceType.NONE;

  /**
   * Internal storage object.
   * @private
   * @type {Object}
   */
  #storage = {};

  /**
   * Key prefix for storage.
   * @type {string}
   */
  storagekey = "__ORACLE";

  /**
   * Constructor for InMemoryPersistence.
   */
  // constructor() { }

  /**
   * Checks if in-memory storage is available.
   * @returns {boolean} True if available, false otherwise.
   */
  _isAvailable() {
    try {
      this.#storage[`${this.storagekey}`] = 1;
      delete this.#storage[`${this.storagekey}`]
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Sets a value in in-memory storage.
   * @param {string} key - The key to set.
   * @param {Object} value - The value to store.
   * @returns {Promise<boolean>} True if successful.
   * @throws {Error} If an error occurs.
   */
  async _set(key, value) {
    try {
      const t = value.access_token.stringify();
      value.access_token = t;
      value = JSON.stringify(value);
      this.#storage[`${key}`] = value;
    } catch (err) {
      throw err;
    }
    return true;
  }

  /**
   * Gets a value from in-memory storage.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<string|null>} The stored value or null.
   * @throws {Error} If an error occurs.
   */
  async _get(key) {
    var value = null;
    try {
      value = this.#storage[`${key}`];
    } catch (err) {
      throw err;
    }
    if (!value) {
      return null;
    }
    return value;
  }

  /**
   * Removes a value from in-memory storage.
   * @param {string} key - The key to remove.
   * @returns {Promise<boolean|null>} True if removed, null if not found.
   * @throws {Error} If an error occurs.
   */
  async _remove(key) {
    try {
      var value = this.#storage[`${key}`];
      if (!value) {
        return null;
      }
      delete this.#storage[`${key}`]
    } catch (err) {
      throw err;
    }
    return true;
  }
}

export default InMemoryPersistence;
