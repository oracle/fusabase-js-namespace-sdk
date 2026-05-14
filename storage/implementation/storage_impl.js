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

import { Utils, LogLevel, fetchWithRetry } from "../util/utils.js";
import { UploadTaskController } from "./task_controller.js";
import { storageErrorHandler, StorageErrorMessages } from "../errors.js";

const list_REST_EP = "listallobj";
const DOWNLOAD_REST_EP = "o/operation";
const getpreauth_REST_EP = "genpreauth";
const deleteObj_REST_EP = "o/operation";
const getMetadata_REST_EP = "getmetadata";

/**
 * StorageHelper - Internal helper class for Storage operations.
 */
export class StorageHelper {
  /**
   * @property 
   * (Private) Log level.
   */
  #logLevel = LogLevel.SILENT;

  /**
   * @property 
   * Configuration object.
   */
  config = null;

  /**
   * @property 
   * Bucket name.
   */
  bucket = null;

  _app = null;

  /**
   * Creates a new `StorageHelper` instance.
   *
   * @param {Object} config - The configuration object for the storage.
   * @param {string} bucket - The name of the bucket.
   * @param {LogLevel} logLevel - The logging level.
   * @param {number} maxOperationRetryTime - Maximum retry time for operations in milliseconds.
   * @param {number} maxUploadRetryTime - Maximum retry time for uploads in milliseconds.
   */
  constructor(config, bucket, logLevel, maxOperationRetryTime, maxUploadRetryTime) {
    this.config = config;
    this.bucket = bucket;
    this.#logLevel = logLevel;
    this.maxOperationRetryTime = maxOperationRetryTime;
    this.maxUploadRetryTime = maxUploadRetryTime;
  }

  _setApp(app) {
    this._app = app;
  }

  /**
   * @property 
   * Checks if the configuration is for an on-prem setup.
   *
   * @returns {boolean} True if on-prem, false otherwise.
   */
  get isPrem() {
    return (this.config.module === 'dbfs');
  }

  /**
   * @property 
   * Returns the current logging level.
   *
   * @returns {LogLevel} The logging level.
   */
  get logLevel() {
    return this.#logLevel;
  }

  /**
   * @property 
   * Returns the base URL for storage operations.
   *
   * @returns {string} The base URL.
   */
  get URL() {
    return `${this.config.host}_/baas-services/${this.config.module}/${this.config.projectID}/`
  }

  /**
   * @property 
   * Returns the pre-auth request URL.
   *
   * @returns {string} The pre-auth URL.
   */
  get PARequestURL() {
    return `${this.config.host}_/baas-services/${this.config.module}/par/${this.config.projectID}/`
  }

  /**
   * @async
   * @property {Function} getLists
   * Retrieves a list of objects and prefixes in the bucket.
   *
   * @param {boolean} recurse - Whether to list recursively.
   * @param {string} [path=""] - The path to list from.
   * @param {Object} [listOptions] - Options for listing, such as pageToken and maxResults.
   * @param {string} [access_token] - Access token for authentication.
   * @returns {Promise<Object>} An object containing items, prefixes, and nextPageToken.
   * @throws {StorageError} If the listing fails.
   */
  async getLists(recurse, path = "", listOptions, access_token) {
    let response = null;
    let result = null;
    const reqURL = `${this.URL}${list_REST_EP}/b/${this.bucket}` +
      `?apiKey=${this.config.appID}`;

    let custom_header = {
      path: path,
      recurse: recurse
    };

    if (listOptions != null && listOptions.pageToken != null) {
      custom_header["pageToken"] = listOptions.pageToken;
    }
    if (listOptions != null && listOptions.maxResults != null) {
      custom_header["maxResults"] = listOptions.maxResults;
    }

    const params = {
      method: "GET",
      headers: { "x-dbfs-list-opts": JSON.stringify(custom_header) }
    };
    if (access_token) {
      params.headers["Authorization"] = `Bearer ${access_token}`;
    }

    try {
      response = await fetchWithRetry(reqURL, params, this.maxOperationRetryTime, this._app);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

      try {
        let errjson = await response.json();
        err.message = (this.isPrem) ? errjson.error : errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.UNKNOWN;
      }

      throw storageErrorHandler(err);
    }

    let final_res = result;

    // Check if onPrem DBFS is being used, if yes
    // the returned response is with '/' prefix
    if (this.isPrem) {
      final_res = {
        items: [],
        prefixes: [],
        nextPageToken: null
      }
      const processPath = (toarray, pathjson) => {
        let path;
        if (toarray === "items") {
          path = pathjson['name'].slice(1);
        } else {
          path = pathjson['name'].slice(1);
        }
        final_res[toarray].push(path);
      }
      result.items.forEach((pathjson) => processPath('items', pathjson))
      result.prefixes.forEach((pathjson) => processPath('prefixes', pathjson))
      if (result.nextPageToken != null && result.nextPageToken != "" && result.nextPageToken != -1) {
        final_res.nextPageToken = result.nextPageToken;
      }
    } else {
      final_res = {
        items: [],
        prefixes: [],
        nextPageToken: null
      }
      const processPath = (toarray, pathjson) => {
        let path;
        if (toarray === "items") {
          path = pathjson['name'];
        } else {
          path = pathjson.slice(0, pathjson.length-1);
        }
        final_res[toarray].push(path);
      }
      
      result.items.forEach((pathjson) => processPath('items', pathjson))
      result.prefixes.forEach((pathjson) => processPath('prefixes', pathjson))
      if (result.nextPageToken != null && result.nextPageToken != "" && result.nextPageToken != -1) {
        final_res.nextPageToken = result.nextPageToken;
      }
    }
    return final_res;
  }

