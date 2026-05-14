// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.

// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//    https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//-----------------------------------------------------------------------------
// 

import { Utils, LogLevel, fetchWithRetry } from "../util/utils.js";
import { storageErrorHandler, StorageErrorMessages } from "../errors.js";
import { TaskState } from "../types/taskstate.js";

const put_REST_EP = "o/operation";
const getpreauth_REST_EP = "genpreauth";

function isBlob(data) {
  return typeof Blob !== "undefined" && data instanceof Blob;
}

function getUploadByteLength(data) {
  if (isBlob(data)) {
    return data.size;
  }
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    return data.byteLength;
  }

  const error = new Error(StorageErrorMessages.INVALID_UPLOAD_FORMAT);
  error.status = 400;
  throw error;
}

function getUploadChunk(data, start, end) {
  if (isBlob(data)) {
    return data.slice(start, end);
  }
  if (data instanceof Uint8Array) {
    return data.subarray(start, end);
  }
  if (data instanceof ArrayBuffer) {
    return end === undefined
      ? new Uint8Array(data, start)
      : new Uint8Array(data, start, end - start);
  }

  const error = new Error(StorageErrorMessages.INVALID_UPLOAD_FORMAT);
  error.status = 400;
  throw error;
}

/**
 * UploadTaskController - Internal controller class for UploadTask.
 */
export class UploadTaskController {
  /**
   * @property 
   * (Private) Storage helper instance.
   */
  #storageHelper = null

  /**
   * @property 
   * (Private) Abort controller.
   */
  #abortController = null;

  /**
   * @property 
   * (Private) Event target for listeners.
   */
  #eventListener = null;

  /**
   * @property 
   * (Private) Abort signal.
   */
  #signal = null;

  /**
   * @property 
   * (Private) Data to send.
   */
  #dataToSend = null;

  /**
   * @property 
   * Upload metadata.
   */
  uploadMetadata = null;

  /**
   * @property 
   * (Private) Log level.
   */
  #logLevel = LogLevel.SILENT;

  /**
   * @property 
   * (Private) Multipart upload info.
   */
  #isMultipart = null;

  /**
   * Creates a new `UploadTaskController` instance.
   *
   * @param {Object} metadata - Metadata for the upload.
   * @param {StorageHelper} storageHelper - Storage helper instance.
   */
  constructor(metadata, storageHelper) {
    this.#storageHelper = storageHelper;
    this.#abortController = new AbortController();
    this.#eventListener = new EventTarget();
    this.#signal = this.#abortController.signal;
    this.uploadMetadata = metadata;
    this.#logLevel = storageHelper.logLevel;
  }

  /**
   * @property 
   * Returns whether it's a multipart upload.
   *
   * @returns {Object|null} Multipart info or null.
   */
  get isMultipart () {
    return this.#isMultipart;
  }

