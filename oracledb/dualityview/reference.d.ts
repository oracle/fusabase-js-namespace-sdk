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

import { Query } from "../collection/query";
import { QuerySnapshot, DocumentSnapshot, QueryDocumentSnapshot } from "../collection/snapshot";
import { FieldPath } from "../field/path";
import { Oracledb } from "../internal/core";

/**
 * DualityViewColReference - Represents a reference to a duality view collection.
 */
export class DualityViewColReference<T = any> extends Query<T> {
  /**
   * Creates a new DualityViewColReference instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} name - Name of the duality view.
   */
  constructor(db: Oracledb, name: string);

  readonly type: 'dualityviewcollection';
  readonly id: string;
  readonly parent: null;

  /**
   * The path of the collection.
   */
  readonly path: string;
  readonly oracledb: Oracledb;

  /**
   * Returns the DualityViewDocReference for the document in the collection for the path.
   * @param {string} docPath - The document path.
   * @return {DualityViewDocReference<T>}
   */
  doc(docPath: string): DualityViewDocReference<T>;

  /**
   * Adds a new document to this collection.
   * @param {T} data - The document data.
   * @return {Promise<DualityViewDocReference<T>>}
   */
  add(data: T): Promise<DualityViewDocReference<T>>;

  /**
   * Executes the query and returns the result.
   * @return {Promise<QuerySnapshot<T>>}
   */
  get(): Promise<QuerySnapshot<T>>;

  /**
   * Checks if this reference is equal to another.
   * @param {DualityViewColReference<T>} other - The other reference.
   * @return {boolean}
   */
  isEqual(other: DualityViewColReference<T>): boolean;
}

/**
 * DualityViewDocReference - Represents a reference to a duality view document.
 */
export class DualityViewDocReference<T = any> {
  /**
   * Creates a new DualityViewDocReference instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} path - Path to the document.
   * @param {DualityViewColReference<T>} [parent] - Parent collection.
   */
  constructor(db: Oracledb, path: string, parent?: DualityViewColReference<T>);

  readonly type: 'dualityviewdocument';
  readonly id: string;
  readonly parent: DualityViewColReference<T>;

  /**
   * The path of the document.
   */
  readonly path: string;

  readonly oracledb: Oracledb;

  /**
   * Checks if this reference is equal to another.
   * @param {DualityViewDocReference<T>} other - The other reference.
   * @return {boolean}
   */
  isEqual(other: DualityViewDocReference<T>): boolean;

  /**
   * Reads the document for this reference.
   * @param {{ source: 'server' }} [options] - Options for the get operation.
   * @param {any} [trans_obj] - Transaction object.
   * @return {Promise<DocumentSnapshot<T>>}
   */
  get(options?: { source: 'server' }, trans_obj?: any): Promise<DocumentSnapshot<T>>;

  /**
   * Updates fields for the document referred by this.
   * @param {Partial<T> | { [key: string]: any }} data - The data to update.
   * @param {any} [trans_obj] - Transaction object.
   * @return {Promise<void>}
   */
  update(data: Partial<T> | { [key: string]: any }, trans_obj?: any): Promise<void>;

  /**
   * Updates specific fields for the document.
   * @param {string | FieldPath} field - The field to update.
   * @param {any} value - The value.
   * @param {...any} moreFieldsAndValues - More fields and values.
   * @return {Promise<void>}
   */
  update(field: string | FieldPath, value: any, ...moreFieldsAndValues: any[]): Promise<void>;

  /**
   * Deletes the document referred by this.
   * @param {any} [trans_obj] - Transaction object.
   * @return {Promise<void>}
   */
  delete(trans_obj?: any): Promise<void>;

  /**
   * Writes to the document.
   * @param {T} data - The data to set.
   * @param {{ merge?: boolean; mergeFields?: (string | FieldPath)[] }} [setOptions] - Options for set.
   * @param {any} [trans_obj] - Transaction object.
   * @return {Promise<void>}
   */
  set(data: T, setOptions?: { merge?: boolean; mergeFields?: (string | FieldPath)[] }, trans_obj?: any): Promise<void>;

  /**
   * Applies a custom data converter to this reference.
   * @param {any} converter - The converter.
   * @return {DualityViewDocReference<U>}
   */
  withConverter<U>(converter: any): DualityViewDocReference<U>;
}