  /**
   * @property {Function} initUploadController
   * Initializes an upload task controller.
   *
   * @param {Object} metadata - Metadata for the upload.
   * @returns {UploadTaskController} A new upload task controller instance.
   */
  initUploadController(metadata) {
    return new UploadTaskController(metadata, this);
  }


  /**
   * @async
   * @property {Function} fetchDownloadUrl
   * Fetches the download URL for a given path.
   *
   * @param {string} path - The path to the object.
   * @param {string} [access_token] - Access token for authentication.
   * @returns {Promise<Object>} An object containing the download URL.
   * @throws {StorageError} If fetching the URL fails.
   */
  async fetchDownloadUrl(path, access_token) {
    let response = null;
    let result = null;
    const reqURL =
      `${this.URL}${getpreauth_REST_EP}?apiKey=${this.config.appID}`;
    const params = {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        bucket: this.bucket,
        path: path, //fullPath
        metadata: {},
        access_type: "ObjectRead" //for getDownloadURL
      }),
    };

    if (access_token) {
      params.headers["Authorization"] = `Bearer ${access_token}`;
    }

    try {
      response = await fetchWithRetry(reqURL, params,
        this.maxOperationRetryTime, this._app);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

      try {
        let errjson = await response.json();
        err.message = (this.isPrem) ? errjson.error : errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.FAILED_TO_GET_DOWNLOAD_URL;
      }

      throw storageErrorHandler(err);
    }

    if (!result.URL.startsWith('https://') && this.isPrem) //OCI object store URL
      result.URL = this.PARequestURL + result.URL;
    return result;
  }

  /**
   * @async
   * @property {Function} deleteObject
   * Deletes an object at the specified path.
   *
   * @param {string} path - The path to the object to delete.
   * @param {string} [access_token] - Access token for authentication.
   * @returns {Promise<void>}
   * @throws {StorageError} If deletion fails.
   */
  async deleteObject(path, access_token) {
    let response = null;
    const reqURL = `${this.URL}${deleteObj_REST_EP}?apiKey=${this.config.appID}`;
    const params = {
      method: "DELETE",
      headers: {
        "x-object-path": `${JSON.stringify({
          bucket: this.bucket,
          path: path
        })}`
      }
    };

    if (access_token) {
      params.headers["Authorization"] = `Bearer ${access_token}`;
    }

    try {
      response = await fetchWithRetry(reqURL, params, this.maxOperationRetryTime, this._app);
      Utils.checkResponse(response);
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response);

      try {
        let errjson = await response.json();
        err.message = (this.isPrem) ? errjson.error : errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.FAILED_TO_DELETE_OBJECT;
      }

      throw storageErrorHandler(err);
    }
  }

  /**
   * @async
   * @property {Function} fetchMetadata
   * Fetches metadata for a reference.
   *
   * @param {Object} ref - The reference object.
   * @param {string} [access_token] - Access token for authentication.
   * @returns {Promise<Object>} The metadata object.
   * @throws {StorageError} If fetching metadata fails.
   */
  async fetchMetadata(ref, access_token) {

    const attributeList = {
      "cache-control": "cacheControl",
      "content-disposition": "contentDisposition",
      "content-encoding": "contentEncoding",
      "content-language": "contentLanguage",
      "content-length": "size",
      "last-modified": "updated",
    }


    let response = null;
    let result = null;
    const reqURL = this.URL + getMetadata_REST_EP +
      `/b/${this.bucket}?apiKey=${this.config.appID}`;

    // For OnPrem endpoint, getmetadata endpoint and request-response formats
    // are different altogether.

    if (this.isPrem) {
      const params = {
        method: "GET",
        headers: {
          "x-object-path": JSON.stringify({
            bucket: this.bucket,
            path: ref.fullPath
          })
        }
      }

      if (access_token) {
        params.headers["Authorization"] = `Bearer ${access_token}`;
      }

      try {
        response = await fetchWithRetry(reqURL, params, this.maxOperationRetryTime, this._app);
        Utils.checkResponse(response);
        result = await response.json();

        response.headers.forEach((value, key) => {
          if (key in attributeList) {
            const field = attributeList[key];
            result[field] = value;
          }

        });
      } catch (err) {
        Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

        try {
          let errjson = await response.json();
          err.message = (this.isPrem) ? errjson.error : errjson.message;
        }
        catch (jsonErr) {
          /* response is not JSON text */
          err.message = StorageErrorMessages.FAILED_TO_FETCH_METADATA;
        }

        throw storageErrorHandler(err);
      }

      result['name'] = ref.name;
      result['customMetadata'] = {};
      result['ref'] = ref;
      if (Object.prototype.hasOwnProperty.call(result, "opc-multipart-md5")) {
        result["md5Hash"] = result["opc-multipart-md5"];
        delete result["opc-multipart-md5"];
      }
      return result
    }


    let fullMetadata = {
      bucket: this.bucket,
      fullPath: ref.fullPath,
      name: ref.name,
      customMetadata: {}
    }

    const addToMetadata = (value, key) => {
      if (key in attributeList) {
        const field = attributeList[key];
        fullMetadata[field] = value;
      }
      /* user-defined metadata */
      else if (key.startsWith("opc-meta-")) {
        const field = key.substr(8);
        fullMetadata.customMetadata[field] = value;
      }
    }

    const params = {
      method: "GET",
      headers: {
        "x-object-path": JSON.stringify({
          bucket: this.bucket,
          path: ref.fullPath
        })
      }
    }

    if (access_token) {
      params.headers["Authorization"] = `Bearer ${access_token}`;
    }

    try {
      response = await fetchWithRetry(reqURL, params,
        this.maxOperationRetryTime, this._app);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);

      try {
        let errjson = await response.json();
        err.message = (this.isPrem) ? errjson.error : errjson.message;
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = StorageErrorMessages.UNKNOWN;
      }

      throw storageErrorHandler(err);
    }

    fullMetadata["bucket"] = result.bucket;
    fullMetadata["size"] = result.size;
    fullMetadata["fullPath"] = ref.fullPath;
    fullMetadata["timeCreated"] = result.updated;
    fullMetadata["contentType"] = result.contentType;
    fullMetadata["updated"] = result.updated;
    fullMetadata["md5Hash"] = result.md5Hash;
    fullMetadata["ref"] = ref;
    fullMetadata["storage"] = ref.storage;
    response.headers.forEach(addToMetadata);

    return fullMetadata;
  }
}

/**
 * CustomEvent - Internal class extending the Event class.
 * @extends Event
 */
export class CustomEvent extends Event {
  /**
   * Creates a new CustomEvent.
   *
   * @param {string} message - The event type.
   * @param {Object} data - Data object containing detail.
   */
  constructor(message, data) {
    super(message, data)
    this.detail = data.detail
  }
}
