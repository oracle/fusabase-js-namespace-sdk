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
//

import app from "./app/app.js";
import { getOrCreateBrowserInstanceId } from './app/instance-id.js';

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
  invalidDomainUrl: 'Invalid domain url',
  invalidClientId: 'Invalid client id',
  invalidClientSecret: 'Invalid client secret',
  invalidSelfRegistrationProfile: 'Invalid self registration profile',
  invalidSocketValue: 'Invalid socket value',
  invalidPollingInterval: 'Invalid polling interval',
  invalidOracledbVersion: 'Invalid oracledb version',
  invalidChunkSize: 'Invalid chunk size',
  invalidMaxUploadBytes: 'Invalid max upload bytes',
  appNotInitialized: 'App is not initialized. Use initializeApp() first.',
  valueCannotBeNull: 'Value cannot be null or undefined',
  typeMismatch: 'Expected one of [%expected%] but got %actual%'
};


var fusabase = {

  _apps: {},

  get apps() {
    var apps_arr = [];
    Object.entries(this._apps).map(entry => {
      let value = entry[1];
      apps_arr.push(value);
      return null;
    });
    return apps_arr;
  },

  initializeApp: (options_sdk, name = "[DEFAULT]") => {
argCheck(options_sdk["ords_host"], errorMessages.invalidOrdsHost, true, [typeStrings.STRING]);
argCheck(options_sdk["schema"], errorMessages.invalidSchema, true, [typeStrings.STRING]);
argCheck(options_sdk["app_id"], errorMessages.invalidAppId, true, [typeStrings.STRING]);
argCheck(options_sdk["project_id"], errorMessages.invalidProjectId, true, [typeStrings.STRING]);
argCheck(options_sdk["objs_type"], errorMessages.invalidObjsType, true, [typeStrings.STRING]);
argCheck(options_sdk["storage_bucket"], errorMessages.invalidStorageBucket, true, [typeStrings.STRING]);
argCheck(options_sdk["auth_type"], errorMessages.invalidAuthType, true, [typeStrings.STRING]);
    if (!options_sdk["idcs_config"]) {
argCheck(options_sdk["auth_id"], errorMessages.invalidAuthId, true, [typeStrings.STRING]);
    }
    if (options_sdk["idcs_config"]) {
argCheck(options_sdk["idcs_config"]["domain_url"], errorMessages.invalidDomainUrl, true, [typeStrings.STRING]);
argCheck(options_sdk["idcs_config"]["clientId"], errorMessages.invalidClientId, true, [typeStrings.STRING]);
argCheck(options_sdk["idcs_config"]["clientSecret"], errorMessages.invalidClientSecret, true, [typeStrings.STRING]);
    }
argCheck(options_sdk["use_socket"], errorMessages.invalidSocketValue, false, [typeStrings.BOOL]);
argCheck(options_sdk["long_polling_interval"], errorMessages.invalidPollingInterval, false, [typeStrings.INT]);
argCheck(options_sdk["version"], errorMessages.invalidOracledbVersion, false, [typeStrings.INT]);
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
    const options = {
      ordsHost: options_sdk["ords_host"],
      schema: options_sdk["schema"],
      appID: options_sdk["app_id"],
      projectID: options_sdk["project_id"],
      objsType: options_sdk["objs_type"].toLowerCase(),
      storageBucket: options_sdk["storage_bucket"],
      authType: options_sdk["auth_type"].toLowerCase(),
      authID: options_sdk["auth_id"],
      appType: options_sdk["app_type"],
      useSocket: options_sdk["use_socket"]==true ? options_sdk["use_socket"] : false,
      longPollingInterval: options_sdk["long_polling_interval"] ? options_sdk["long_polling_interval"] : 29,
      useOracledbVersion:  options_sdk["version"] ? options_sdk["version"] : 2,
      chunkSize: options_sdk["upload_chunk_size"] ? options_sdk["upload_chunk_size"] : 16*1024*1024,
      maxUploadBytes: options_sdk["max_upload_bytes"] != null ? options_sdk["max_upload_bytes"] : DEFAULT_MAX_UPLOAD_BYTES,
      appCheckToken: options_sdk["appCheckToken"] ? options_sdk["appCheckToken"] : null,
    };
    if (options_sdk["idcs_config"] != null) {
      options["idcsConfig"] = {
        domainURL: options_sdk["idcs_config"]["domain_url"],
        clientId: options_sdk["idcs_config"]["clientId"],
        clientSecret: options_sdk["idcs_config"]["clientSecret"],
        selfRegistrationProfile: ""
      }
    }
    var appInstance = new app.App(options, name);

    try {
      appInstance._instanceId = getOrCreateBrowserInstanceId();
    } catch {
      // ignore
    }

    appInstance._intializeAfterConfig();
    fusabase._apps[name] = appInstance;
    fusabase._apps["[DEFAULT]"] = appInstance;
    return appInstance;
  },

  app: (name = "[DEFAULT]") => {
    return fusabase._apps[name];
  },

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
