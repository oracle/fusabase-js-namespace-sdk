// Copyright (c) 2015, 2026, Oracle and/or its affiliates.
//
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
 * Error raised when an App Trust operation cannot be completed.
 *
 * @example
 * try {
 *   await getToken(appTrust);
 * } catch (error) {
 *   if (error instanceof FusabaseAppTrustError) console.log(error.code);
 * }
 */
export class FusabaseAppTrustError extends Error {
  /** @type {number | undefined} Optional HTTP status for this failure. */
  status;
  /** @type {string | undefined} Optional SDK-specific error code. */
  code;
  /** @type {unknown} Original server response or error cause. */
  cause;

  /**
   * Creates an App Trust error.
   *
   * @param {string} message - Human-readable explanation of the failure.
   * @param {{status?: number, code?: string, cause?: unknown}} [opts] -
   * Optional HTTP status, SDK error code, and originating cause.
   * @returns {FusabaseAppTrustError} The constructed error.
   *
   * @example
   * throw new FusabaseAppTrustError('App Trust is unavailable', {
   *   code: 'app-trust/unavailable',
   *   status: 503,
   * });
   */
  constructor(message, opts) {
    super(message);
    this.name = 'FusabaseAppTrustError';
    this.status = opts?.status;
    this.code = opts?.code;
    this.cause = opts?.cause;
  }
}
