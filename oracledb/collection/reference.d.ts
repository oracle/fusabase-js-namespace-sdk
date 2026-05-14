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

import { Query } from "./query.js";
import { DocumentSnapshot } from "./snapshot.js";
import { FieldPath } from "../field/path.js";
import { Oracledb } from "../internal/core.js";

/**
 * CollectionReference - Represents a reference to a collection.
 */
export class CollectionReference<T = any> extends Query<T> {
  id: string;
  parent: DocumentReference | null;
  path: string;

  /**
   * Creates a new `CollectionReference` instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} path - Path to the collection.
   * @param {DocumentReference} [parent=null] - Parent document.
   */
  constructor(db: Oracledb, path: string, parent?: DocumentReference | null);

  /**
   * Returns the DocumentReference for the document in the collection for the path.
   * @param {String} docPath
   * @return {DocumentReference < T >}
   */
  doc(docPath?: string): DocumentReference<T>;

  /**
   * Adds a new document to this collection.
   * @param {T} document
   * @return {Promise < DocumentReference < T > >}
   */
  add(data: T): Promise<DocumentReference<T>>;

  /**
   * Checks whether this `CollectionReference` is equal to the provided one.
   * 
   * @param {CollectionReference} colref CollectionReference that needs to be compared.
   * @return {boolean} Returns true if both CollectionReference instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if colref is not a CollectionReference
   *  instance.
   */
  isEqual(other: CollectionReference<T>): boolean;
}

/**
 * DocumentReference - Represents a reference to a document.
 */
export class DocumentReference<T = any> {
  id: string;
  parent: CollectionReference | null;
  path: string;
  readonly oracledb: Oracledb;

  /**
   * Creates a new `DocumentReference` instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} path - Path to the document.
   * @param {CollectionReference} [parent=null] - Parent collection.
   */
  constructor(db: Oracledb, path: string, parent?: CollectionReference | null);

  /**
   * Checks whether this `DocumentReference` is equal to the provided one.
   * 
   * @param {DocumentReference} docRef DocumentReference that needs to be compared.
   * @return {boolean} Returns true if both DocumentReference instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if docRef is not a DocumentReference
   *  instance.
   */
  isEqual(other: DocumentReference<T>): boolean;

  /**
   * Returns the CollectionReference for the collection at the specified path.
   * @param {String} colPath
   * @return {CollectionReference < T >}
   */
  collection(colPath: string): CollectionReference<T>;

  /**
   * Reads the document for this.
   * @return {Promise < DocumentSnapshot < T > >}
   */
  get(options?: { source: "server" }): Promise<DocumentSnapshot<T>>;

  /**
   * Updates fields for the document referred by this.
   * @param {T} data
   * @return {Promise < void >}
   */
  update(data: Partial<T>): Promise<void>;

  /**
   * Deletes the document referred by this.
   * @return {Promise < void >}
   */
  delete(): Promise<void>;

  /**
   * Writes to the document.
   * @param {T} data
   * @param {Object} setOptions
   * @return {Promise < void >}
   */
  set(data: T, setOptions?: { merge: boolean; mergeFields?: string[] }): Promise<void>;

  /**
   * Attaches callback to be executed on DocumentSnapshot events. This is related
   * to real time listening where we are using long-polling by default.
   * 
   * ( observer :  { complete ?: ( ) => void ; error ?: ( error :  \
   * OracledbError ) => void ; next ?: ( snapshot :  DocumentSnapshot => void ) )
   * 
   * ( onNext :  ( snapshot :  DocumentSnapshot < T > ) => void ,  onError ? :
   * ( error :  OracledbError ) => void ,  onCompletion ? :  ( ) => void )
   * 
   * @return {void}
   */
  onSnapshot(observer: { next?: (snapshot: DocumentSnapshot<T>) => void; error?: (error: Error) => void; complete?: () => void }): () => void;

  /**
   * Custom data converter, allowing to use user defined classes with database 
   * instance. When get is called on the query the results are returned after 
   * applying the converter. Passing null will remove the current converter.
   *
   * @param {Object} converter - Object with two functions "fromOracledb" and 
   * "toOracledb". fromOracledb will be used to convert the json objects to user
   * defined classes and toOracledb will be used to convert from user defined
   * classes to json objects.
   * @returns {DocumentReference} `DocumentReference` instance with converter.
   */
  withConverter<U>(converter: any): DocumentReference<U>;
}
