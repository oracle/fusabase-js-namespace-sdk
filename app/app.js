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

import auth from "../auth/auth.js";
import oracledb from "../oracledb/oracledb.js";
import storage from "../storage/storage.js";
import LogLevel from "../logger.js";
import fusabase from "../fusabase.js";

/**
 * Error raised by the Fusabase SDK when an application-level operation fails.
 *
 * @example
 * try {
 *   throw new app.FusabaseError('invalid-config', 'projectID is required');
 * } catch (error) {
 *   console.log(error.code); // "app/invalid-config"
 * }
 */
class FusabaseError extends Error {
  /**
   * Creates a new `FusabaseError` instance.
   *
   * @param {string} code - The error code.
   * @param {string} message - The error message.
   * @param {string} [stack] - The error stack.
   * @returns {FusabaseError} The constructed SDK error.
   *
   * @example
   * const error = new app.FusabaseError('not-found', 'App does not exist');
   * console.log(error.code); // "app/not-found"
   */
  constructor(code, message, stack) {
    super(message);
    this.code = 'app/' + code;
    this.name = 'FusabaseError';
    this.stack = stack;
  }
}

/**
 * A configured Fusabase application and the entry point for Auth, OracleDB,
 * and Storage services. Applications are normally created with
 * `fusabase.initializeApp()` rather than constructed directly.
 *
 * @example
 * const appInstance = fusabase.initializeApp(options, 'my-app');
 * const auth = appInstance.auth();
 */
class App {

  /**
   * @property {Object} options - The normalized application options supplied
   * when the application was created.
   */
  options = null;

  /**
   * @property {string} name - Application name.
   */
  name = "";

  /**
   * @property {Auth} #auth - Private authentication instance.
   */
  #auth = null;

  /**
   * @property {Oracledb} #oracledb - Private OracleDB instance.
   */
  #oracledb = null;

  /**
   * @property {Storage} #storage - Private storage instance.
   */
  #storage = null;

  /**
   * @property {LogLevel} #logLevel - Logging level.
   */
  #logLevel = LogLevel.SILENT;

  /**
   * @property {boolean} automaticDataCollectionEnabled - Flag for automatic data collection.
   */
  automaticDataCollectionEnabled = false;

  /**
   * @property {Object} #config - Private configuration object.
   */
  #config = null;

  /**
   * Gets the normalized service configuration for this application.
   *
   * @returns {Object|null} The initialized configuration, or `null` before
   * internal service initialization completes.
   *
   * @example
   * const config = appInstance.config;
   * console.log(config.storageBucket);
   */
  get config() {
    return this.#config
  }

  /**
   * Creates a new `App` instance.
   *
   * @param {Object} options - Normalized SDK options, including service,
   * project, authentication, and storage settings.
   * @param {string} name - A unique name for this application instance.
   * @returns {App} The constructed application instance.
   *
   * @example
   * const appInstance = new app.App({ projectID: 'project-1' }, 'my-app');
   */
  constructor(options, name) {
    this.options = options;
    this.name = name;
  }

  /**
   * Gets the authentication service associated with this application.
   *
   * @returns {Auth|null} The authentication instance, or `null` before the
   * app is initialized.
   *
   * @example
   * const auth = appInstance.auth();
   * await auth.signInWithEmailAndPassword('user@example.com', 'password');
   */
  auth() {
    return this.#auth;
  }

  /**
   * Gets the OracleDB service associated with this application.
   *
   * @returns {Oracledb|null} The OracleDB instance, or `null` before the app
   * is initialized.
   *
   * @example
   * const database = appInstance.oracledb();
   * const snapshot = await database.collection('users').get();
   */
  oracledb() {
    return this.#oracledb;
  }

  /**
   * Gets the Storage service associated with this application. The optional
   * URL is reserved for compatibility and is currently ignored.
   *
   * @param {string} [url=""] - Reserved storage URL; it does not change the
   * returned service.
   * @returns {Storage|null} The Storage instance, or `null` before the app is
   * initialized.
   *
   * @example
   * const storage = appInstance.storage();
   * const fileRef = storage.ref('images/logo.png');
   */
  // Ignoring input url for now..
  storage(url = "") {
    return this.#storage;
  }

  /**
   * Releases service references and removes this app from the SDK app registry.
   *
   * @returns {Promise<void>} A promise that resolves after the app is removed.
   *
   * @example
   * await appInstance.delete();
   */
  async delete() {
    this.#auth = null;
    this.#oracledb = null;
    this.#storage = null;
    fusabase._apps[this.name] = null;
  }

  /**
   * Gets the current SDK log level.
   *
   * @returns {LogLevel} The log level.
   *
   * @example
   * console.log(appInstance.logLevel); // "silent"
   */
  get logLevel() {
    return this.#logLevel;
  }

  /**
   * Sets the SDK log level for this application.
   *
   * @param {LogLevel} log - The new level: `"silent"`, `"error"`, or
   * `"debug"`.
   * @returns {void} This setter does not return a value.
   *
   * @example
   * appInstance.logLevel = app.LogLevel.DEBUG;
   */
  set logLevel(log) {
    this.#logLevel = log;
  }

  /**
   * Initializes the app after configuration.
   * @private
   */
  _intializeAfterConfig() {
    const config = {
      objsType: this.options.objsType,
      storageBucket: this.options.storageBucket,
      authType: this.options.authType,
      authID: this.options.authID,
      idcsDomainURL: this.options.idcsDomainURL,
      maxUploadBytes: this.options.maxUploadBytes
    }
    this.#config = config
    this.#auth = new auth.Auth(this);
    this.#oracledb = new oracledb.Oracledb(this);
    this.#storage = new storage.Storage(this);
  }

}

/**
 * Public application APIs exposed by this module.
 *
 * @type {{App: typeof App, FusabaseError: typeof FusabaseError, LogLevel: Object}}
 * @example
 * import app from './app/app.js';
 * const appInstance = fusabase.initializeApp(options);
 * appInstance.logLevel = app.LogLevel.DEBUG;
 */
var app = {
  App: App,
  FusabaseError: FusabaseError,
  LogLevel: LogLevel
};
export default app;
