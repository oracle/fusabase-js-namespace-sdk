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
import { oracledbErrorHandler } from "../errors.js";

/**
 * References a document field, including nested fields.
 *
 * @example
 * const namePath = new FieldPath('profile', 'name');
 * query.where(namePath, '==', 'Ada');
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
   * @param {...string} arr - One or more field-path segments.
   * @returns {FieldPath} The constructed field path.
   *
   * @example
   * const path = new FieldPath('address', 'city');
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
   * Gets the dotted path used in queries and field access.
   *
   * @returns {string} Path string.
   *
   * @example
   * console.log(path.fullPath); // "address.city"
   */
  get fullPath() {
    return this.#fullPath;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this path has the same field segments as another path.
   * 
   * @param {FieldPath} fp - Field path to compare.
   * @returns {boolean} `true` when both paths are equal.
   * @throws {OracledbError} When `fp` is not a `FieldPath`.
   *
   * @example
   * new FieldPath('address', 'city').isEqual(new FieldPath('address', 'city'));
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
   * Gets the encoded field-path representation used internally by the SDK.
   * 
   * @returns {string} Encoded field-path representation.
   *
   * @example
   * const encoded = new FieldPath('address', 'city').toString();
   */
  toString() {
    return this.fullPathSec;
  }

  /**
   * @static
   * @property {Function} documentId
   * Creates a `FieldPath` instance for document ID.
   *
   * @returns {FieldPath} A path that refers to the document ID (`OID`).
   *
   * @example
   * query.where(FieldPath.documentId(), '==', 'user-123');
   */
  static documentId() {
    const arr = [];
    arr.push("OID");
    return new FieldPath(...arr);
  }
}
