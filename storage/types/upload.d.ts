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

// Type declarations for upload.js

import { TaskEvent, TaskState } from './taskstate';
import { Reference } from './ref';
import { FullMetadata } from './metadata';

/**
 * UploadTask - Class representing the upload task.
 */
export class UploadTask {
  /**
   * Creates a new `UploadTask` instance.
   *
   * @param {Object} data - The data to upload.
   * @param {Object} metadata - Metadata for the upload.
   * @param {Object} ref - Reference to the storage location.
   */
  constructor(data: any, metadata: object, ref: any);

  /**
   * Snapshot of the upload task.
   */
  readonly snapshot: UploadTaskSnapshot;

  /**
   * Cancels the upload task.
   */
  cancel(): void;

  /**
   * Sets callbacks for the task events.
   *
   * @param {string} event - The event type.
   * @param {Function} [next=null] - Next callback.
   * @param {Function} [error=null] - Error callback.
   * @param {Function} [complete=null] - Complete callback.
   * @returns {Function} Unsubscribe function or callback setter.
   * @throws {StorageError} Throws an error if invalid arguments.
   */
  on(event: typeof TaskEvent.STATE_CHANGED, next?: (snapshot: UploadTaskSnapshot) => void, error?: (error: Error) => void, complete?: () => void): () => void;

  /**
   * Pauses the upload task if it's multipart.
   */
  pause(): void;

  /**
   * Resumes the upload task if it's multipart.
   */
  resume(): void;

  /**
   * Sets callbacks for successful completion.
   *
   * @param {Function} onFulfilled - Success callback.
   * @param {Function} onRejected - Reject callback.
   * @returns {Promise} The task promise.
   * @throws {StorageError} Throws an error if invalid callbacks.
   */
  then(onFulfilled?: (value: UploadTaskSnapshot) => any, onRejected?: (error: Error) => any): Promise<any>;

  /**
   * Sets callback for unsuccessful completion.
   *
   * @param {Function} onRejected - Reject callback.
   * @returns {Promise} The task promise.
   * @throws {StorageError} Throws an error if invalid callback.
   */
  catch(onRejected: (error: Error) => any): Promise<any>;
}

/**
 * UploadTaskSnapshot - Class representing the snapshot of upload task.
 */
export class UploadTaskSnapshot {
  /**
   * Creates a new `UploadTaskSnapshot` instance.
   *
   * @param {UploadTask} task - The upload task.
   * @param {FullMetadata} metadata - Metadata for the upload.
   * @param {Reference} ref - Reference to the storage location.
   */
  constructor(task: UploadTask, metadata: FullMetadata, ref: Reference);

  /**
   * Number of bytes transferred.
   */
  readonly bytesTransferred: number;

  /**
   * Metadata of the upload.
   */
  readonly metadata: FullMetadata;

  /**
   * Reference to the storage location.
   */
  readonly ref: Reference;

  /**
   * Current state of the task.
   */
  readonly state: any;

  /**
   * The upload task instance.
   */
  readonly task: UploadTask;

  /**
   * Total bytes to upload.
   */
  readonly totalBytes: number;
}
