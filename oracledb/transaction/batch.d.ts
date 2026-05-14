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

import { DocumentReference } from "../collection/reference.js";
import { DocumentSnapshot } from "../collection/snapshot.js";
import { FieldPath } from "../field/path.js";

/**
 * A write batch is used to perform multiple writes as a single atomic unit.
 * A WriteBatch object can be acquired by calling Oracledb.batch(). It
 * provides methods for adding writes to the write batch. Partial failure is
 * not supported, so the entire batch will either succeed or fail.
 */
export class WriteBatch {
  /**
   * Write to the document referred to by the provided DocumentReference.
   * If the document does not exist yet, it will be created. If you provide
   * `merge` or `mergeFields`, the provided data can be merged into an existing
   * document.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.
   * @param options An object to configure the set behavior.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: { merge?: boolean; mergeFields?: Array<string | FieldPath> }
  ): WriteBatch;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * @param documentRef A reference to the document to be updated.
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  update(
    documentRef: DocumentReference<any>,
    data: { [field: string]: any }
  ): WriteBatch;

  /**
   * Updates fields in the document referred to by this `DocumentReference`.
   * The update will fail if applied to a document that does not exist.
   *
   * Nested fields can be update by providing dot-separated field path strings
   * or by providing `FieldPath` values.
   *
   * @param documentRef A reference to the document to be updated.
   * @param field The first field to update.
   * @param value The first value.
   * @param fieldsOrPrecondition Optional additional selector/value pairs or
   * a precondition if not using `fieldsOrPrecondition`.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...fieldsOrPrecondition: any[]
  ): WriteBatch;

  /**
   * Deletes the document referred to by the provided `DocumentReference`.
   *
   * @param documentRef A reference to the document to be deleted.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference<any>): WriteBatch;

  /**
   * Commits all of the writes in this write batch as a single atomic unit.
   *
   * The Oracledb type does not support preconditions.
   *
   * @returns A `Promise` resolved once all of the writes in the batch have been
   * successfully written to the backend as an atomic unit (note that it won't
   * resolve while you're offline).
   */
  commit(): Promise<void>;
}

/**
 * A transaction is a set of reads and writes that are guaranteed to
 * be atomic. Transactions are useful when you want to update a field's value
 * based on its current value, or perform other conditional writes.
 */
export class Transaction {
  /**
   * Reads the document referenced by the provided `DocumentReference.`
   *
   * @param documentRef A reference to the document to be read.
   * @returns A `DocumentSnapshot` of the read data.
   */
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;

  /**
   * Writes to the document referred to by the provided `DocumentReference`.
   * If the document does not exist yet, it will be created. If you pass
   * `SetOptions`, the provided data can be merged into the existing document.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.
   * @param options An object to configure the set behavior.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: { merge?: boolean; mergeFields?: Array<string | FieldPath> }
  ): Transaction;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * @param documentRef A reference to the document to be updated.
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  update(
    documentRef: DocumentReference<any>,
    data: { [field: string]: any }
  ): Transaction;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * Nested fields can be updated by providing dot-separated field path
   * strings or by providing `FieldPath` values.
   *
   * @param documentRef A reference to the document to be updated.
   * @param field The first field to update.
   * @param value The first value.
   * @param moreFieldsAndValues Additional key/value pairs.
   * @returns A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;

  /**
   * Deletes the document referred to by the provided `DocumentReference`.
   *
   * @param documentRef A reference to the document to be deleted.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference<any>): Transaction;
}
