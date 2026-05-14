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

import { storageErrorHandler, StorageErrorMessages, formatMessage } from "../errors.js";

/**
 * Checks if the value is null or undefined and throws an error if it is.
 * @param {*} value - The value to check.
 * @param {string} message - The error message to throw.
 * @throws {Error} If value is null or undefined.
 */
export function nullCheck(value, message) {
  if (value == null) {
      let err = new Error(message);
      err.status = 400;
      throw storageErrorHandler(err);
  }
}

/**
 * Validates if the provided object is valid metadata (only 'contentType' key allowed, must be string if present).
 * @param {*} obj - The object to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function isValidMetadata(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  const keys = Object.keys(obj);
  const hasOtherKeys = keys.some(key => key !== 'contentType');
  const contentTypeIsValid = !Object.prototype.hasOwnProperty.call(obj, "contentType") || typeof obj.contentType === 'string';
  return !hasOtherKeys && contentTypeIsValid;
}

/**
 * Frozen object containing string representations of various types.
 * @constant {Object}
 */
export const typeStrings = Object.freeze({
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

/**
 * Validates the argument value against nullability and expected types.
 * @param {*} value - The value to check.
 * @param {string} [message] - Custom error message.
 * @param {boolean} throwNullError - Whether to throw error if value is null or undefined.
 * @param {string[]} [expectedTypes=[]] - Array of expected type strings.
 * @returns {*} The value if validation passes.
 * @throws {Error} If validation fails.
 */
export function argCheck(value, message, throwNullError, expectedTypes = []) {
    if (value === null || value === undefined) {
        if (!throwNullError) {
            return ;
        }
        let error = new Error(message || StorageErrorMessages.VALUE_CANNOT_BE_NULL);
        error.status = 400;
        throw storageErrorHandler(error);
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
            message || formatMessage(StorageErrorMessages.EXPECTED_TYPE, expectedTypes.join(", "), actualType)
        );
        error.status = 400;
        throw storageErrorHandler(error);
    }

    return value;
}
