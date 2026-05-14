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

import { argCheck, typeStrings } from "../util/typecheck.js";
import { Utils, getAccessToken } from "../util/utils.js";
import { TaskState, TaskEvent } from "./taskstate.js";
import { storageErrorHandler, StorageErrorMessages } from "../errors.js";

/**
 * UploadTask - Class representing the upload task.
 */
export class UploadTask {
  /**
   * @property 
   * Snapshot of the upload task.
   */
  snapshot = null;

  /**
   * @property 
   * (Private) Upload controller instance.
   */
  #uploadController = null;

  /**
   * @property 
   * (Private) Promise for the upload task.
   */
  #promise = null;

  /**
   * @property 
   * (Private) Resolve function for the promise.
   */
  #resolve = null;

  /**
   * @property 
   * (Private) Reject function for the promise.
   */
  #reject = null;

  /**
   * @property 
   * (Private) Application instance.
   */
  #app = null;

  /**
   * Creates a new `UploadTask` instance.
   *
   * @param {Object} data - The data to upload.
   * @param {FullMetadata} metadata - Metadata for the upload.
   * @param {Object} ref - Reference to the storage location.
   */
  constructor(data, metadata, ref) {
    this._tasks = [];
    this._queue = Promise.resolve();
    if (!Object.prototype.hasOwnProperty.call(metadata, "contentType")) {
      metadata["contentType"] = data.type ? data.type : 'application/octet-stream';
    }
    Utils.baasLogger(ref.storage.logLevel, `Printing from uploadtask ${ref}`)
    this.#promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    })
    this.#app = ref.storage.app;
    this.snapshot = new UploadTaskSnapshot(this, metadata, ref);
    this.#uploadController = ref.storage.__initUploadController(metadata);
    this.#uploadController
      .initUpload(this.snapshot, data, metadata)
      .then(() => this.#runUpload())
      .catch((err) => this.#changeState(TaskState.ERROR, err))
  }

  /**
   * @property {Function} _enqueue
   * (Private) Enqueues an action to the task queue.
   *
   * @param {Function} action - The action to enqueue.
   */
  _enqueue(action) {
    this._tasks.push(action);
    if (!this._running) {
      this._process();
    }
  }

  /**
   * @async
   * @property {Function} _process
   * (Private) Processes the enqueued tasks.
   */
  async _process() {
    this._running = true;
    while (this._tasks.length) {
      const fn = this._tasks.shift();
      try {
        await fn();
      } catch (err) {
        Utils.baasLogger(this.#app.logLevel,"Task failed:", err);
      }
    }
    this._running = false;
  }

  /**
   * @property {Function} #changeState
   * (Private) Changes the state of the task.
   *
   * @param {TaskState} state - The new state.
   * @param {Error} [err=null] - Optional error.
   */
  #changeState(state, err = null) {
    this.snapshot.state = state

    if (state === TaskState.CANCELED) {
      err = new Error(StorageErrorMessages.UPLOAD_ABORTED)
      err.status = 499;
      err = storageErrorHandler(err);
    }

    let options = {
      detail: {
        snapshot: this.snapshot,
        error: err
      }
    }
    this.#uploadController
      .fireEvent(new CustomEvent(TaskEvent.STATE_CHANGED, options));

    let completed = true;
    switch (state) {
      case TaskState.SUCCESS:
        this.#resolve(this.snapshot);
        break;
      case TaskState.CANCELED:
        this.#reject(err);
        break;
      case TaskState.ERROR:
        err = storageErrorHandler(err);
        this.#reject(err);
        break;
      default:
        completed = false;
    }
    if (completed) {
      this.#resolve = null;
      this.#reject = null;
    }
  }

  /**
   * @property {Function} cancel
   * Cancels the upload task.
   */
  cancel() {
    this._enqueue(async () => {
      if (this.snapshot.state === TaskState.SUCCESS) {
        Utils.baasLogger(this.#app.logLevel,"Object Already Uploaded!");
        return;
      }
      Utils.baasLogger(this.#app.logLevel,"Cancelling...");
      await this.#uploadController.abortUpload();
      this.#changeState(TaskState.CANCELED);
      Utils.baasLogger(this.#app.logLevel,"Cancelled");
    });
  }

  /**
   * @property {Function} on
   * Sets callbacks for the task events.
   *
   * @param {string} event - The event type.
   * @param {Function} [next=null] - Next callback.
   * @param {Function} [error=null] - Error callback.
   * @param {Function} [complete=null] - Complete callback.
   * @returns {Function} Unsubscribe function or callback setter.
   * @throws {StorageError} Throws an error if invalid arguments.
   */
  on(event, next = null, error = null, complete = null) {
    argCheck(event, StorageErrorMessages.INVALID_EVENT_PASSED, true, [typeStrings.STRING]);
    argCheck(next, StorageErrorMessages.INVALID_NEXT_CALLBACK, false, [typeStrings.FUNCTION]);
    argCheck(error, StorageErrorMessages.INVALID_ERROR_CALLBACK, false, [typeStrings.FUNCTION]);
    argCheck(complete, StorageErrorMessages.INVALID_COMPLETE_CALLBACK, false, 
      [typeStrings.FUNCTION]);
    const controller = new AbortController();
    if (next || error || complete) {
      this.#uploadController.setCallBacks(event, {
        'next': next,
        'error': error,
        'complete': complete
      }, controller);
      return () => controller.abort();
    }
    else {
      return (callbacks) => 
        this.#uploadController.setCallBacks(event, callbacks, controller);
    }
  }

  /**
   * @async
   * @property {Function} #resumeUpload
   * (Private) Resumes the upload process.
   *
   * @returns {Promise<number>} Resume status.
   * @throws {StorageError} If resume fails.
   */
  async #resumeUpload() {
    Utils.baasLogger(this.#app.logLevel,"resume upload called");
    Utils.baasLogger(this.#app.logLevel,this.snapshot.state);
    if (this.snapshot.state !== TaskState.RUNNING)
      return 0;

    try {
      const access_token = await getAccessToken(this.#app);
      const snap = await this.#uploadController.continueUpload(this.snapshot, access_token);

      let res = 0;
      if (snap.state === TaskState.SUCCESS)
        this.#changeState(snap.state);
      else if (snap.state === TaskState.RUNNING)
        res = 1;
      this.snapshot.bytesTransferred = snap.bytesTransferred;
      this.snapshot.metadata.md5Hash = snap.md5sum;
      this.snapshot.metadata.size = snap.size;
      this.snapshot.metadata.timeCreated = snap.timeCreated;
      this.snapshot.metadata.updated = snap.updated;
      return res;
    }
    catch (err) {
      if (err.name !== 'AbortError')
        this.#changeState(TaskState.ERROR, err);
      return 0;
    }
  }

  /**
   * @property {Function} #runUpload
   * (Private) Starts the upload process.
   */
  #runUpload = () => {
    let _do = 0;
    this._enqueue(async () => {
      Utils.baasLogger(this.#app.logLevel,"Running #resumeUpload...");
        _do = await this.#resumeUpload();
        if (_do) {
          this._enqueue(async () => {
            this.#runUpload();
          });
        }
      Utils.baasLogger(this.#app.logLevel,"Completed #resumeUpload");
    });
  }

  /**
   * @property {Function} resume
   * Resumes the upload task if it's multipart.
   */
  resume() {
    if (!this.#uploadController.isMultipart) {
      return ;
    }
    this._enqueue(async () => {
      Utils.baasLogger(this.#app.logLevel,"Resuming...");
      if (this.snapshot.state === TaskState.SUCCESS
      || this.snapshot.state === TaskState.CANCELED
      || this.snapshot.state === TaskState.ERROR
      || this.snapshot.state === TaskState.RUNNING)
      return;
      this.#changeState(TaskState.RUNNING);
      this.#runUpload();
      Utils.baasLogger(this.#app.logLevel,"Resumed");
    });
  }

  /**
   * @property {Function} pause
   * Pauses the upload task if it's multipart.
   */
  pause() {
    if (!this.#uploadController.isMultipart) {
      return ;
    }
    this._enqueue(() => {
      Utils.baasLogger(this.#app.logLevel,"Pausing...");
      if (this.snapshot.state === TaskState.RUNNING)
        this.#changeState(TaskState.PAUSED);

      Utils.baasLogger(this.#app.logLevel,"Paused");
    });
  }

  /**
   * @property {Function} then
   * Sets callbacks for successful completion.
   *
   * @param {Function} onSuccess - Success callback.
   * @param {Function} onReject - Reject callback.
   * @returns {Promise} The task promise.
   * @throws {StorageError} Throws an error if invalid callbacks.
   */
  then(onSuccess, onReject) {
    argCheck(onSuccess, StorageErrorMessages.INVALID_SUCCESS_CALLBACK, false,
       [typeStrings.FUNCTION]);
    argCheck(onReject, StorageErrorMessages.INVALID_ERROR_CALLBACK, false, [typeStrings.FUNCTION]);
    return this.#promise.then(onSuccess, onReject);
  }

  /**
   * @property {Function} catch
   * Sets callback for unsuccessful completion.
   *
   * @param {Function} onRejected - Reject callback.
   * @returns {Promise} The task promise.
   * @throws {StorageError} Throws an error if invalid callback.
   */
  catch(onRejected) {
    argCheck(onRejected, StorageErrorMessages.INVALID_CALLBACK, false, [typeStrings.FUNCTION]);
    return this.then(null, onRejected);
  }
}

/**
 * UploadTaskSnapshot - Class representing the snapshot of upload task.
 */
export class UploadTaskSnapshot {
  /**
   * @property 
   * Number of bytes transferred.
   */
  bytesTransferred = 0;

  /**
   * @property 
   * Reference to the storage location.
   */
  ref = null;

  /**
   * @property 
   * The upload task instance.
   */
  task = null;

  /**
   * @property 
   * Metadata of the upload.
   */
  metadata = null;

  /**
   * @property 
   * Current state of the task.
   */
  state = TaskState.RUNNING;

  /**
   * @property 
   * Total bytes to upload.
   */
  totalBytes = 0;

  /**
   * Creates a new `UploadTaskSnapshot` instance.
   *
   * @param {UploadTask} task - The upload task.
   * @param {FullMetadata} metadata - Metadata for the upload.
   * @param {Reference} ref - Reference to the storage location.
   */
  constructor(task, metadata, ref) {
    this.task = task;
    this.ref = ref;
    metadata["bucket"] = ref.bucket;
    metadata["name"] = ref.name;
    metadata["fullPath"] = ref.fullPath;
    this.metadata = metadata;
  }
}
