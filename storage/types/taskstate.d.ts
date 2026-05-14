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
// Type declarations for taskstate.js

/**
 * TaskState - Enum representing the possible states of an upload task.
 * @enum {string}
 * @readonly
 *
 * @description
 * TaskState Changes:
 * - PAUSED -> RUNNING: ref.put() or uploadTask.resume()
 * - PAUSED -> CANCELED: uploadTask.cancel()
 * - PAUSED -> ERROR: Already went fetch() can return with ERROR
 * - PAUSED -> SUCCESS: Already went fetch() for final Chunk can return with SUCCESS
 * - RUNNING -> CANCELED: uploadTask.cancel()
 * - RUNNING -> ERROR: a fetch() can return ERROR
 * - RUNNING -> SUCCESS: final chunk returned SUCCESS
 * - RUNNING -> PAUSED: uploadTask.pause()
 * - CANCELED -> X: No Operation Allowed
 * - SUCCESS -> X: No Operation Allowed
 * - ERROR -> (handle different errors)
 */
export const TaskState: {
  /** The task has been canceled. */
  readonly CANCELED: 'canceled';
  /** The task encountered an error. */
  readonly ERROR: 'error';
  /** The task is paused. */
  readonly PAUSED: 'paused';
  /** The task is currently running. */
  readonly RUNNING: 'running';
  /** The task completed successfully. */
  readonly SUCCESS: 'success';
};

/**
 * TaskEvent - Enum representing task event names.
 * @enum {string}
 * @readonly
 */
export const TaskEvent: {
  /** Fired when the state of the task changes. */
  readonly STATE_CHANGED: 'state_changed';
};
