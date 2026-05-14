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

/**
 * Represents a operation for a fieldvalue in a 
 * document to be applied to server.
 */
export class FieldValue {
  /**
   * Compares this `FieldValue` with another `FieldValue` instance.
   *
   * @param {FieldValue} other - Another `FieldValue` instance to compare.
   * @returns {boolean} `true` if both are equal, `false` otherwise.
   */
  /**
   * Compares this `FieldValue` with another `FieldValue` instance.
   *
   * @param {FieldValue} other - Another `FieldValue` instance to compare.
   * @returns {boolean} `true` if both are equal, `false` otherwise.
   * @throws {OracledbError} Throws an error if the provided object is not an 
   * instance of `FieldValue`.
   */
  isEqual(other: FieldValue): boolean;

  /**
   * Creates a `FieldValue` instance for remove operation in an array field.
   *
   * @param {...any} elements - Values that need to be removed.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  /**
   * Creates a `FieldValue` instance for remove operation in a array field.
   *
   * @param {number} elements - Multiple values that needs to be removed.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static arrayRemove(...elements: any[]): FieldValue;

  /**
   * Creates a `FieldValue` instance for union operation in an array field.
   *
   * @param {...any} elements - Values that need to be applied in union.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  /**
   * Creates a `FieldValue` instance for union operation in a array field.
   *
   * @param {number} elements - Multiple values that needs to be
   *  applied in union.
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static arrayUnion(...elements: any[]): FieldValue;

  /**
   * Creates a `FieldValue` instance for delete operation of a field.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  /**
   * Creates a `FieldValue` instance for delete operation of a field.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static delete(): FieldValue;

  /**
   * Creates a dense embedding payload.
   *
   * @example
   * await docRef.update({
   *   DENSE_EMB: FieldValue.denseVector([0.12, -0.91, 0.44])
   * });
   *
   * @example
   * await colRef.add({
   *   title: "vector doc",
   *   DENSE_EMB: FieldValue.denseVector([0.12, -0.91, 0.44])
   * });
   */
  static denseVector(values: number[]): { type: "dense"; values: number[] };

  /**
   * Creates a sparse embedding payload.
   *
   * @example
   * await docRef.update({
   *   SPARSE_EMB: FieldValue.sparseVector(1000, [3, 40, 777], [0.5, 0.8, 0.33])
   * });
   *
   * @example
   * await colRef.add({
   *   title: "sparse vector doc",
   *   SPARSE_EMB: FieldValue.sparseVector(1000, [3, 40, 777], [0.5, 0.8, 0.33])
   * });
   */
  static sparseVector(dimension: number, indices: number[], values: number[]): {
    type: "sparse";
    dimension: number;
    indices: number[];
    values: number[];
  };

  /**
   * Creates a `FieldValue` instance for deleting an embedding entry in v2.
   *
   * @example
   * await docRef.update({
   *   LEGACY_EMB: FieldValue.deleteVector()
   * });
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static deleteVector(): FieldValue;

  /**
   * Creates a `FieldValue` instance for increment operation in a number field.
   *
   * @param {number} n - The value to increment by. 
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  /**
   * Creates a `FieldValue` instance for increment operation in a number field.
   *
   * @param {number} value - The value to increment by. 
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static increment(n: number): FieldValue;

  /**
   * Creates a `FieldValue` instance for getting a server timestamp.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  /**
   * Creates a `FieldValue` instance for getting a server timestamp.
   *
   * @returns {FieldValue} `FieldValue` instance representing the change.
   */
  static serverTimestamp(): FieldValue;

  /**
   * Gets the value change.
   *
   * @returns {Array|string|number} The value change.
   */
  /** @internal */
  readonly value: any;

  /**
   * Gets the type of the operation on field value.
   *
   * @returns {string} The type of operation.
   */
  /** @internal */
  readonly operation: string;
}
