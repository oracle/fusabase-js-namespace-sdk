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

import { getAccessToken } from "../util/utils.js";
import { argCheck, isValidMetadata, typeStrings } from "../util/typecheck.js";
import { storageErrorHandler, StorageErrorMessages, formatMessage } from "../errors.js";
import { ListResult } from "./list.js";
import { UploadTask } from "./upload.js";

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
  return null;
}

function isDbfsStorage(storage) {
  return storage?.config?.module === 'dbfs';
}

/**
 * Reference - Class representing a reference to a storage object.
 */
export class Reference {
  /**
   * @property 
   * The name of the reference.
   */
  name = "";

  /**
   * @property 
   * The root reference.
   */
  root = null;

  /**
   * @property 
   * The parent reference.
   */
  parent = null;

  /**
   * @property 
   * The storage instance.
   */
  storage = null;

  /**
   * Creates a new `Reference` instance.
   *
   * @param {Object} storage - The storage instance.
   * @param {string} path - The path for the reference.
   * @param {Reference} [parent=null] - The parent reference.
   * @throws {StorageError} Throws an error if path is invalid.
   */
  constructor(storage, path, parent = null) {
    // Check for invalid path
    path = path ? path : "";
    path = path.toString().trim();
    if (path[path.length-1] == '/') {
      let error = new Error(formatMessage(StorageErrorMessages.INCORRECT_PATH, path));
      error.status = 400;
      throw storageErrorHandler(error);
    }
    let tokens = path.split("/");
    this.name = tokens.pop();
    if (tokens.length === 0 && this.name === "") this.parent = parent;
    else this.parent = new Reference(storage, tokens.join("/"), parent);

    this.root = this.parent == null ? this : this.parent.root;
    this.storage = storage;
  }

  /**
   * @property 
   * Returns the bucket name.
   *
   * @returns {string} Bucket name.
   */
  get bucket() {
    return this.storage.bucket;
  }

  /**
   * @property 
   * Returns the full path for the Reference.
   *
   * @returns {string} Full path.
   */
  get fullPath() {
    if (this.name === "")
      return "";
    return this.parent.fullPath === "" ? `${this.name}` : `${this.parent.fullPath}/${this.name}`;
  }

  /**
   * @property {Function} child
   * Returns reference of a child of this reference.
   *
   * @param {string} path - The child path.
   * @returns {Reference} The child reference.
   * @throws {StorageError} Throws an error if path is invalid.
   */
  child(path) {
    argCheck(path, StorageErrorMessages.INVALID_CHILD_PATH, true, [typeStrings.STRING]);
    if (path === "") return this;
    return new Reference(this.storage, `${this.fullPath}/${path}`, this);
  }

  /**
   * @async
   * @property {Function} delete
   * Deletes the object at this reference.
   *
   * @returns {Promise<void>}
   * @throws {StorageError} Throws an error if deletion fails.
   */
  async delete() {
    const access_token = await getAccessToken(this.storage.app);
    return this.storage.__deleteObject(this.fullPath, access_token);
  }

  /**
   * @async
   * @property {Function} list
   * Lists all the files as reference in this with recurse as false.
   *
   * @param {Object} [options] - The list options.
   * @returns {Promise<ListResult>}
   * @throws {StorageError} Throws an error if listing fails or invalid options.
   */
  async list(options) {
    argCheck(options, StorageErrorMessages.INVALID_OPTIONS_OBJECT, false, [typeStrings.OBJECT]);
    const access_token = await getAccessToken(this.storage.app);

    let result = null;
    const listOptions = {
      maxResults: options != null ? options.maxResults : null,
      pageToken: options != null ? options.pageToken : null
    }

    try {
      const data = await this.storage.__getLists(false, this.fullPath, listOptions, access_token);
      for (let i =0;i<data["items"].length;i++) {
        data["items"][i] = this.storage.ref(data["items"][i]); 
      }
      for (let i =0;i<data["prefixes"].length;i++) {
        data["prefixes"][i] = this.storage.ref(data["prefixes"][i]); 
      }
      result = new ListResult(data);
    }
    catch (err) {
      throw storageErrorHandler(err);
    }

    return result;
  }

  /**
   * @async
   * @property {Function} listAll
   * Lists all the files as reference in this with recurse as true.
   *
   * @returns {Promise<ListResult>}
   * @throws {StorageError} Throws an error if listing fails.
   */
  async listAll() {
    const access_token = await getAccessToken(this.storage.app);

    let result = null;

    const listOptions = {
      maxResults: null,
      pageToken: null
    }

    try {
      const data = await this.storage.__getLists(true, this.fullPath, listOptions, access_token);
      for (let i =0;i<data["items"].length;i++) {
        data["items"][i] = this.storage.ref(data["items"][i]); 
      }
      for (let i =0;i<data["prefixes"].length;i++) {
        data["prefixes"][i] = this.storage.ref(data["prefixes"][i]); 
      }
      result = new ListResult(data);
    }
    catch (err) {
      throw storageErrorHandler(err);
    }

    return result;
  }

  /**
   * @property {Function} put
   * Returns Upload task object for the upload task.
   *
   * @param {Blob|ArrayBuffer|Uint8Array} data - The data to upload.
   * @param {UploadMetadata} [metadata] - The metadata.
   * @returns {UploadTask} Upload task instance.
   * @throws {StorageError} Throws an error if invalid data or metadata.
   */
  put(data, metadata = {"contentType":"application/octet-stream"}) {
    argCheck(metadata, StorageErrorMessages.INVALID_OPTIONS_OBJECT, false, [typeStrings.OBJECT]);
    if (!isValidMetadata(metadata)) {
      let err = new Error(StorageErrorMessages.INVALID_METADATA);
      err.status = 400;
      throw storageErrorHandler(err);
    }
    if (!(isBlob(data) || data instanceof ArrayBuffer || data instanceof Uint8Array)) {
      let error = new Error(StorageErrorMessages.INVALID_UPLOAD_FORMAT);
      error.status = 400;
      throw storageErrorHandler(error);
    }
    if (getUploadByteLength(data) === 0) {
      let error = new Error(StorageErrorMessages.INVALID_EMPTY_UPLOAD);
      error.status = 400;
      throw storageErrorHandler(error);
    }
    const res = new UploadTask(data, metadata, this);
    return res;
  }

  /**
   * @async
   * @property {Function} getDownloadURL
   * Gets download URL for this reference.
   *
   * @returns {Promise<string>} Download URL.
   * @throws {StorageError} Throws an error if fetching URL fails.
   */
  async getDownloadURL() {
    const access_token = await getAccessToken(this.storage.app);

    let result = null;

    try {
      result = await this.storage.__fetchDownloadUrl(`${this.fullPath}`, access_token);
    }
    catch (err) {
      throw storageErrorHandler(err);
    }

    return result.URL;
  }

  /**
   * @async
   * @property {Function} getMetadata
   * Gets metadata for this reference.
   *
   * @returns {Promise<FullMetadata>} Metadata object.
   * @throws {StorageError} Throws an error if fetching metadata fails.
   */
  async getMetadata() {
    const access_token = await getAccessToken(this.storage.app);

    let result = null;
    try {
      result = await this.storage.__fetchMetadata(this, access_token);
    }
    catch (err) {
      throw storageErrorHandler(err);
    }
    return result;
  }
}
