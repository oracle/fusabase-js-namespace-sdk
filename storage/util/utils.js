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

import LogLevel from "../../logger.js";
import { attachAppTrustHeader } from "../../app/app-trust-header.js";
import { fusabaseFetch } from "../../app/fusabase-fetch.js";
import { redactLogData } from "../../app/log-redaction.js";

/**
 * Retrieves the access token from the current user if available.
 * @param {Object} app - The application object with auth method.
 * @returns {Promise<string|null>} The access token or null.
 */
export async function getAccessToken(app) {
  return app.auth().currentUser
    && app.auth().currentUser.getFUSABASEToken ?
    await app.auth().currentUser.getFUSABASEToken() : null;
}

/**
 * Fetches a URL with retry mechanism on failure.
 * @param {string} url - The URL to fetch.
 * @param {Object} options - Fetch options.
 * @param {number} maxRetryTime - Maximum time to retry in milliseconds.
 * @returns {Promise<Response>} The fetch response.
 */
export function fetchWithRetry(url, options, maxRetryTime, app) {
  const start = Date.now();
  const delay = 200;
  return new Promise((resolve, reject) => {
    function fetchWithDelay() {
      // If caller provided an app via options.app, attach App Trust headers.
      // We keep this backwards compatible by stripping the internal field.
      fusabaseFetch(app, url, options)
        .then(response => resolve(response))
        .catch(err => {
          if (Date.now() - start > maxRetryTime) {
            reject(err);
          }
          else {
            // possibility of too many requests - add a delay
            // TODO: replace with exponential Backoff
            setTimeout(fetchWithDelay, delay);
          }
        });
    }
    fetchWithDelay();
  });
}

/**
 * Internal class for providing utility functions to all the classes.
 */
export class Utils {
  /**
   * Constructs the utils object.
   */
  constructor() { }

  /**
   * Traces the request and function stack for error log level.
   * @static
   * @param {LogLevel} logLevel - The log level.
   * @param {...*} data - Data to trace.
   */
  static baasTrace(logLevel, ...data) {
    if (logLevel === LogLevel.ERROR) {
      const safeData = redactLogData(data);
      for (let i =0;i<data.length;i++) {
        console.trace(safeData[i]);
      }
    }
  }

  /**
   * Checks if the response is OK (status 200-299), throws error otherwise.
   * @static
   * @param {Response} response - The fetch response.
   * @throws {Error} If response is not OK.
   */
  static checkResponse(response) {
    if (!response || !response.status) {
        response = {"status":408};
        const error = new Error("Request failed");
        error.status = 408;
        throw error;
    }
      if (!response.ok) {
          const error = new Error(response.statusText);
          error.status = response ? response.status : 408;
          throw error;
      }
  }

  /**
   * Logs redacted data to console if log level is ERROR.
   * @static
   * @param {LogLevel} logLevel - The log level.
   * @param {...*} data - Data to log.
   */
  static baasLogger(logLevel, ...data) {
      if (logLevel === LogLevel.ERROR) {
          const safeData = redactLogData(data);
          for (let i =0;i<data.length;i++) {
              console.log(safeData[i]);
          }
      }
  }

  /**
   * Parses the payload of a JWT token.
   * @static
   * @param {string} token - The JWT token.
   * @returns {Object} Parsed JWT payload.
   */
  static parseJWT(token) {
    let baseURL = token.split(".")[1];
    var base64 = baseURL.replace(/-/g, "+").replace(/_/g, "/");
    var jsonData = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonData);
  }

  /**
   * Calculates MD5 hash of a chunk (not implemented).
   * @static
   * @param {*} chunk - The data chunk.
   */
  static calculateMD5(chunk) { }
}

export {LogLevel};
