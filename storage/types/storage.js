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

import { TaskState, TaskEvent } from "./taskstate.js";
import { StorageHelper } from "../implementation/storage_impl.js";
import { Reference } from "./ref.js";
import { argCheck, typeStrings } from "../util/typecheck.js";
import { StorageErrorMessages, storageErrorHandler } from "../errors.js";

const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ""));
}

function throwInvalidReferenceURL() {
  const error = new Error(StorageErrorMessages.INVALID_REFERENCE_URL);
  error.status = 400;
  throw storageErrorHandler(error);
}

function storageBasePath(host, module, projectID, isParUrl = false) {
  const hostUrl = new URL(host.endsWith("/") ? host : `${host}/`);
  const servicePath = isParUrl
    ? `_/baas-services/${module}/par/${projectID}/`
    : `_/baas-services/${module}/${projectID}/`;
  return new URL(servicePath, hostUrl).pathname;
}

function isOciObjectStorageHost(hostname) {
  const normalizedHost = hostname.toLowerCase();
  return /^objectstorage\.[a-z0-9-]+\.oraclecloud\.com$/.test(normalizedHost) ||
    /^[^.]+\.objectstorage\.[a-z0-9-]+\.oci\.customer-oci\.com$/.test(normalizedHost);
}

function parseBucketAndObjectPath(pathname, expectedBucket, searchStart = 0) {
  const indexOfBucket = pathname.indexOf('/b/', searchStart);
  const indexOfObject = indexOfBucket >= 0
    ? pathname.indexOf('/o/', indexOfBucket + 3)
    : -1;
  if (indexOfBucket < 0 || indexOfObject < 0 || indexOfObject <= indexOfBucket + 3) {
    throwInvalidReferenceURL();
  }

  let bucket;
  let decodedPath;
  try {
    bucket = decodeURIComponent(pathname.substring(indexOfBucket + 3, indexOfObject));
    decodedPath = decodeURIComponent(pathname.substring(indexOfObject + 3));
  } catch {
    throwInvalidReferenceURL();
  }

  if (bucket !== expectedBucket || decodedPath === "") {
    throwInvalidReferenceURL();
  }

  return decodedPath;
}

function parseConfiguredBaasReferenceURL(parsedURL, config, bucket) {
  let configHostURL;
  let allowedBasePaths;
  try {
    configHostURL = new URL(config.host.endsWith("/") ? config.host : `${config.host}/`);
    allowedBasePaths = [
      storageBasePath(config.host, config.module, config.projectID),
      storageBasePath(config.host, config.module, config.projectID, true),
    ];
  } catch {
    throwInvalidReferenceURL();
  }

  if (parsedURL.origin !== configHostURL.origin) {
    return null;
  }

  const matchedBasePath = allowedBasePaths.find((basePath) =>
    parsedURL.pathname.startsWith(basePath)
  );
  if (!matchedBasePath) {
    return null;
  }

  return parseBucketAndObjectPath(
    parsedURL.pathname,
    bucket,
    Math.max(0, matchedBasePath.length - 1)
  );
}

function parseOciObjectStorageReferenceURL(parsedURL, config, bucket) {
  if (config.module !== 'oci-objs' ||
    parsedURL.protocol !== "https:" ||
    !isOciObjectStorageHost(parsedURL.hostname)) {
    return null;
  }

  return parseBucketAndObjectPath(parsedURL.pathname, bucket);
}

function validateReferenceURL(url, config, bucket) {
  let parsedURL;
  try {
    parsedURL = new URL(url);
  } catch {
    throwInvalidReferenceURL();
  }

  if (!["http:", "https:"].includes(parsedURL.protocol)) {
    throwInvalidReferenceURL();
  }

  const objectPath =
    parseConfiguredBaasReferenceURL(parsedURL, config, bucket) ??
    parseOciObjectStorageReferenceURL(parsedURL, config, bucket);

  if (objectPath == null) {
    throwInvalidReferenceURL();
  }

  return objectPath;
}

function resolveMaxUploadBytes(value) {
  if (value == null) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  if (!Number.isSafeInteger(value) || value <= 0) {
    const error = new Error(StorageErrorMessages.INVALID_MAX_UPLOAD_SIZE);
    error.status = 400;
    throw storageErrorHandler(error);
  }

  return value;
}

/**
 * Storage - Represents the Storage service.
 */
export class Storage {
  /**
   * @property 
   * Maximum operation retry time in milliseconds.
   */
  maxOperationRetryTime = 10000;

  /**
   * @property 
   * Maximum upload retry time in milliseconds.
   */
  maxUploadRetryTime = 10000;

  /**
   * @property
   * Maximum upload size in bytes.
   */
  maxUploadBytes = DEFAULT_MAX_UPLOAD_BYTES;

  /**
   * @property 
   * (Private) Application instance.
   */
  #app = null;

  /**
   * @property 
   * (Private) Storage helper instance.
   */
  #storageHelper = null;

  /**
   * @static
   * @property {Object} TaskState
   * Task state constants.
   */
  static TaskState = TaskState;

  /**
   * @static
   * @property {Object} TaskEvent
   * Task event constants.
   */
  static TaskEvent = TaskEvent;

