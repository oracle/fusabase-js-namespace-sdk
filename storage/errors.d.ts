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

/**
 * StorageErrorCode - Enum-like object containing storage error codes.
 * @enum {string}
 */
export const StorageErrorCode: {
  readonly INVALID_ARGUMENT: 'invalid-argument';
  readonly UNAUTHENTICATED: 'unauthenticated';
  readonly UNAUTHORIZED: 'permission-denied';
  readonly INTERNAL_ERROR: 'internal';
  readonly CANCELED: 'aborted';
  readonly NOT_IMPLEMENTED: 'not-implemented';
  readonly OBJECT_NOT_FOUND: 'not-found';
  readonly DOWNLOAD_SIZE_EXCEEDED: 'download-size-exceeded';
  readonly NETWORK_ISSUE: 'network-error';
  readonly UNKNOWN: 'unknown';
};

/**
 * StorageError - Class representing errors thrown by Fusabase Storage Service.
 * @extends Error
 */
export class StorageError extends Error {
  /**
   * Creates a new StorageError.
   * @param {string} code - The error code (without the 'storage/' prefix).
   * @param {string} message - The error message.
   * @param {string} [stack] - The stack trace.
   */
  constructor(code: string, message: string, stack?: string);
  readonly code: string;
  readonly customData: { serverResponse: string };
}
