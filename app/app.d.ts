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

import { Auth } from "../auth/types/auth.js";
import { Oracledb } from "../oracledb/internal/core.js";
import { Storage } from "../storage/types/storage.js";

/**
 * FusabaseError - Custom error class for fusabase applications.
 */
export class FusabaseError extends Error {
  /**
   * Creates a new `FusabaseError` instance.
   *
   * @param {string} code - The error code.
   * @param {string} message - The error message.
   * @param {string} [stack] - The error stack.
   */
  constructor(code: string, message: string, stack?: string);
}

/**
 * LogLevel enum.
 */
export type LogLevel = "error" | "silent" | "debug";

/**
 * The main application class.
 */
export class App {
  /**
   * Application options.
   */
  options: { [key: string]: any };

  /**
   * Application name.
   */
  name: string;

  /**
   * Creates a new `App` instance.
   *
   * @param {Object} options - The options for the app.
   * @param {string} name - The name of the app.
   */
  constructor(options: { [key: string]: any }, name: string);

  /**
   * Gets the authentication instance.
   *
   * @returns {Auth} The authentication instance.
   */
  auth(): Auth;

  /**
   * Gets the OracleDB instance.
   *
   * @returns {Oracledb} The OracleDB instance.
   */
  oracledb(): Oracledb;

  /**
   * Gets the storage instance.
   *
   * @param {string} [url=""] - Optional URL for storage.
   * @returns {Storage} The storage instance.
   */
  storage(url?: string): Storage;

  /**
   * Deletes the application instance.
   *
   * @returns {Promise<void>} A promise that resolves when deletion is complete.
   */
  delete(): Promise<void>;

  /**
   * Gets the application configuration.
   *
   * @returns {Object} The configuration object.
   */
  get config(): { [key: string]: any };

  /**
   * Gets the current log level.
   *
   * @returns {LogLevel} The log level.
   */
  get logLevel(): LogLevel;

  /**
   * Sets the log level.
   *
   * @param {LogLevel} log - The new log level.
   */
  set logLevel(log: LogLevel);
}

/**
 * The app module export.
 */
declare namespace app {
  export { App, FusabaseError, LogLevel };
}

export default app;
