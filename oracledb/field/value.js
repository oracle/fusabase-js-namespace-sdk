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
import { validateDenseVector, validateSparseEmbedding } from "../utils/utils.js";

/**
 * Represents a operation for a fieldvalue in a 
 * document to be applied to server.
 */
export class FieldValue {

  /**
  * @property 
  * (Private) Gets the value change.
  */
  #value;

  /**
  * @property 
  * (Private) Gets the type of the operation on field value.
  */
  #operation;

  /**
   * Creates a new `FieldValue` instance.
   * Private constructor
   *
   * @param {string} op - The type of operation to be applied on the field.
   * @param {Array|string|number} value - The value changed that needs to be 
   * applied.
   */
  constructor(op, value) {
    this.#value = value;
    this.#operation = op;
  }

  /**
   * @property {Function} isEqual
   * Compares this `FieldValue` with another `FieldValue` instance.
   *
   * @param {FieldValue} other - Another `FieldValue` instance to compare.
   * @returns {boolean} `true` if both are equal, `false` otherwise.
   * @throws {OracledbError} Throws an error if the provided object is not an 
   * instance of `FieldValue`.
   */
  isEqual(other) {
    if (!(other instanceof FieldValue)) {
      let error = new Error(`The provided object must be an instance of \
       FieldValue.`);
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return compareValues(this.value, other.value)
      && this.operation === other.operation;
  }

  /**
   * @property value
   * Gets the value change.
   *
   * @returns {Array|string|number} The value change.
   */
  get value() {
    return this.#value;
  }

  /**
   * @property operation
   * Gets the type of the operation on field value.
   *
   * @returns {string} The type of operation.
   */
  get operation() {
    return this.#operation;
  }

  /**
   * @static
   * @property {Function} arrayRemove
   * Creates a `FieldValue` instance for remove operation in a array field.
   *
   * @param {number} elements - Multiple values that needs to be removed.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static arrayRemove(...elements) {
    nullCheck(elements, "Invalid arguments passed");
    return new FieldValue("FieldValue:arrayRemove", elements);
  }

  /**
   * @static
   * @property {Function} arrayUnion
   * Creates a `FieldValue` instance for union operation in a array field.
   *
   * @param {number} elements - Multiple values that needs to be
   *  applied in union.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static arrayUnion(...elements) {
    nullCheck(elements, "Invalid arguments passed");
    return new FieldValue("FieldValue:arrayUnion", elements);
  }

  /**
   * @static
   * @property {Function} delete
   * Creates a `FieldValue` instance for delete operation of a field.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static delete() {
    return new FieldValue("FieldValue:delete", null);
  }

  static deleteVector() {
    return new FieldValue("FieldValue:deleteVector", null);
  }

  static denseVector(values) {
    validateDenseVector(values, "denseVector values must be a numeric array.");
    return { type: "dense", values };
  }

  static sparseVector(dimension, indices, values) {
    validateSparseEmbedding({ type: "sparse", dimension, indices, values });
    return { type: "sparse", dimension, indices, values };
  }

  /**
   * @static
   * @property {Function} increment
   * Creates a `FieldValue` instance for increment operation in a number field.
   *
   * @param {number} value - The value to increment by. 
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static increment(value) {
    nullCheck(value, "Invalid argument passed");
    return new FieldValue("FieldValue:increment", value);
  }

  /**
   * @static
   * @property {Function} serverTimestamp
   * Creates a `FieldValue` instance for getting a server timestamp.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static serverTimestamp() {
    return new FieldValue("FieldValue:serverTimestamp", "servertimestamp");
  }
}

function compareValues(x, y) {
  // Helper function to compare arrays
  function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    arr1.sort();
    arr2.sort();
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }

  // Case: both are arrays
  if (Array.isArray(x) && Array.isArray(y)) {
    return arraysEqual(x, y);
  }

  // Case: neither is an array
  return x === y;
}
