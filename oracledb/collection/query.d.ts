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

import { AggregateQuery } from "./aggregate.js";
import { QuerySnapshot } from "./snapshot.js";
import { DocumentSnapshot } from "./snapshot.js";
import { FieldPath } from "../field/path.js";
import { Oracledb } from "../internal/core.js";

/**
 * Query - Query class to store all the clauses and parameters. 
 */
/**
 * Query - Query class to store all the clauses and parameters. 
 */
export class Query<T = any> {
  type: string;
  readonly oracledb: Oracledb;

  /**
   * Creates a new `Query` instance.
   *
   * @param {Oracledb} db - Database instance.
   */
  constructor(db: Oracledb);

  /**
   * Custom data converter, allowing to use user defined classes with database 
   * instance. When get is called on the query the results are returned after 
   * applying the converter. Passing null will remove the current converter.
   *
   * @param {Object} converter - Object with two functions "fromOracledb" and 
   * "toOracledb". fromOracledb will be used to convert the json objects to user
   * defined classes and toOracledb will be used to convert from user defined
   * classes to json objects.
   * @returns {Query} `Query` instance with converter.
   */
  withConverter<U>(converter: any): Query<U>;

  /**
   * Checks whether this `Query` is equal to the provided one.
   * 
   * @param {Query} quer Query instance that needs to be compared.
   * @return {boolean} Returns true if both Query instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if quer is not a Query
   *  instance.
   */
  isEqual(other: Query<T>): boolean;

  withVectorSearch(vectorSearch: any): Query<T>;

  /**
   * Creates a vector similarity query for v2 queries.
   *
   * @example
   * const q = colRef.findNearest(
   *   "EMB",
   *   { vector: [0.22, 0.93, -0.1] },
   *   { metric: "COSINE", topK: 10 }
   * );
   * const snap = await q.get();
   *
   * @example
   * const qSparse = colRef.findNearest(
   *   "EMB",
   *   { sparse: { type: "sparse", dimension: 1000, indices: [2, 7, 900], values: [0.9, 0.3, 0.5] } },
   *   { metric: "DOT", topK: 5 }
   * );
   * const sparseSnap = await qSparse.get();
   */
  findNearest(
    field: string,
    query: { vector: number[]; sparse?: never } | { sparse: { type: "sparse"; dimension: number; indices: number[]; values: number[] }; vector?: never },
    options?: { metric?: "COSINE" | "EUCLIDEAN" | "DOT"; topK?: number; threshold?: number }
  ): Query<T>;

  /**
   * Creates and returns a new query with the additional conditions to filter 
   * data. It applies a where clause to the query.
   * 
   * @param {String|FieldPath} field - Field name. 
   * @param {String} opStr - Operator to be used with where. 
   * "==", ">=", "<=", "<", ">", "in", "not-in", "like", "!="
   * (supported operators)
   * @param {string|number} fieldValue - Value to be used while applying
   * operator.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if where is used on a namedQuery.
   */
  where(field: string | FieldPath, opStr: string, fieldValue: any): Query<T>;

  /**
   * Creates and returns a new query that along with a where clause filters
   * documents to start from the provided document (inclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if startAt is used on a namedQuery.
   */
  startAt(...args: any[]): Query<T>;

  /**
   * Creates and returns a new query that along with a where clause filters
   * documents to end at the provided document (inclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if endAt is used on a namedQuery.
   */
  endAt(...args: any[]): Query<T>;

  /**
   * Creates and returns a new query that along with a where clause filters
   * documents to start after the provided document (exclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if startAfter is used on a namedQuery.
   */
  startAfter(...args: any[]): Query<T>;

  /**
   * Creates and returns a new query that along with a where clause filters
   * documents to end before the provided document (exclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if endBefore is used on a namedQuery.
   */
  endBefore(...args: any[]): Query<T>;

  /**
   * Creates and returns a new query that applies a limit clause to the 
   * query. It returns the documents with a constraint on the number of
   * documents to be returned. It returns the last matching documents.
   * 
   * @param {number} limitValue - The maximum number of items to return.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if limitToLast is used on a namedQuery.
   */
  limitToLast(limitValue: number): Query<T>;

  /**
   * Creates and returns a Query that when executed returns documents sorted
   * by the given field. If not specified, it sorts the values in ascending
   * order.
   * 
   * @param {String} fieldName - Field name to apply order by on.
   * @param {String} dirStr - Direction or order by "asc" or "desc".
   * @return {Query} - New Query instance.
   * @throws {OracledbError} Throws an error if orderBy is used on a namedQuery.
   */
  orderBy(fieldName: string | FieldPath, dirStr?: "asc" | "desc"): Query<T>;

  /**
   * Creates and returns a new query that applies a limit clause to the 
   * query. It returns the documents with a constraint on the number of
   * documents to be returned.
   * 
   * @param {number} limitValue - The maximum number of items to return.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if limit is used on a namedQuery.
   */
  /**
   * Creates and returns a new query that applies a limit clause to the 
   * query. It returns the documents with a constraint on the number of
   * documents to be returned.
   * 
   * @param {number} limitValue - The maximum number of items to return.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if limit is used on a namedQuery.
   */
  limit(limitValue: number): Query<T>;

  /**
   * Applies column selection to the query.
   *
   * @param {Array} arr - Array of column names.
   * @return {Query} Returns a Query instance.
   */
  column(arr: string[]): Query<T>;



  /**
   * Creates a AggregateQuery with aggregate operation as count.
   * 
   * @return {AggregateQuery} Returns a AggregateQuery instance.
   * @throws {OracledbError} Throws an error if count is used on a namedQuery.
   */
  count(): AggregateQuery;

  /**
   * Creates a AggregateQuery with aggregate operation of type sum or average.
   * 
   * @param {Object} obj - Object containing aggregate operations
   * {
   *    totalPopulation: oracledb.AggregateField.sum('population')
   * }
   * @return {AggregateQuery} Returns a AggregateQuery instance.
   * @throws {OracledbError} Throws an error if aggregate is used on a namedQuery.
   */
  aggregate(obj: { [key: string]: any }): AggregateQuery;

  /**
   * Executes the query and return the result in form of snapshot.
   * 
   * @return {QuerySnapshot}
   */
  get(): Promise<QuerySnapshot<T>>;

  /**
   * Attaches callback to be executed on QuerySnapshot events. This is related
   * to real time listening where we are using long-polling by default.
   * 
   * ( observer :  { complete ?: ( ) => void ; error ?: ( error :  \
   * OracledbError ) => void ; next ?: ( snapshot :  QuerySnapshot => void ) )
   * 
   * ( onNext :  ( snapshot :  QuerySnapshot < T > ) => void ,  onError ? :
   * ( error :  OracledbError ) => void ,  onCompletion ? :  ( ) => void )
   * 
   * @return {void}
   */
  onSnapshot(observer: { next?: (snapshot: QuerySnapshot<T>) => void; error?: (error: Error) => void; complete?: () => void }): () => void;
}