  /**
   * Creates a new `Storage` instance.
   *
   * @param {App} app - ObaaS App instance.
   */
  constructor(app) {
    const configuredMaxUploadBytes =
      app.config?.maxUploadBytes ?? app.options.maxUploadBytes;
    this.maxUploadBytes = resolveMaxUploadBytes(configuredMaxUploadBytes);
    let config = {
      host: app.options.ordsHost,
      schema: app.options.schema,
      projectID: app.options.projectID,
      chunkSize: app.options.chunkSize,
      maxUploadBytes: this.maxUploadBytes,
      appID: app.options.appID,
      module: (app.config.objsType === 'dbfs' ? 'dbfs' : 'oci-objs')
    };
    let bucket = app.config.storageBucket;
    this.#storageHelper = new StorageHelper(config, bucket, app.logLevel, this.maxOperationRetryTime, this.maxUploadRetryTime);
    this.#storageHelper._setApp(app);
    this.#app = app;
  }

  /**
   * @property 
   * Returns the Fusabase App instance.
   *
   * @returns {App} Fusabase App.
   */
  get app() {
    return this.#app;
  }

  /**
   * @property 
   * Returns the log level.
   *
   * @returns {number} Log level.
   */
  get logLevel() {
    return this.#app.logLevel;
  }

  /**
   * @property 
   * Returns the storage bucket.
   *
   * @returns {string} Storage bucket.
   */
  get bucket() {
    return this.#storageHelper.bucket;
  }

  /**
   * @property 
   * Returns the storage configuration.
   *
   * @returns {Object} Storage config.
   */
  get config() {
    return this.#storageHelper.config;
  }

  /**
   * @property {Function} setMaxOperationRetryTime
   * Sets the maximum operation retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxOperationRetryTime(t) {
    argCheck(t, "Time should be a valid number", true, [typeStrings.INT]);
    this.maxOperationRetryTime = t;
  }

  /**
   * @property {Function} setMaxUploadRetryTime
   * Sets the maximum upload retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxUploadRetryTime(t) {
    argCheck(t, "Time should be a valid number", true, [typeStrings.INT]);
    this.maxUploadRetryTime = t;
  }

  /**
   * @property {Function} __initUploadController
   * (Private) Initializes the upload controller.
   *
   * @param {Object} metadata - Metadata for upload.
   * @returns {Promise} Promise resolving to upload controller.
   */
  __initUploadController(metadata) {
    return this.#storageHelper.initUploadController(metadata);
  }

  /**
   * @property {Function} __getLists
   * (Private) Lists the files.
   *
   * @param {boolean} recurse - Whether to recurse into subdirectories.
   * @param {string} [path=""] - Path to list.
   * @param {Object} listOptions - List options.
   * @param {string} access_token - Access token.
   * @returns {Promise} Promise resolving to list result.
   */
  __getLists(recurse, path = "", listOptions, access_token) {
    return this.#storageHelper.getLists(recurse, path, listOptions, access_token);
  }

  /**
   * @property {Function} __fetchDownloadUrl
   * (Private) Fetches the download URL.
   *
   * @param {string} path - Path to file.
   * @param {string} access_token - Access token.
   * @returns {Promise} Promise resolving to download URL.
   */
  __fetchDownloadUrl(path, access_token) {
    return this.#storageHelper.fetchDownloadUrl(path, access_token);
  }

  /**
   * @property {Function} __fetchMetadata
   * (Private) Fetches metadata.
   *
   * @param {Reference} ref - Reference to file.
   * @param {string} access_token - Access token.
   * @returns {Promise} Promise resolving to metadata.
   */
  __fetchMetadata(ref, access_token) {
    return this.#storageHelper.fetchMetadata(ref, access_token);
  }

  /**
   * @property {Function} __deleteObject
   * (Private) Deletes an object.
   *
   * @param {string} path - Path to object.
   * @param {string} access_token - Access token.
   * @returns {Promise} Promise resolving when deleted.
   */
  __deleteObject(path, access_token) {
    return this.#storageHelper.deleteObject(path, access_token);
  }

  /**
   * @property {Function} set app
   * Sets the app instance.
   *
   * @param {App} app_ - App instance.
   */
  set app(app_) {
    this.#app = app_;
  }

  /**
   * @property {Function} ref
   * Returns a reference for a path.
   *
   * @param {string} [path=""] - Path.
   * @returns {Reference} Reference instance.
   */
  ref(path = "") {
    argCheck(path, StorageErrorMessages.INVALID_REFERENCE_PATH, false, [typeStrings.STRING]);
    if (isHttpUrl(path)) {
      return this.refFromURL(path);
    }
    return new Reference(this, path);
  }

  /**
   * @property {Function} refFromURL
   * Returns a reference for a URL.
   *
   * @param {string} url - URL.
   * @returns {Reference} Reference instance.
   */
  refFromURL(url) {
    argCheck(url, StorageErrorMessages.INVALID_REFERENCE_URL, true, [typeStrings.STRING]);
    const decodedPath = validateReferenceURL(url, this.config, this.bucket);
    return new Reference(this, decodedPath);
  }
}
