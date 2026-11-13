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
//

import app from "./app/app.js";
import { getOrCreateBrowserInstanceId } from './app/instance-id.js';
import {
  DEFAULT_LONG_POLLING_TIMEOUT_SECONDS,
  validateLongPollingTimeoutSeconds
} from "./oracledb/internal/settings.js";

const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const errorMessages = {
  invalidOrdsHost: 'Invalid ords host',
  invalidSchema: 'Invalid schema',
  invalidAppId: 'Invalid app id',
  invalidProjectId: 'Invalid project id',
  invalidObjsType: 'Invalid objs type',
  invalidStorageBucket: 'Invalid storage bucket',
  invalidAuthType: 'Invalid auth type',
  invalidAuthId: 'Invalid auth id',
  invalidClientId: 'Invalid client id',
  invalidClientSecret: 'Invalid client secret',
  invalidSelfRegistrationProfile: 'Invalid self registration profile',
  invalidSocketValue: 'Invalid socket value',
  invalidPollingInterval: 'Invalid polling interval',
  invalidBackendType: 'Only COLLECTION backend type is supported.',
  invalidChunkSize: 'Invalid chunk size',
  invalidMaxUploadBytes: 'Invalid max upload bytes',
  appNotInitialized: 'App is not initialized. Use initializeApp() first.',
  valueCannotBeNull: 'Value cannot be null or undefined',
  typeMismatch: 'Expected one of [%expected%] but got %actual%'
};


function getConfiguredLongPollingInterval(options) {
  if (!Object.prototype.hasOwnProperty.call(options, "long_polling_interval")) {
    return DEFAULT_LONG_POLLING_TIMEOUT_SECONDS;
  }

  try {
    return validateLongPollingTimeoutSeconds(options["long_polling_interval"]);
  } catch (err) {
    throw appErrorHandler(err);
  }
}

/**
 * The Fusabase namespace. Use it to initialize apps and obtain their Auth,
 * OracleDB, and Storage services.
 *
 * @example
 * const app = fusabase.initializeApp({
 *   ords_host: "https://example.com/ords/schema/",
 *   schema: "schema",
 *   app_id: "my-app",
 *   project_id: "my-project",
 *   objs_type: "dbfs",
 *   storage_bucket: "my-bucket",
 *   auth_type: "base",
 *   auth_id: "my-auth-id"
 * });
 * const db = fusabase.oracledb(app);
 */
