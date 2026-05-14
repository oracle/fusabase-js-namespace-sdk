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

import InMemoryPersistence from "./storage/in_memory.js";
import BrowserLocalPersistence from "./storage/local_storage.js";
import BrowserSessionPersistence from "./storage/session_storage.js";
import { persistenceType } from "./storage/storage_types.js";
import { IdTokenResult } from "../types/idtoken.js";

/**
 * Manages user persistence for authentication tokens using different storage mechanisms.
 */
export class PersistenceUserManager {
  /**
   * The persistence storage object.
   * @type {Object}
   */
  persistence = null;

  /**
   * The listener for persistence events.
   * @type {Object}
   */
  persistenceListener = null;

  /**
   * The key used for storing tokens.
   * @type {string}
   */
  token_key;

  /**
   * Initializes the PersistenceUserManager with a listener and a name for the token key.
   * It selects the best available persistence method: local, session, or in-memory.
   * @param {Object} listener - The listener for persistence events.
   * @param {string} name - The name used as the key for storing tokens.
   */
    constructor(listener, name) {
        this.token_key = name;
        this.persistence = new BrowserLocalPersistence();
        if (!this.persistence._isAvailable()) {
        this.persistence = new BrowserSessionPersistence();
        if (!this.persistence._isAvailable()) {
            this.persistence = new InMemoryPersistence();
        }
        }
        this.persistenceListener = listener;
    }

  /**
   * Parses the stored token string into an object, parsing the access_token as well.
   * @private
   * @param {string} tokens - The JSON string of tokens.
   * @returns {Object} The parsed tokens object.
   */
  #tokensParse(tokens) {
    tokens = JSON.parse(tokens);
    tokens.access_token = JSON.parse(tokens.access_token)
    return tokens;
  }

  /**
   * Stringifies the tokens object, stringifying the access_token first.
   * @private
   * @param {Object} tokens - The tokens object to stringify.
   * @returns {string} The JSON string of tokens.
   */
  #tokensStringify(tokens) {
    tokens.access_token = tokens.access_token.stringify();
    tokens = JSON.stringify(tokens);
    return tokens;
  }

  /**
   * Sets the persistence type and migrates existing tokens if necessary.
   * @param {string} persistence - The new persistence type (LOCAL, SESSION, or NONE).
   * @returns {Promise<void>}
   */
  async setPersistence(persistence) {
    var token_stringify = null;
    if (persistence === this.persistence.type) {
      return;
    }
    var tokens = await this.persistence._get(this.token_key);

    if (tokens) {
      await this.persistence._remove(this.token_key);
      tokens = this.#tokensParse(tokens);
      const temp_access_token = new IdTokenResult(tokens.access_token.token)
      tokens.access_token = new IdTokenResult(tokens.access_token.token);

      token_stringify = {
        access_token: temp_access_token,
        refresh_token: tokens.refresh_token,
      }
      token_stringify = this.#tokensStringify(token_stringify);
    }

    if (persistence === persistenceType.LOCAL) {
      this.persistence = new BrowserLocalPersistence();
      if (tokens) {
        await this.persistence._set(this.token_key, tokens);
        this.persistenceListener.postMessage({
          name: "login_local",
          tokens: token_stringify,
        });
      }
    }
    else if (persistence === persistenceType.SESSION) {
      this.persistence = new BrowserSessionPersistence();
      if (tokens) {
        await this.persistence._set(this.token_key, tokens);
        this.persistenceListener.postMessage({
          name: "login_session_none",
          tokens: token_stringify,
        });
      }
    }
    else {
      this.persistence = new InMemoryPersistence();
      if (tokens) {
        await this.persistence._set(this.token_key, tokens);
        this.persistenceListener.postMessage({
          name: "login_session_none",
          tokens: token_stringify,
        });
      }
    }
  }
}
