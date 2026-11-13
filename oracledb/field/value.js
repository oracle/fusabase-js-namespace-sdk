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
import { oracledbErrorHandler } from "../errors.js";

/**
 * Sentinel value describing a server-side field transformation.
 *
 * @example
 * await db.collection('counters').doc('daily').update({ count: FieldValue.increment(1) });
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
   * Creates a field transformation. Prefer the static factory methods such as
   * `increment()` and `arrayUnion()`.
   *
   * @param {string} op - The type of operation to be applied on the field.
   * @param {Array|string|number} value - The value changed that needs to be 
   * applied.
   * @returns {FieldValue} The constructed transformation.
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
   *
   * @example
   * FieldValue.increment(1).isEqual(FieldValue.increment(1));
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
   *
   * @example
   * console.log(FieldValue.increment(1).value); // 1
   */
  get value() {
    return this.#value;
  }

  /**
   * @property operation
   * Gets the type of the operation on field value.
   *
   * @returns {string} The type of operation.
   *
   * @example
   * console.log(FieldValue.delete().operation); // "FieldValue:delete"
   */
  get operation() {
    return this.#operation;
  }

  /**
   * @static
   * @property {Function} arrayRemove
   * Creates a `FieldValue` instance for remove operation in a array field.
   *
   * @param {...any} elements - Values to remove from an array field.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   *
   * @example
   * await ref.update({ tags: FieldValue.arrayRemove('archived') });
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
   * @param {...any} elements - Values to add when not already present.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   *
   * @example
   * await ref.update({ tags: FieldValue.arrayUnion('featured') });
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
   *
   * @example
   * await ref.update({ obsoleteField: FieldValue.delete() });
   */
  static delete() {
    return new FieldValue("FieldValue:delete", null);
  }

  /**
   * Creates a transformation that removes a vector field.
   *
   * @returns {FieldValue} Vector-delete transformation.
   * @example
   * await ref.update({ embedding: FieldValue.deleteVector() });
   */
  static deleteVector() {
    return new FieldValue("FieldValue:deleteVector", null);
  }

  /**
   * Creates a dense vector value for vector fields and vector search.
   *
   * @param {number[]} values - Numeric vector values.
   * @returns {{type: string, values: number[]}} Dense vector value.
   * @example
   * await ref.set({ embedding: FieldValue.denseVector([0.1, 0.2]) });
   */
  static denseVector(values) {
    validateDenseVector(values, "denseVector values must be a numeric array.");
    return { type: "dense", values };
  }

  /**
   * Creates a sparse vector value for vector fields and vector search.
   *
   * @param {number} dimension - Total vector dimension.
   * @param {number[]} indices - Non-zero element indices.
   * @param {number[]} values - Values corresponding to `indices`.
   * @returns {{type: string, dimension: number, indices: number[], values: number[]}} Sparse vector value.
   * @example
   * const embedding = FieldValue.sparseVector(8, [1, 5], [0.7, 0.3]);
   */
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
   *
   * @example
   * await ref.update({ count: FieldValue.increment(1) });
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
   *
   * @example
   * await ref.update({ updatedAt: FieldValue.serverTimestamp() });
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
