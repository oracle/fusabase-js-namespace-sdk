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

/**
 * OracledbErrorCode - Enum-like object containing oracledb error codes.
 * @enum {string}
 */
export const OracledbErrorCode: {
  INVALID_ARGUMENT: 'invalid-argument',
  UNAUTHENTICATED: 'unauthenticated',
  UNAUTHORIZED: 'permission-denied',
  INTERNAL_ERROR: 'internal',
  OBJECT_NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown'
};

/**
 * OracledbError - Class representing errors thrown by Oracledb Service.
 * @extends Error
 */
export class OracledbError extends Error {
  code: string;

  /**
   * Creates a new OracledbError.
   * @param {string} code - The error code (without the 'oracledb/' prefix).
   * @param {string} message - The error message.
   * @param {string} [stack] - The stack trace.
   */
  constructor(code: string, message: string, stack?: string);
}