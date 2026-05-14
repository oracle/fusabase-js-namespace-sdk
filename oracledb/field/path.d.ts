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

/**
 * FieldPath - It is used to refer to a field in a document. The path can
 * consist of one field name or can be a list of field names referring to
 * nested fields in the document.
 */
export class FieldPath {
  /**
   * Creates a new `FieldPath` instance.
   *
   * @param {...string} fieldNames - One or more field names representing the path.
   */
  /**
   * Creates a new `FieldPath` instance.
   *
   * @param {Array} arr - Array of multiple path tokens.
   */
  constructor(...fieldNames: string[]);

  /**
   * Returns the path string pointing to the field.
   *
   * @returns {string} Path string.
   */
  /**
   * Returns the path string pointing to the field.
   *
   * @returns {string} Path string.
   */
  /** @internal */
  readonly fullPath: string;

  /**
   * Checks whether this `FieldPath` is equal to the provided one.
   *
   * @param {FieldPath} other FieldPath to compare to.
   * @return {boolean} Returns true if both point to the same field.
   */
  /**
   * Checks whether this `FieldPath` is equal to the provided one.
   * the specified path.
   * 
   * @param {FieldPath} fb FieldPath to compare to.
   * @return {boolean} Returns true if both points to the same field.
   * @throws {OracledbError} Throws an error if fb is not a FieldPath instance.
   */
  isEqual(other: FieldPath): boolean;

  /**
   * Creates a `FieldPath` instance for document ID.
   *
   * @returns {FieldPath} A new `FieldPath` instance.
   */
  /**
   * Creates a `FieldPath` instance for document ID.
   *
   * @returns {FieldPath} A new `FieldPath` instance
   * to refer to the ID of a document
   */
  static documentId(): FieldPath;

  /**
   * Get the path string pointing to the field.
   * 
   * @return {string} Returns the path string.
   */
  toString(): string;
}
