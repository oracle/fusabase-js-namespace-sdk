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

import { ErrorCode, authErrorHandler, getErrorMessage } from "../errors.js";
export function nullCheck (value, paramName) {
  if (value == null) {
    let error = new Error(getErrorMessage('INVALID_PARAM', paramName));
    error.status = ErrorCode.INVALID_ARGS;
    throw authErrorHandler(error);
  }
}

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

export function argCheck(value, paramName, throwNullError, expectedTypes = []) {
  if (value === null || value === undefined) {
    if (!throwNullError) {
        return ;
    }
    let error = new Error(getErrorMessage('INVALID_NULL', paramName));
    error.status = 400;
    throw authErrorHandler(error);
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
        getErrorMessage('INVALID_TYPE_PARAM', paramName, expectedTypes.join(", "), actualType)
    );
    error.status = 400;
    throw authErrorHandler(error);
  }

  return value;
}
