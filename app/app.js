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
 * FusabaseError - Custom error class for fusabase applications.
 */
class FusabaseError extends Error {
  /**
   * Creates a new `FusabaseError` instance.
   *
   * @param {string} code - The error code.
   * @param {string} message - The error message.
   * @param {string} [stack] - The error stack.
   */
  constructor(code, message, stack) {
    super(message);
    this.code = 'app/' + code;
    this.name = 'FusabaseError';
    this.stack = stack;
  }
}

/**
 * App - The main application class for fusabase.
 */
class App {

  /**
   * @property {Object} options - Application options.
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
   * Gets the application configuration.
   *
   * @returns {Object} The configuration object.
   */
  get config() {
    return this.#config
  }

  /**
   * Creates a new `App` instance.
   *
   * @param {Object} options - The options for the app.
   * @param {string} name - The name of the app.
   */
  constructor(options, name) {
    this.options = options;
    this.name = name;
  }

  /**
   * Gets the authentication instance.
   *
   * @returns {Auth} The authentication instance.
   */
  auth() {
    return this.#auth;
  }

  /**
   * Gets the OracleDB instance.
   *
   * @returns {Oracledb} The OracleDB instance.
   */
  oracledb() {
    return this.#oracledb;
  }

  /**
   * Gets the storage instance.
   *
   * @param {string} [url=""] - Optional URL for storage.
   * @returns {Storage} The storage instance.
   */
  // Ignoring input url for now..
  storage(url = "") {
    return this.#storage;
  }

  /**
   * Deletes the application instance.
   *
   * @returns {Promise<void>} A promise that resolves when deletion is complete.
   */
  async delete() {
    this.#auth = null;
    this.#oracledb = null;
    this.#storage = null;
    fusabase._apps[this.name] = null;
  }

  /**
   * Gets the current log level.
   *
   * @returns {LogLevel} The log level.
   */
  get logLevel() {
    return this.#logLevel;
  }

  /**
   * Sets the log level.
   *
   * @param {LogLevel} log - The new log level.
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
 * The app module export.
 */
var app = {
  App: App,
  FusabaseError: FusabaseError,
  LogLevel: LogLevel
};
export default app;
