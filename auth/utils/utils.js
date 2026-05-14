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

import LogLevel from "../../logger.js";
import { authErrorHandler } from "../errors.js"
import { redactLogData } from "../../app/log-redaction.js";

/**
 * Internal class for providing utility functions to all the classes.
 */
export class Utils {
  /**
   * Constructs the utils object.
   */
  // constructor() { }

  /**
   * Traces the provided data to the console if the log level is ERROR.
   * @static
   * @param {LogLevel} logLevel - The log level to check.
   * @param {...any} data - The data items to trace.
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
   * Logs redacted data to the console if the log level is ERROR.
   * @static
   * @param {LogLevel} logLevel - The log level to check.
   * @param {...any} data - The data items to log.
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
   * Checks if the response is OK (status 200-299). Throws an error if not.
   * @static
   * @param {Response} response - The HTTP response to check.
   * @throws {Error} If the response is not OK.
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
      throw authErrorHandler(error);
    }
  }

  /**
   * Parses the payload of a JWT token.
   * @static
   * @param {string} token - The JWT token to parse.
   * @returns {Object} The parsed JSON payload of the token.
   */
  static parseJWT(token) {
    let baseURL = token.split(".")[1];
    var base64 = baseURL.replace(/-/g, "+").replace(/_/g, "/");
    var jsonData = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonData);
  }

  /**
   * Safely stringifies a JSON object, converting BigInt values to strings.
   * @static
   * @param {Object} obj - The object to stringify.
   * @returns {string} The JSON string representation.
   */
  static safeStringify(obj) {
    return JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }
}
