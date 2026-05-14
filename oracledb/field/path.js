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

import { nullCheck } from "../utils/typecheck.js";

/**
 * FieldPath - It is used to refer to a field in a document. The path can
 * consist of one field name or can be a list of field names referring to
 * nested fields in the document.
 */
export class FieldPath {

  /**
  * @property 
  * (Private) path string
  */
  #fullPath = null;
  fullPathSec = null;

  /**
   * Creates a new `FieldPath` instance.
   *
   * @param {Array} arr - Array of multiple path tokens.
   */
  constructor(...arr) {
    nullCheck(arr, "Invalid argument passed");
    let path = "";
    let pathSec = "$FieldPath$";
    for (let i = 0; i < arr.length; i++) {
      path += arr[i];
      pathSec += arr[i]
      if (i < arr.length - 1) {
        pathSec += "#FieldPath#";
        path += ".";
      }
    }
    this.#fullPath = path;
    this.fullPathSec = pathSec
  }

  /**
   * @property 
   * Returns the path string pointing to the field.
   *
   * @returns {string} Path string.
   */
  get fullPath() {
    return this.#fullPath;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `FieldPath` is equal to the provided one.
   * the specified path.
   * 
   * @param {FieldPath} fb FieldPath to compare to.
   * @return {boolean} Returns true if both points to the same field.
   * @throws {OracledbError} Throws an error if fb is not a FieldPath instance.
   */
  isEqual(fp) {
    if (!(fp instanceof FieldPath)) {
      let error = new Error("The other instance to be compared should be a \
      FieldPath.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.fullPathSec === fp.fullPathSec;
  }


  /**
   * @property {Function} toString
   * Get the path string pointing to the field.
   * 
   * @return {string} Returns the path string.
   */
  toString() {
    return this.fullPathSec;
  }

  /**
   * @static
   * @property {Function} documentId
   * Creates a `FieldPath` instance for document ID.
   *
   * @returns {FieldPath} A new `FieldPath` instance.
   * time as the `Date` object.
   */
  static documentId() {
    const arr = [];
    arr.push("OID");
    return new FieldPath(...arr);
  }
}