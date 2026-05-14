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

import { App, FusabaseError, LogLevel } from "./app/app.js";
import { Auth } from "./auth/types/auth.js";
import { Oracledb } from "./oracledb/internal/core.js";
import { Storage } from "./storage/types/storage.js";

/**
 * The main fusabase module.
 */
declare namespace fusabase {
  /**
   * The SDK version.
   */
  const SDK_VERSION: string;

  /**
   * Gets the list of initialized apps.
   */
  const apps: App[];

  /**
   * Initializes a new app instance.
   * @param options The configuration options for the app.
   * @param name Optional name for the app, defaults to "[DEFAULT]".
   * @returns The initialized App instance.
   */
  function initializeApp(options: { [key: string]: any }, name?: string): App;

  /**
   * Gets an app instance by name.
   * @param name The name of the app, defaults to "[DEFAULT]".
   * @returns The App instance.
   */
  function app(name?: string): App;

  /**
   * Gets the storage instance for the given app.
   * @param app Optional App instance.
   * @returns The Storage instance.
   */
  function storage(app?: App): Storage;

  /**
   * Gets the auth instance for the given app.
   * @param app Optional App instance.
   * @returns The Auth instance.
   */
  function auth(app?: App): Auth;

  /**
   * Gets the oracledb instance for the given app.
   * @param app Optional App instance.
   * @returns The Oracledb instance.
   */
  function oracledb(app?: App): Oracledb;

  /**
   * Sets the log level for all apps.
   * @param log The log level to set.
   */
  function setLogLevel(log: LogLevel): void;
}

export default fusabase;
