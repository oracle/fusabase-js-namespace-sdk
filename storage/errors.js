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

/**
 * StorageErrorCode - Enum-like object containing storage error codes.
 * @enum {string}
 */
export const StorageErrorCode = Object.freeze({
  INVALID_ARGUMENT: 'invalid-argument',
  UNAUTHENTICATED: 'unauthenticated',
  UNAUTHORIZED:'permission-denied',
  INTERNAL_ERROR: 'internal',
  CANCELED: 'aborted',
  NOT_IMPLEMENTED: 'not-implemented',
  OBJECT_NOT_FOUND: 'not-found',
  DOWNLOAD_SIZE_EXCEEDED: 'download-size-exceeded',
  NETWORK_ISSUE: 'network-error',
  UNKNOWN: 'unknown'
});

/**
 * Handles errors and converts them to StorageError instances.
 * @param {Error} err - The error to handle.
 * @returns {StorageError} A StorageError instance representing the handled error.
 */
export function storageErrorHandler(err) {
  if (err instanceof StorageError) {
    return err;
  }
  let code = null;

  if (err.status === 400)
    code = StorageErrorCode.INVALID_ARGUMENT;
  else if (err.status === 401)
    code = StorageErrorCode.UNAUTHENTICATED;
  else if (err.status === 404)
    code = StorageErrorCode.OBJECT_NOT_FOUND;
  else if (err.status === 403)
    code = StorageErrorCode.UNAUTHORIZED;
  else if (err.status === 500)
    code = StorageErrorCode.INTERNAL_ERROR;
  else if (err.status === 501)
    code = StorageErrorCode.NOT_IMPLEMENTED;
  else if (err.status == 499)
    code = StorageErrorCode.CANCELED;
  else if (err.status == 408)
    code = StorageErrorCode.NETWORK_ISSUE;
  else
    code = StorageErrorCode.UNKNOWN;

  let error = new StorageError(code, err.message, err.stack);

  return error;
}

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
  constructor(code, message, stack) {
    super(message);
    this.code = 'storage/' + code;
    this.name = 'StorageError';
    this.customData = {
      serverResponse: message
    };
    this.stack = stack;
  }
}

/**
 * Formats a message template with arguments.
 * @param {string} template - The message template with {0}, {1}, etc.
 * @param {...string} args - The arguments to insert.
 * @returns {string} The formatted message.
 */
export function formatMessage(template, ...args) {
  return template.replace(/\{(\d+)\}/g, (m, i) => args[i] || m);
}

/**
 * Map of hardcoded error messages.
 */
export const StorageErrorMessages = {
  UNKNOWN: 'Unknown error occurred.',
  NETWORK_ISSUE: 'Network issue.',
  VALUE_CANNOT_BE_NULL: 'Value cannot be null or undefined.',
  EXPECTED_TYPE: 'Expected one of {0} but got {1}.',
  UPLOAD_ABORTED: 'Upload aborted.',
  INCORRECT_PATH: 'Incorrect path: {0}.',
  INVALID_METADATA: 'Only contentType is supported in metadata and it should be a valid string.',
  INVALID_UPLOAD_FORMAT: 'Invalid upload format! Upload as Blob, ArrayBuffer or Uint8Array.',
  INVALID_EMPTY_UPLOAD: 'Zero-byte uploads are not supported for DBFS storage.',
  INVALID_MAX_DOWNLOAD_SIZE: 'maxDownloadSizeBytes must be a positive safe integer.',
  INVALID_DOWNLOAD_METADATA_SIZE: 'Unable to verify object size before download.',
  INVALID_MAX_UPLOAD_SIZE: 'max_upload_bytes must be a positive safe integer.',
  UPLOAD_SIZE_EXCEEDED: 'Upload size exceeds maxUploadBytes.',
  DOWNLOAD_SIZE_EXCEEDED: 'Object size exceeds maxDownloadSizeBytes.',
  MULTIPART_NOT_INITIALIZED: 'Multipart not initialized properly.',
  PAR_URL_CREATION_FAILED: 'PAR URL creation failed.',
  COMMIT_FAILED: 'Commit failed.',
  FAILED_DOWNLOAD_URL: 'Failed to get object downloadURL for {0}.',
  FAILED_DELETE: 'Failed to delete object {0}.',
  FAILED_FETCH_METADATA: 'Failed to fetch metadata for {0}.',
  INVALID_CHILD_PATH: 'Invalid child path',
  INVALID_OPTIONS_OBJECT: 'Invalid options object',
  INVALID_EVENT_PASSED: 'Invalid event passed',
  INVALID_NEXT_CALLBACK: 'Invalid next callback',
  INVALID_ERROR_CALLBACK: 'Invalid error callback',
  INVALID_COMPLETE_CALLBACK: 'Invalid complete callback',
  INVALID_SUCCESS_CALLBACK: 'Invalid success callback',
  INVALID_CALLBACK: 'Invalid callback',
  INVALID_REFERENCE_PATH: 'Invalid reference path',
  INVALID_REFERENCE_URL: 'Invalid reference url',
};