  /**
   * @async
   * @property {Function} initUpload
   * Sets necessary config for the upload process.
   *
   * @param {UploadTaskSnapshot} snapshot - Upload snapshot.
   * @param {ArrayBuffer|Blob} data - Data to upload.
   * @param {Object} metadata - Metadata.
   * @returns {Promise<void>}
   * @throws {StorageError} If initialization fails.
   */
  async initUpload(snapshot, data, metadata) {
    try {
      const maxUploadBytes = this.#storageHelper.config.maxUploadBytes;
      if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) {
        const error = new Error(StorageErrorMessages.INVALID_MAX_UPLOAD_SIZE);
        error.status = 400;
        throw error;
      }

      const size = getUploadByteLength(data);
      if (size === 0) {
        const error = new Error(StorageErrorMessages.INVALID_EMPTY_UPLOAD);
        error.status = 400;
        throw error;
      }
      if (size > maxUploadBytes) {
        const error = new Error(StorageErrorMessages.UPLOAD_SIZE_EXCEEDED);
        error.status = 400;
        throw error;
      }

      this.#dataToSend = data;
      snapshot.totalBytes = size;
      if (snapshot && snapshot.metadata && snapshot.metadata.size) {
        console.assert(snapshot.metadata.size === snapshot.totalBytes,
           "Size given in metadata is different than the one calculated.")
      } else {
        snapshot.metadata.size = snapshot.totalBytes;
      }
      if (size > 2 * this.#storageHelper.config.chunkSize)
        this.#isMultipart = {
          totalSize: snapshot.totalBytes,
          totalChunks: Math.floor((size + this.#storageHelper.config.chunkSize - 1) / this.#storageHelper.config.chunkSize),
          toSend: 0,
          baseURL: ""
        }
    } catch (err) {
      Utils.baasTrace(this.#logLevel);
      throw storageErrorHandler(err);
    }
  }

  /**
   * @async
   * @property {Function} abortUpload
   * Aborts the upload process.
   *
   * @returns {Promise<void>}
   * @throws {StorageError} If abort fails.
   */
  async abortUpload() {
    this.#abortController.abort();
    let response = null;
    // delete uncommitted uploads
    if (this.#isMultipart) {
      let reqURL = this.#isMultipart.baseURL;
      if (reqURL === "") {
        return;
      }
      let params = { method: "DELETE" }

      try {
        response = await fetchWithRetry(reqURL, params, this.#storageHelper.maxUploadRetryTime, this.#storageHelper._app);
        Utils.checkResponse(response);
      } catch (err) {
        Utils.baasTrace(this.#logLevel, params, reqURL, response);
        throw storageErrorHandler(err);
      }
    }
  }

  /**
   * @property 
   * Returns the event target.
   *
   * @returns {EventTarget} Event target.
   */
  get eventTarget() {
    return this.#eventListener
  }

  /**
   * @property {Function} setCallBacks
   * Sets callbacks for the task.
   *
   * @param {string} event - Event name.
   * @param {Object} callbacks - Callbacks object.
   * @param {AbortController} abortController - Abort controller.
   * @returns {Function} Unsubscribe function.
   */
  setCallBacks(event, callbacks, abortController) {
    this.eventTarget.addEventListener(event, (e) => {
      let snapshot = e.detail.snapshot;
      if (callbacks.next) {
        callbacks.next(snapshot);
      }

      if (callbacks.error && 
        (snapshot.state === TaskState.ERROR 
        || snapshot.state === TaskState.CANCELED)) {
        callbacks.error(e.detail.error);
      }

      if (snapshot.state === TaskState.SUCCESS) {
        if (callbacks.complete) {
          callbacks.complete();
        } 
        abortController.abort();
      }

      if (snapshot.state === TaskState.CANCELED) {
        abortController.abort();
      }

    }, { signal: abortController.signal });
    return () => abortController.abort();
  }

  /**
   * @property {Function} fireEvent
   * Dispatches an event.
   *
   * @param {Event} event - Event to dispatch.
   */
  fireEvent(event) { this.eventTarget.dispatchEvent(event); }

  /**
   * @async
   * @property {Function} #putData
   * (Private) Uploads data as a whole.
   *
   * @param {Reference} ref - Reference.
   * @param {string} access_token - Access token.
   * @returns {Promise<Object>} Upload result.
   * @throws {StorageError} If upload fails.
   */
  async #putData(ref, access_token) {
    let response = null;
    let result = null;
    const reqURL = `${this.#storageHelper.URL}${put_REST_EP}` +
      `?apiKey=${this.#storageHelper.config.appID}`;
    let payload = {
      "x-object-path": `${JSON.stringify({
        bucket: ref.bucket,
        path: ref.fullPath
      })}`,
      "Content-Type": this.uploadMetadata["contentType"]
    }

    const params = {
      method: "POST",
      signal: this.#signal,
      headers: payload,
      body: this.#dataToSend,
    };

    // Used by storage/util/utils.js::fetchWithRetry to attach app-trust + instance headers.
    params.app = this.#storageHelper?.app;

    if (access_token) {
      params.headers["Authorization"] = `Bearer ${access_token}`;
    }

    try {
      response = await fetchWithRetry(reqURL, params,
        this.#storageHelper.maxUploadRetryTime, this.#storageHelper._app);

      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

      try {
        let errjson = await response.json();
        err.message = (this.#storageHelper.isPrem) ? errjson.error :
          errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.UNKNOWN;
      }

      throw storageErrorHandler(err);
    }

    return result;
  }

  /**
   * @async
   * @property {Function} #indexedUpload
   * (Private) Uploads a chunk.
   *
   * @param {number} toSend - Chunk index.
   * @param {ArrayBuffer} chunk - Chunk data.
   * @returns {Promise<void>}
   * @throws {StorageError} If upload fails.
   */
  async #indexedUpload(toSend, chunk) {
    let response = null;
    const reqURL = this.#isMultipart.baseURL + toSend;
    const params = {
      method: "PUT",
      body: chunk
    };

    // Used by storage/util/utils.js::fetchWithRetry to attach app-trust + instance headers.
    params.app = this.#storageHelper?.app;

    try {
      response = await fetchWithRetry(reqURL, params,
        this.#storageHelper.maxUploadRetryTime, this.#storageHelper._app);
      Utils.checkResponse(response);
    } catch (err) {
      // decrease the toSend index in case of Error
      this.#isMultipart.toSend--;
      Utils.baasTrace(this.#logLevel, params, reqURL, response);

      try {
        let errjson = await response.json();
        err.message = (this.#storageHelper.isPrem) ? errjson.error :
          errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.UNKNOWN;
      }

      throw storageErrorHandler(err);
    }
  }

  /**
   * @async
   * @property {Function} continueUpload
   * Continues the upload process.
   * @param {UploadTaskSnapshot} snapshot - Upload snapshot.
   * @param {string} access_token - Access token.
   * @returns {Promise<Object>} Upload progress or result.
   * @throws {StorageError} If upload fails.
   */
  async continueUpload(snapshot, access_token) {
    const ref = snapshot.ref;
    let result = null;
    if (!this.#isMultipart) {
      // put_object directly
      try {
        result = await this.#putData(ref, access_token);
        let timeC = result.metadata.timeCreated;
        if (!timeC) {
          timeC = result.metadata.updated;
        }
        return {
          state: TaskState.SUCCESS,
          bytesTransferred: snapshot.totalBytes,
          md5sum: result.metadata.md5sum,
          size: result.metadata.size,
          contentType: result.metadata.contentType,
          updated: result.metadata.updated,
          timeCreated: timeC
        };
      }
      catch (err) {
        if (err.status === 408) {
          Utils.baasLogger(this.#logLevel, "PUT_OBJECT: Network Slow! Trying Multipart!!");
          // If Timeout occured, fallback to multipart upload
          this.#isMultipart = {
            totalSize: snapshot.totalBytes,
            totalChunks: Math.floor((snapshot.totalBytes +
               this.#storageHelper.config.chunkSize - 1) / 
               this.#storageHelper.config.chunkSize),
            toSend: 0,
            baseURL: ""
          }
        }
        else
          throw storageErrorHandler(err);
      }
    }

    /* 
     * For Multipart Uploads, upload chunks through #indexedUpload(idx)
     * Once the final chunk is successfully sent, 
     * send the Commit Request to the Storage server.
     * Also, set the Snapshot state to SUCCESS.
     */

    if (!this.#isMultipart) {
      let error = new Error(StorageErrorMessages.MULTIPART_NOT_INITIALIZED);
      error.status = 500;
      throw storageErrorHandler(error);
    }

    let response = null;
    let reqURL = null;
    let params = null;
    if (this.#isMultipart.toSend === 0) {
      // Step 1: Create ObjectWrite PAR
      reqURL = `${this.#storageHelper.URL}${getpreauth_REST_EP}` +
        `?apiKey=${this.#storageHelper.config.appID}`;
      params = {
        method: "POST",
        headers: {},
        signal: this.#signal,
        body: JSON.stringify({
          bucket: ref.bucket,
          path: `${ref.fullPath}`, //fullPath
          access_type: "ObjectWrite", //for multipartUpload
          metadata: {
            contentType: this.uploadMetadata["contentType"]
          }
        }),
      };

      // Used by storage/util/utils.js::fetchWithRetry to attach app-trust + instance headers.
      params.app = this.#storageHelper?.app;
      if (access_token) {
        params.headers["Authorization"] = `Bearer ${access_token}`;
      }

      let objectStoreURL = "";

      try {
        response = await fetchWithRetry(reqURL, params, this.#storageHelper.maxUploadRetryTime, this.#storageHelper._app);
        Utils.checkResponse(response);
        result = await response.json();
        objectStoreURL = (this.#storageHelper.isPrem) ?
          this.#storageHelper.PARequestURL : "";
      } catch (err) {
        Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

        try {
          let errjson = await response.json();
          err.message = (this.#storageHelper.isPrem) ? errjson.error :
            errjson.message;
        }
        catch (jsonErr) {
          /* response is not JSON text */
          err.message = StorageErrorMessages.PAR_URL_CREATION_FAILED;
        }

        throw storageErrorHandler(err);
      }

      this.#isMultipart.baseURL = objectStoreURL + result.accessUri;
    }

    this.#isMultipart.toSend++;
    Utils.baasLogger(this.#logLevel, this.#isMultipart.toSend)

    // call #indexedUpload to upload chunk
    let chunkIdx = this.#isMultipart.toSend;
    // get chunk to upload
    let chunkToSend = null;
    {
      let offBegin = (chunkIdx - 1) * this.#storageHelper.config.chunkSize;
      let offEnd = (chunkIdx !== this.#isMultipart.totalChunks) ?
        offBegin + this.#storageHelper.config.chunkSize : undefined;
      chunkToSend = getUploadChunk(this.#dataToSend, offBegin, offEnd);
    }

    await this.#indexedUpload(chunkIdx, chunkToSend);

    if (chunkIdx === this.#isMultipart.totalChunks) {
      // send the commit request
      reqURL = this.#isMultipart.baseURL;
      params = {
        method: "POST",
        signal: this.#signal
      }

      // Used by storage/util/utils.js::fetchWithRetry to attach app-trust + instance headers.
      params.app = this.#storageHelper?.app;

      let respHeaders = null;
      let multipartMd5 = null;
      let lastMod = null;
      let timeCreated = null;

      try {
        response = await fetchWithRetry(reqURL, params,
           this.#storageHelper.maxUploadRetryTime, this.#storageHelper._app);
        Utils.baasLogger(this.#logLevel, "commit request");
        Utils.checkResponse(response);
        
        for (const [key, value] of response.headers.entries()) {
          if (key == "opc-multipart-md5") {
            multipartMd5 = value;
          }
          if (key == "last-modified") {
            lastMod = value;
          }
          if (key == "time-created") {
            timeCreated = value;
          }
        }
        if (!timeCreated) {
          timeCreated = lastMod;
        }
      } catch (err) {
        Utils.baasTrace(this.#logLevel, params, reqURL, response);

        try {
          let errjson = await response.json();
          err.message = (this.#storageHelper.isPrem) ? errjson.error :
            errjson.message;
        }
        catch (jsonErr) {
          /* response is not JSON text */
          err.message = StorageErrorMessages.COMMIT_FAILED;
        }
        throw storageErrorHandler(err);
      }

      return {
        state: TaskState.SUCCESS,
        bytesTransferred: snapshot.totalBytes,
        md5sum: multipartMd5,
        updated: lastMod,
        timeCreated: timeCreated,
        contentType: snapshot.metadata.contentType,
        size: snapshot.totalBytes
      };
    }

    return {
      state: snapshot.state,
      bytesTransferred: chunkIdx * this.#storageHelper.config.chunkSize
    };
  }
}
