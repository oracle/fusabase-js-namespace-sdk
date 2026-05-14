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
// 

import { Utils, getAccessToken } from "../utils/utils.js";
import { FieldPath } from "../field/path.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { QueryHelper } from "../utils/query_helper.js";
import { oracledbErrorHandler } from "../errors.js";

/**
 * AggregateField - Represents the aggregation that needs to be applied.
 */
export class AggregateField {

  /**
  * @property 
  * (Private) A type string to uniquely identify instances.
  */
  type;

  /**
  * @property 
  * (Private) Aggregate operation.
  */
  aggregateType;

  /**
  * @property 
  * (Private) Field name.
  */
  field;

  /**
   * (Private) Creates a new `AggregateField` instance.
   *
   * @param {String} field - Field name.
   * @param {String} op - Aggregate option.
   */
  constructor(field, op) {
    this.type = "AggregateField";
    this.aggregateType = op;
    this.field = field;
  }

  /**
   * @static
   * @property {Function} sum
   * Creates a `AggregateField` instance for sum operation.
   *
   * @param {String} field - Field name to which operation needs to be applied.
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static sum(field) {
    if (field instanceof FieldPath) {
      field = field.fullPath;
    }
    argCheck(field, "Invalid field provided in AggregateField.", true,
       [typeStrings.STRING]);
    return new AggregateField(field, "sum");
  }

  /**
   * @static
   * @property {Function} average
   * Creates a `AggregateField` instance for average operation.
   *
   * @param {String} field - Field name to which operation needs to be applied.
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static average(field) {
    if (field instanceof FieldPath) {
      field = field.fullPath;
    }
    argCheck(field, "Invalid field provided in AggregateField.", true,
       [typeStrings.STRING]);
    return new AggregateField(field, "avg");
  }

  /**
   * @static
   * @property {Function} count
   * Creates a `AggregateField` instance for count operation.
   *
   * @returns {AggregateField} A new `AggregateField` instance.
   */
  static count() {
    return new AggregateField("", "count");
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `AggreagteField` is equal to the provided one.
   * 
   * @param {AggregateField} other AggregateField that needs to be compared.
   * @return {boolean} Returns true if both AggregateField instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if other is not an AggregateField
   *  instance.
   */
  isEqual(other) {
    if (!(other instanceof AggregateField)) {
      let error = new Error("The other instance to be compared should be an \
      instance of AggregateField.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return other.field === this.field && other.aggregateType === this.aggregateType;
  }
}


/**
 * AggregateQuery - Query class to store aggregate queries.
 */
export class AggregateQuery {

  /**
  * @property 
  * (Private) Underlying query over which the aggregations are applied.
  */
  #query = null;

  /**
  * @property 
  * (Private) Helper class.
  */
  #queryHelper = null;

  /**
   * (Private) Creates a new `AggregateQuery` instance.
   *
   * @param {Query} q - Underlying query.
   * @param {Object} obj - Aggregations that needs to be applied.
   */
  constructor(q, obj) {
    this.#queryHelper = new QueryHelper(q.oracledb.app);
    this.#query = q;
    if (obj) {
      this.#query._aggregate.push(obj);
    }
  }

  /**
   * @property 
   * Returns the underlying query over which the aggregations are applied.
   *
   * @returns {Query} Underlying query.
   */
  get query() {
    return this.#query;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `AggregateQuery` is equal to the provided one.
   * 
   * @param {AggregateQuery} q Query that needs to be compared.
   * @return {boolean} Returns true if both queries are the same.
   * @throws {OracledbError} Throws an error if q is not a AggregateQuery instance.
   */
  isEqual(q) {
    if (!(q instanceof AggregateQuery)) {
      let error = new Error("The other instance to be compared should be an \
      instance of AggregateQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.#query.isEqual(q);
  }

  /**
   * @property {Function} get
   * Executes the aggregate query and gets the result.
   * 
   * @return {AggregateQuerySnapshot} Returns snapshot of query result.
   * @throws {OracledbError} Throws an error if requests fails.
   */
  async get() {
    let promJson;
    let result = null;
    const access_token = await getAccessToken(this.#query.oracledb.app);

    try {
      promJson = await this.#queryHelper.fetchDocuments(this.#query, access_token);
    } catch (err) {
      Utils.baasTrace(this.#query.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }

    if (promJson) {
      result = new AggregateQuerySnapshot(this.#query, promJson["ret"][0]["result"]);
    }
    return result;
  }
}


/**
 * AggregateQuerySnapshot - Snapshot class to store the results of aggregate 
 * query execution.
 */
export class AggregateQuerySnapshot {

  /**
  * @property 
  * (Private) Underlying query over which the aggregations are applied.
  */
  _query = null;

  /**
  * @property 
  * (Private) Retrieved data from query.
  */
  _data = null;

  /**
   * Creates a new `AggregateQuerySnapshot` instance.
   *
   * @param {Query} q - Underlying query.
   * @param {Object} data - Data received after query execution.
   */
  constructor(q, data) {
    this._data = data;
    this._query = q;
  }

  /**
   * @property 
   * Returns the underlying query over which the aggregations are applied.
   *
   * @returns {Query} Path string.
   */
  get query() {
    return this._query;
  }

  /**
   * @property 
   * Returns the type of snapshot class (Used to identify
   * `AggregateQuerySnapshot`)
   *
   * @returns {String} Type of snapshot.
   */
  get type() {
    return "AggregateQuerySnapshot";
  }

  /**
   * @property 
   * Returns the data received after query execution.
   *
   * @returns {Object} Aggregate result.
   */
  data() {
    return this._data;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `AggregateQuerySnapshot` is equal to the provided one.
   * 
   * @param {AggregateQuerySnapshot} snap Snapshot to compare from.
   * @return {boolean} Returns true if both snapshots are the same.
   * @throws {OracledbError} Throws an error if fb is not a FieldPath instance.
   */
  isEqual(snap) {
    if (!(snap instanceof AggregateQuerySnapshot)) {
      let error = new Error("The other instance to be compared should be an \
      instance of AggregateQuerySnapshot.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    let res = snap.query.isEqual(this.query);
    if (!res) { return false; }
    return JSON.stringify(snap.data()) === JSON.stringify(this.data());
  }
}