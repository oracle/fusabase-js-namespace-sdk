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

import { App } from "../../app/app.js"; // Adjust import as needed
import { CollectionReference, DocumentReference } from "../collection/reference.js";
import { Query } from "../collection/query.js";
import { Transaction, WriteBatch } from "../transaction/batch.js";
import { LoadBundleTask } from "./bundle.js";
import {BulkUpdate} from "../transaction/bulk.js";
import { DualityViewColReference, DualityViewDocReference } from "../dualityview/reference.js";

/**
 * Oracledb - Represents a database instance.
 */
export class Oracledb {
  /**
   * @param app The app for this Oracledb service.
   */
  app: App;
  /**
   * Creates a new `Oracledb` instance.
   * Private constructor
   *
   * @param {App} app - fusabase app instance.
   */
  constructor(app: App);

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified absolute path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @returns The `CollectionReference` instance.
   */
  /**
   * Method to get `CollectionReference` instance that refers to the collection
   * for the given path.
   * 
   * @param {String} colPath
   * @returns {CollectionReference}
   */
  collection(collectionPath: string): CollectionReference<any>;

  /**
   * Gets a `DocumentReference` instance that refers to the document at the
   * specified abolsute path.
   *
   * @param documentPath A slash-separated path to a document.
   * @returns The `DocumentReference` instance.
   */
  /**
   * Method to get `DocumentReference` instance that refers to the document at 
   * the specified path.
   * 
   * @param {String} docPath
   * @return {DocumentReference}
   */
  doc(documentPath: string): DocumentReference<any>;

  /**
   * Creates and returns a new Query that includes all documents in the
   * database that are contained in a collection or subcollection with the
   * given `collectionId`.
   *
   * @param collectionId Identifies the collections to query over. Every
   * collection or subcollection with this ID as the last segment of its path
   * will be included. Cannot contain a slash.
   * @returns The created `Query`.
   */
  /**
   * Method to get `CollectionReference` instance that refers to the collection
   * group with the given name.
   * 
   * @param {String} name
   * @return {CollectionReference}
   */
  collectionGroup(collectionId: string): Query<any>;

  /**
   * Creates and returns a BulkUpdate instance that can be used to bulk update
   * the docs.
   *
   * @param path Path to the collection
   * @returns The created `BulkUpdate`.
   */
  /**
   * Method to get `BulkUpdate` instance for the path.
   * 
   * @param {String} path
   * @return {BulkUpdate}
   */
  updateDocs(path: string): BulkUpdate;

  /**
   * Executes the given `updateFunction` and then attempts to commit the changes
   * applied within the transaction. If any document read within the transaction
   * has changed, retries the `updateFunction`. If it fails to
   * commit after 5 attempts, the transaction fails.
   *
   * The maximum number of writes allowed in a single transaction is 500.
   *
   * @param updateFunction
   *     The function to execute within the transaction context.
   *
   * @returns If the transaction completed successfully or was explicitly aborted
   * (the `updateFunction` returned a failed promise), the promise returned by the
   * `updateFunction `is returned here.
   */
  /**
   * Executes the callback function that gets a `Transaction` object and
   * uses it to read and write data. It applies the changes and finally
   * commits the changes. If it fails to commit after 5 attempts, the 
   * transaction fails.
   * 
   * @param {Function} callback // Function to execute.
   * @param {number} attempts   // Number of attempts to retry transaction.
   * @return {Promise <T>}
   */
  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T>;

  /**
   * Creates a write batch, used for performing multiple writes as a single
   * atomic operation. The maximum number of writes allowed in a single {@link WriteBatch}
   * is 500.
   *
   * Unlike transactions, write batches are persisted offline and therefore are
   * preferable when you don't need to condition your writes on read data.
   *
   * @returns A `WriteBatch` that can be used to atomically execute multiple writes.
   */
  /**
   * Creates a write batch where multiple writes can be grouped together
   * as a single operation.
   * 
   * @return {WriteBatch}
   */
  batch(): WriteBatch;

  /**
   * Creates and returns a new Qery that applies a join.
   * 
   * @param {String} viewName
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if join is used on a namedQuery.
   */
  join(viewName: string): Query<any>;

  /**
   * Specifies custom settings to be used to configure the `Oracledb`
   * instance. Can only be invoked once and before any other Oracledb method.
   *
   * If settings are provided via both `settings()` and the `oracledbOptions`
   * (environment variable or console), the `settings()` values take
   * precedence.
   *
   * @param settings The settings to use for all Oracledb usage.
   */
  /**
   * Configures settings for the database instance.
   *
   * @param {Object} obj - Settings object.
   */
  settings(settings: any): void;

  /**
   * Method to get `DualityViewColReference` instance that refers to the duality 
   * view with the given name.
   * 
   * @param {String} name
   * @return {DualityViewColReference}
   */
  dualityViewCollection(name: string): DualityViewColReference;

  /**
   * Method to get `DualityViewDocReference` instance that refers to the duality 
   * view document with the given path.
   * 
   * @param {String} docPath
   * @return {DualityViewDocReference}
   */
  dualityViewDoc(docPath: string): DualityViewDocReference;

  /**
   * Sets the log level for this database instance.
   * 
   * @returns {null}
   */
  setLogLevel(log: any): void;

  toJSON(): object;
}
