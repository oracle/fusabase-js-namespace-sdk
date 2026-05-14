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
import { App } from "../../app/app.js";
import { Reference } from "./ref.js";

/**
 * Storage - Represents the Storage service.
 */
export class Storage {
  /**
   * Maximum operation retry time in milliseconds.
   */
  maxOperationRetryTime: number;

  /**
   * Maximum upload retry time in milliseconds.
   */
  maxUploadRetryTime: number;

  /**
   * Maximum upload size in bytes.
   */
  maxUploadBytes: number;

  /**
   * Creates a new `Storage` instance.
   *
   * @param {App} app - ObaaS App instance.
   */
  constructor(app: App);

  /**
   * Returns the Fusabase App instance.
   *
   * @returns {App} Fusabase App.
   */
  get app(): App;

  /**
   * Sets the maximum operation retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxOperationRetryTime(t: number): void;

  /**
   * Sets the maximum upload retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxUploadRetryTime(t: number): void;

  /**
   * Returns a reference for a path.
   *
   * @param {string} [path=""] - Path.
   * @returns {Reference} Reference instance.
   */
  ref(path?: string): Reference;

  /**
   * Returns a reference for a URL.
   *
   * @param {string} url - URL.
   * @returns {Reference} Reference instance.
   */
  refFromURL(url: string): Reference;
}
