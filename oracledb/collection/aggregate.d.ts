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
import { FieldPath } from "../field/path.js";

/**
 * AggregateField - Represents the aggregation that needs to be applied.
 */
export class AggregateField {
  /**
   * Creates a `AggregateField` instance for sum operation.
   *
   * @param {string} field - Field name to which operation needs to be applied.
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static sum(field: string | FieldPath): AggregateField;

  /**
   * Creates a `AggregateField` instance for average operation.
   *
   * @param {string} field - Field name to which operation needs to be applied.
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static average(field: string | FieldPath): AggregateField;

  /**
   * Creates a `AggregateField` instance for count operation.
   *
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static count(): AggregateField;

  /**
   * Checks whether this `AggreagteField` is equal to the provided one.
   * 
   * @param {AggregateField} other AggregateField that needs to be compared.
   * @return {boolean} Returns true if both AggregateField instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if other is not an AggregateField
   *  instance.
   */
  isEqual(other: AggregateField): boolean;
}

/**
 * AggregateQuery - Query class to store aggregate queries.
 */
export class AggregateQuery<T = any> {
  /**
   * The query whose aggregations will be calculated by this object.
   */
  /**
   * Returns the underlying query over which the aggregations are applied.
   *
   * @returns {Query} Path string.
   */
  readonly query: Query<T>;

  /**
   * Executes the aggregate query and gets the result.
   * 
   * @return {AggregateQuerySnapshot} Returns snapshot of query result.
   * @throws {OracledbError} Throws an error if requests fails.
   */
  get(): Promise<AggregateQuerySnapshot<T>>;

  /**
   * Checks whether this `AggregateQuery` is equal to the provided one.
   * 
   * @param {AggregateQuery} q Query that needs to be compared.
   * @return {boolean} Returns true if both queries are the same.
   * @throws {OracledbError} Throws an error if q is not a AggregateQuery instance.
   */
  isEqual(q: AggregateQuery): boolean;
}

/**
 * AggregateQuerySnapshot - Snapshot class to store the results of aggregate 
 * query execution.
 */
export class AggregateQuerySnapshot<T = any> {
  /**
   * The query that was executed to produce this results.
   */
  /**
   * Returns the underlying query over which the aggregations are applied.
   *
   * @returns {Query} Path string.
   */
  readonly query: Query<T>;

  /**
   * Returns the data received after query execution.
   *
   * @returns {Object} Aggregate result.
   */
  data(): T;

  /**
   * Returns the type of snapshot class (Used to identify
   * `AggregateQuerySnapshot`)
   *
   * @returns {String} Type of snapshot.
   */
  readonly type: string;

  /**
   * Checks whether this `AggregateQuerySnapshot` is equal to the provided one.
   * 
   * @param {AggregateQuerySnapshot} snap Snapshot to compare from.
   * @return {boolean} Returns true if both snapshots are the same.
   * @throws {OracledbError} Throws an error if fb is not a FieldPath instance.
   */
  isEqual(snap: AggregateQuerySnapshot): boolean;
}