var fusabase = {

  _apps: {},

  /**
   * The registered app entries, keyed by their initialization name.
   *
   * @type {app.App[]}
   */
  get apps() {
    var apps_arr = [];
    Object.entries(this._apps).map(entry => {
      let value = entry[1];
      apps_arr.push(value);
      return null;
    });
    return apps_arr;
  },

  /**
   * Initializes an application and registers it in the Fusabase namespace.
   *
   * The required connection, storage, and authentication settings are passed
   * with their snake_case configuration keys. `e-idcs` is accepted as an alias
   * for `idcs`; sockets are enabled unless `use_socket` is explicitly `false`.
   *
   * @param {{ords_host: string, schema: string, app_id: string, project_id: string,
   * objs_type: string, backend_type: string, storage_bucket: string,
   * auth_type: string, auth_id: string, app_type?: string, use_socket?: boolean,
   * long_polling_interval?: number, upload_chunk_size?: number,
   * max_upload_bytes?: number}} options_sdk - Application
   * configuration.
   * @param {string} options_sdk.ords_host - Base ORDS URL used to construct
   * Fusabase service endpoints.
   * @param {string} options_sdk.schema - Oracle schema that owns the Fusabase
   * resources.
   * @param {string} options_sdk.app_id - Fusabase application identifier.
   * @param {string} options_sdk.project_id - Fusabase project identifier used
   * in service routes.
   * @param {string} options_sdk.objs_type - Storage implementation. `"dbfs"`
   * selects DBFS; other values select OCI object storage.
   * @param {string} options_sdk.backend_type - Backend data model. Only
   * `"COLLECTION"` is supported; `"RELATIONAL"` is rejected.
   * @param {string} options_sdk.storage_bucket - Bucket used by Storage APIs.
   * @param {string} options_sdk.auth_type - Authentication backend: `"base"`,
   * `"ldap"`, `"idcs"`, or `"e-idcs"` (`"e-idcs"` is normalized to `"idcs"`).
   * @param {string} options_sdk.auth_id - Authentication-service identifier.
   * @param {string} [options_sdk.app_type] - Optional client platform used when
   * composing App Trust headers; it defaults to `"web"` where needed.
   * @param {boolean} [options_sdk.use_socket=true] - Enables WebSocket
   * transport for realtime listeners. Set to `false` to use long polling.
   * @param {number} [options_sdk.long_polling_interval=29] - Long-polling
   * timeout in seconds. Must be an integer from 5 through 300.
   * @param {number} [options_sdk.upload_chunk_size=16777216] - Storage upload
   * chunk size in bytes (16 MiB by default).
   * @param {number} [options_sdk.max_upload_bytes=104857600] - Maximum upload
   * size in bytes (100 MiB by default). Must be a positive safe integer.
   * @param {string} [name="[DEFAULT]"] - App registration name. Only an app
   * initialized with `"[DEFAULT]"` becomes the default app.
   * @returns {app.App} The initialized application.
   * @throws {app.FusabaseError} If a required setting is missing or has an
   * invalid type or value.
   * @example
   * const app = fusabase.initializeApp({
   *   ords_host: "https://example.com/ords/schema/",
   *   schema: "schema", app_id: "web", project_id: "project",
   *   objs_type: "dbfs", storage_bucket: "uploads",
   *   auth_type: "base", auth_id: "auth-service",
   *   use_socket: true, max_upload_bytes: 50 * 1024 * 1024
   * }, "web-app");
   */
  initializeApp: (options_sdk, name = "[DEFAULT]") => {
argCheck(options_sdk["ords_host"], errorMessages.invalidOrdsHost, true, [typeStrings.STRING]);
argCheck(options_sdk["schema"], errorMessages.invalidSchema, true, [typeStrings.STRING]);
argCheck(options_sdk["app_id"], errorMessages.invalidAppId, true, [typeStrings.STRING]);
argCheck(options_sdk["project_id"], errorMessages.invalidProjectId, true, [typeStrings.STRING]);
argCheck(options_sdk["objs_type"], errorMessages.invalidObjsType, true, [typeStrings.STRING]);
argCheck(options_sdk["backend_type"], errorMessages.invalidBackendType, true, [typeStrings.STRING]);
argCheck(options_sdk["storage_bucket"], errorMessages.invalidStorageBucket, true, [typeStrings.STRING]);
argCheck(options_sdk["auth_type"], errorMessages.invalidAuthType, true, [typeStrings.STRING]);
argCheck(options_sdk["auth_id"], errorMessages.invalidAuthId, true, [typeStrings.STRING]);
    const authType = String(options_sdk["auth_type"]).toLowerCase();
    const normalizedAuthType = authType === "e-idcs" ? "idcs" : authType;
    const backendType = String(options_sdk["backend_type"]).toUpperCase();
    if (backendType !== "COLLECTION") {
      let error = new Error(errorMessages.invalidBackendType);
      error.status = 400;
      throw appErrorHandler(error);
    }
argCheck(options_sdk["use_socket"], errorMessages.invalidSocketValue, false, [typeStrings.BOOL]);
argCheck(options_sdk["long_polling_interval"], errorMessages.invalidPollingInterval, false, [typeStrings.INT]);
argCheck(options_sdk["upload_chunk_size"], errorMessages.invalidChunkSize, false, [typeStrings.INT]);
argCheck(options_sdk["max_upload_bytes"], errorMessages.invalidMaxUploadBytes, false, [typeStrings.INT]);
    if (
      options_sdk["max_upload_bytes"] != null &&
      (!Number.isSafeInteger(options_sdk["max_upload_bytes"]) || options_sdk["max_upload_bytes"] <= 0)
    ) {
      let error = new Error(errorMessages.invalidMaxUploadBytes);
      error.status = 400;
      throw appErrorHandler(error);
    }
    const longPollingInterval = getConfiguredLongPollingInterval(options_sdk);
    const options = {
      ordsHost: options_sdk["ords_host"],
      schema: options_sdk["schema"],
      appID: options_sdk["app_id"],
      projectID: options_sdk["project_id"],
      objsType: options_sdk["objs_type"].toLowerCase(),
      backendType,
      storageBucket: options_sdk["storage_bucket"],
      authType: normalizedAuthType,
      authID: options_sdk["auth_id"],
      appType: options_sdk["app_type"],
      useSocket: options_sdk["use_socket"] !== false,
      longPollingInterval,
      useOracledbVersion: 2,
      chunkSize: options_sdk["upload_chunk_size"] ? options_sdk["upload_chunk_size"] : 16*1024*1024,
      maxUploadBytes: options_sdk["max_upload_bytes"] != null ? options_sdk["max_upload_bytes"] : DEFAULT_MAX_UPLOAD_BYTES,
    };
    var appInstance = new app.App(options, name);

    try {
      appInstance._instanceId = getOrCreateBrowserInstanceId(appInstance);
    } catch {
      // ignore
    }

    appInstance._intializeAfterConfig();
    fusabase._apps[name] = appInstance;
    if (name === "[DEFAULT]") {
      fusabase._apps["[DEFAULT]"] = appInstance;
    }
    return appInstance;
  },

  /**
   * Gets an initialized app by name.
   *
   * @param {string} [name="[DEFAULT]"] - The registered app name.
   * @returns {app.App|undefined} The app, or `undefined` when no app has that
   * name.
   * @example
   * const defaultApp = fusabase.app();
   * const namedApp = fusabase.app("web-app");
   */
  app: (name = "[DEFAULT]") => {
    return fusabase._apps[name];
  },

  /**
   * Gets an app's Storage service.
   *
   * @param {app.App} [app] - The app to use; the default app is used when
   * omitted.
   * @returns {Storage} The Storage service.
   * @throws {app.FusabaseError} If the selected app has not been initialized.
   * @example
   * const storage = fusabase.storage();
   */
  storage: (app) => {
    let app_ = app ? app : fusabase.app();
    if (app_ == null) {
      let error = new Error();
      error.message = errorMessages.appNotInitialized;
      error.status = 404;
      throw appErrorHandler(error);
    }
    return app_.storage();
  },

  /**
   * Gets an app's authentication service.
   *
   * @param {app.App} [app] - The app to use; the default app is used when
   * omitted.
   * @returns {Auth} The authentication service.
   * @throws {app.FusabaseError} If the selected app has not been initialized.
   * @example
   * const auth = fusabase.auth();
   */
  auth: (app) => {
    let app_ = app ? app : fusabase.app();

    if (app_ == null) {
      let error = new Error();
      error.message = errorMessages.appNotInitialized;
      error.status = 404;
      throw appErrorHandler(error);
    }
    return app_.auth();
  },

  /**
   * Gets an app's OracleDB document-database service.
   *
   * @param {app.App} [app] - The app to use; the default app is used when
   * omitted.
   * @returns {Oracledb} The OracleDB service.
   * @throws {app.FusabaseError} If the selected app has not been initialized.
   * @example
   * const db = fusabase.oracledb();
   */
  oracledb: (app) => {
    let app_ = app ? app : fusabase.app();
    if (app_ == null) {
      let error = new Error();
      error.message = errorMessages.appNotInitialized;
      error.status = 404;
      throw appErrorHandler(error);
    }
    return app_.oracledb();
  },

  /**
   * Sets the log level on every currently initialized app.
   *
   * Apps initialized after this call keep their own configured default level.
   *
   * @param {"error"|"silent"|"debug"} log - The level to set.
   * @returns {void} Does not return a value.
   * @example
   * fusabase.setLogLevel("debug");
   */
  setLogLevel(log) {
    for (const [key, instance] of Object.entries(this._apps)) {
      instance.logLevel = log;
    }
  },
};


