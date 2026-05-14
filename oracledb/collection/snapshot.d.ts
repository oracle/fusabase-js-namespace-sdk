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

import { FieldPath } from "../field/path.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { Query } from "./query.js";
import { DocumentReference } from "./reference.js";

/**
 * QuerySnapshot - Snapshot class to store the results of query execution.
 */
export class QuerySnapshot<T = any> {
  /**
   * Creates a new `QuerySnapshot` instance.
   *
   * @param snaps Array of document snapshots.
   * @param query Underlying query.
   * @param metadata Snapshot metadata.
   */
  /**
   * Creates a new `QuerySnapshot` instance.
   *
   * @param {Array} snaps - Array of document snapshots.
   * @param {Query} query - Underlying query.
   * @param {SnapshotMetadata} metadata - Snapshot metadata.
   */
  constructor(snaps: QueryDocumentSnapshot<T>[], query: Query<T>, metadata: SnapshotMetadata);

  /**
   * The query on which you called get() or onSnapshot() in order to get this QuerySnapshot.
   */
  /**
   * The query on which you called get() or onSnapshot() in order to get this QuerySnapshot.
   */
  readonly query: Query<T>;

  /**
   * Metadata about this snapshot, concerning its source and if it has local modifications.
   */
  /**
   * Metadata about this snapshot, concerning its source and if it has local modifications.
   */
  readonly metadata: SnapshotMetadata;

  /**
   * Returns an array of the documents that changed since the last snapshot.
   * If this is the first snapshot, all documents will be in the list as 'added' changes.
   */
  /**
   * Returns an array of document changes.
   *
   * @param {Object} [options] - Options for changes.
   * @returns {Array} Array of document changes.
   */
  docChanges(options?: { includeMetadataChanges: boolean }): Array<{
    /** The type of change ('added', 'modified', or 'removed'). */
    type: 'added' | 'removed' | 'modified';
    /** The document affected by this change. */
    doc: QueryDocumentSnapshot<T>;
    /** The index of the changed document in the result set immediately prior to this DocumentChange (i.e. supposing that all prior DocumentChange objects have been applied). -1 for 'added' events. */
    oldIndex: number;
    /** The index of the changed document in the result set immediately after this DocumentChange (i.e. supposing that all prior DocumentChange objects have been applied). -1 for 'removed' events. */
    newIndex: number;
  }>;

  /** An array of all the documents in the QuerySnapshot. */
  /**
   * An array of all the documents in the QuerySnapshot.
   */
  readonly docs: ReadonlyArray<QueryDocumentSnapshot<T>>;

  /** The number of documents in the QuerySnapshot. */
  /**
   * The number of documents in the QuerySnapshot.
   */
  readonly size: number;

  /** True if there are no documents in the QuerySnapshot. */
  /**
   * True if there are no documents in the QuerySnapshot.
   */
  readonly empty: boolean;

  /**
   * Enumerates all of the documents in the QuerySnapshot.
   *
   * @param callback A callback to be called with a `QueryDocumentSnapshot` for each document in the snapshot.
   * @param thisArg The `this` binding for the callback.
   */
  /**
   * Enumerates all of the documents in the QuerySnapshot.
   *
   * @param {Function} callback - Callback function to execute for each document.
   */
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void;

  /**
   * Checks whether this `QuerySnapshot` is equal to the provided one.
   *
   * @param {QuerySnapshot} snap - Snapshot to compare.
   * @returns {boolean} True if equal, false otherwise.
   * @throws {OracledbError} Throws an error if snap is not a QuerySnapshot instance.
   */
  isEqual(snap: QuerySnapshot<T>): boolean;
}

/**
 * A `DocumentSnapshot` contains data read from a document in your database.
 * The data can be extracted with `.data()` or `.get(<field>)` to get a
 * specific field.
 */
/**
 * A `DocumentSnapshot` contains data read from a document in your database.
 * The data can be extracted with `.data()` or `.get(<field>)` to get a
 * specific field.
 */
export class DocumentSnapshot<T = any> {
  /** True if the document exists. */
  /**
   * True if the document exists.
   */
  readonly exists: boolean;
  /** A `DocumentReference` to the document location. */
  /**
   * A `DocumentReference` to the document location.
   */
  readonly ref: DocumentReference<T>;
  /** The ID of the document for which this `DocumentSnapshot` contains data. */
  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  readonly id: string;
  /** Metadata about this snapshot concerning its source and if it has local modifications. */
  /**
   * Metadata about this snapshot concerning its source and if it has local modifications.
   */
  readonly metadata: SnapshotMetadata;

  /**
   * Retrieves all fields in the document as an `Object`. Returns 'undefined' if the document doesn't exist.
   *
   * @returns An `Object` containing all fields in the document or 'undefined' if the document doesn't exist.
   */
  /**
   * Retrieves all fields in the document as an `Object`. Returns 'undefined' if the document doesn't exist.
   *
   * @returns An `Object` containing all fields in the document or 'undefined' if the document doesn't exist.
   */
  data(): T | undefined;

  /**
   * Retrieves the field specified by `fieldPath`.
   *
   * @param fieldPath The field (e.g. 'foo') or field path (e.g. 'foo.bar') to return.
   * @returns The data at the specified field location or undefined if no such field exists.
   */
  /**
   * Retrieves the field specified.
   *
   * @param {string|FieldPath} fieldName - Field name or path.
   * @param {Object} [options] - Options for retrieval.
   * @returns {any} Field value or null.
   * @throws {OracledbError} Throws an error if document does not exist or invalid field name.
   */
  get(fieldPath: string | FieldPath): any;

  /**
   * Checks whether this `DocumentSnapshot` is equal to the provided one.
   *
   * @param {DocumentSnapshot} snap - Snapshot to compare.
   * @returns {boolean} True if equal, false otherwise.
   * @throws {OracledbError} Throws an error if snap is not a DocumentSnapshot instance.
   */
  isEqual(snap: DocumentSnapshot<T>): boolean;
}

/**
 * A `QueryDocumentSnapshot` contains data read from a document in your
 * database as part of a query. The document is guaranteed to exist and its data
 * can be extracted with `.data()` or `.get(<field>)` to get a
 * specific field.
 *
 * A `QueryDocumentSnapshot` offers the same API surface as a
 * `DocumentSnapshot`. Since query results contain only existing documents, the
 * `exists` property will always be true and `data()` will never return
 * 'undefined'.
 */
/**
 * A `QueryDocumentSnapshot` contains data read from a document in your
 * database as part of a query. The document is guaranteed to exist and its data
 * can be extracted with `.data()` or `.get(<field>)` to get a
 * specific field.
 *
 * A `QueryDocumentSnapshot` offers the same API surface as a
 * `DocumentSnapshot`. Since query results contain only existing documents, the
 * `exists` property will always be true and `data()` will never return
 * 'undefined'.
 */
export class QueryDocumentSnapshot<T = any> extends DocumentSnapshot<T> {
  /**
   * Retrieves all fields in the document as an `Object`.
   *
   * @override
   *
   * @returns An `Object` containing all fields in the document.
   */
  /**
   * Retrieves all fields in the document as an `Object`.
   *
   * @override
   *
   * @returns An `Object` containing all fields in the document.
   */
  data(): T;
}
