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
 * Configuration used to initialize a Fusabase application.
 */
export interface FusabaseOptions {
  /** ORDS base URL for the configured schema. */
  ords_host: string;
  /** Oracle schema name. */
  schema: string;
  /** Fusabase application identifier. */
  app_id: string;
  /** Fusabase project identifier. */
  project_id: string;
  /** Object-storage implementation identifier, such as `dbfs`. */
  objs_type: string;
  /** Backend data model. Only `COLLECTION` is supported; `RELATIONAL` is rejected. */
  backend_type: "COLLECTION";
  /** Storage bucket name. */
  storage_bucket: string;
  /** Authentication mode. `e-idcs` is accepted as an alias for `idcs`. */
  auth_type: string;
  /** Authentication-service identifier. */
  auth_id: string;
  /** Optional application type sent to backend services. */
  app_type?: string;
  /** Enables WebSocket realtime transport. Defaults to `true`. */
  use_socket?: boolean;
  /** Long-polling timeout in seconds when socket transport is disabled (5–300; defaults to 29). */
  long_polling_interval?: number;
  /** Upload chunk size in bytes. Defaults to 16 MiB. */
  upload_chunk_size?: number;
  /** Maximum upload size in bytes. Must be a positive safe integer; defaults to 100 MiB. */
  max_upload_bytes?: number;
}

/**
 * The root Fusabase namespace for application initialization and service access.
 *
 * @example
 * const app = fusabase.initializeApp(options);
 * const db = fusabase.oracledb(app);
 */
declare namespace fusabase {
  /**
   * Registered app entries, keyed by their initialization name.
   *
   * @example
   * console.log(fusabase.apps.map((app) => app.name));
   */
  const apps: App[];

  /**
   * Initializes an app. Only an app initialized with `"[DEFAULT]"` becomes
   * the default app.
   *
   * @param options - Required service configuration.
   * @param name - Registered app name. Defaults to `"[DEFAULT]"`.
   * @returns The initialized app.
   * @throws {FusabaseError} If a required setting is missing or invalid.
   *
   * @example
   * const app = fusabase.initializeApp(options, "web-app");
   */
  function initializeApp(options: FusabaseOptions, name?: string): App;

  /**
   * Gets an initialized app by name.
   *
   * @param name - Registered app name. Defaults to `"[DEFAULT]"`.
   * @returns The app, or `undefined` if it is not registered.
   *
   * @example
   * const app = fusabase.app("web-app");
   */
  function app(name?: string): App | undefined;

  /**
   * Gets the Storage service for an app or for the default app.
   *
   * @param app - App to use. Defaults to the current default app.
   * @returns The Storage service.
   * @throws {FusabaseError} If no selected app has been initialized.
   *
   * @example
   * const storage = fusabase.storage();
   */
  function storage(app?: App): Storage;

  /**
   * Gets the authentication service for an app or for the default app.
   *
   * @param app - App to use. Defaults to the current default app.
   * @returns The authentication service.
   * @throws {FusabaseError} If no selected app has been initialized.
   *
   * @example
   * const auth = fusabase.auth();
   */
  function auth(app?: App): Auth;

  /**
   * Gets the OracleDB service for an app or for the default app.
   *
   * @param app - App to use. Defaults to the current default app.
   * @returns The OracleDB service.
   * @throws {FusabaseError} If no selected app has been initialized.
   *
   * @example
   * const db = fusabase.oracledb();
   */
  function oracledb(app?: App): Oracledb;

  /**
   * Sets the log level on all currently initialized apps.
   *
   * @param log - New log level.
   * @returns Nothing.
   *
   * @example
   * fusabase.setLogLevel("debug");
   */
  function setLogLevel(log: LogLevel): void;
}

export default fusabase;