function appErrorHandler(err) {
  let code = null;

  if (err.status === 400)
    code = 'invalid-argument';
  else if (err.status === 401)
    code = 'unauthenticated';
  else if (err.status === 404)
    code = 'not-found';
  else if (err.status === 403)
    code = 'permission-denied';
  else if (err.status === 500)
    code = 'internal';
  else
    code = 'unknown';

  let error = new app.FusabaseError(code, err.message, err.stack);

  return error;
}

const typeStrings = Object.freeze({
    NULL: "null",
    ARRAY: "array",
    DATE: "date",
    REGEXP: "regexp",
    NUMBER: "number",
    INT: "int",
    FLOAT: "float",
    OBJECT: "object",
    STRING: "string",
    BOOL: "boolean",
    BIGINT: "bigint",
    SYMBOL: "symbol",
    FUNCTION: "function"
  });

function argCheck(value, message, throwNullError, expectedTypes = []) {
    if (value === null || value === undefined) {
        if (!throwNullError) {
            return ;
        }
        let error = new Error(message || errorMessages.valueCannotBeNull);
        error.status = 400;
        throw appErrorHandler(error);
    }

    // if no type check required
    if (!Array.isArray(expectedTypes) || expectedTypes.length === 0) {
        return value;
    }

    function detectType(val) {
        if (val === null) return typeStrings.NULL;
        if (Array.isArray(val)) return typeStrings.ARRAY;
        if (val instanceof Date) return typeStrings.DATE;
        if (val instanceof RegExp) return typeStrings.REGEXP;
        if (typeof val === typeStrings.NUMBER) {
            return Number.isInteger(val) ? typeStrings.INT : typeStrings.FLOAT;
        }
        if (typeof val === "object") return typeStrings.OBJECT;
        return typeof val; // string, boolean, bigint, symbol, function
    }

    const actualType = detectType(value);

    if (!expectedTypes.map(t => t.toLowerCase()).includes(actualType)) {
    let error = new Error(
        message || errorMessages.typeMismatch.replace('%expected%', expectedTypes.join(", ")).replace('%actual%', actualType)
    );
        error.status = 400;
        throw appErrorHandler(error);
    }

    return value;
}


export default fusabase;
