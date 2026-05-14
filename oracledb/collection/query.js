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

import { argCheck, typeStrings, nullCheck } from "../utils/typecheck.js";
import { QueryHelper } from "../utils/query_helper.js";
import { oracledbErrorHandler } from "../errors.js";
import { AggregateQuery } from "./aggregate.js";
import { QuerySnapshot } from "./snapshot.js";
import { DocumentSnapshot, QueryDocumentSnapshot } from "./snapshot.js";
import { Utils, createUniqueName, getAccessToken, getToken, validateVectorSearchQuery } from "../utils/utils.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { FieldPath } from "../field/path.js";
import { deepEqual } from "../utils/utils_helper.js";
import { extractCallbacksForSnapshot } from "../utils/snapshot_util.js";
import { IdTokenResult } from "../../auth/types/idtoken.js";

/**
 * Query - Query class to store all the clauses and parameters. 
 */
export class Query {

  /**
  * @property 
  * (Private) Holds information about where clause.
  */
  _conditions = [];

  /**
  * @property 
  * (Private) Holds information about oraderBy clause.
  */
  _explicitOrder = [];

  /**
  * @property 
  * (Private) Holds information about joins.
  */
  _joins = [];

  /**
  * @property 
  * (Private) Holds information about aggregates that needs to be applied.
  */
  _aggregate = [];

  /**
  * @property 
  * (Private) Holds columns names for getdoc.
  */
  _column = [];

  /**
  * @property 
  * (Private) Holds information about limit clause.
  */
  _limit = 0;

  /**
  * @property 
  * (Private) Used to store the key of document id.
  */
  __pk = "OID";

  /**
  * @property 
  * (Private) Holds path that of the document/collection.
  */
  _path = [];

  /**
  * @property 
  * (Private) Collection group if any.
  */
  _col_group = "";

  /**
  * @property 
  * (Private) Helper class
  */
  _queryHelper = null;

  /**
  * @property 
  * (Private) Holds row ids. Only fetches the results for these particular
  * row ids.
  */
  _brid = [];

  /**
  * @property 
  * (Private) Holds server timestamps. 
  */
  _serverTimestamp = [];

  /**
  * @property 
  * (Private) if true query will return row ids with the response. 
  */
  _rt = 0;

  /**
  * @property 
  * (Private) Object that stores the converter functions that can be used to 
  * convert the json object to user defined class form and from user defined
  * class form to json object.
  */
  converter;

  /**
  * @property 
  * (Private) A type string to uniquely identify instances.
  */
  type;

  /**
  * @property 
  * Database instance.
  */
  oracledb;

  _ops;

  _vectorSearch;

  /**
   * Creates a new `Query` instance.
   *
   * @param {Oracledb} db - Database instance.
   */
  constructor(db) {
    this.type = "query";
    this.oracledb = db;
    this.converter = null;
    this._queryHelper = new QueryHelper(db.app);
    this._ops = [];
    this._vectorSearch = undefined;
  }

  /**
   * @property {Function} __copyQuery
   * Creates a new `Query` instance and copies all the parameters from this
   * to the new one.
   *
   * @returns {Query} A new `Query` instance.
   */
  __copyQuery() {
    let newQuery = new Query(this.oracledb);
    newQuery._path = []
    for (let i = 0; i < this._path.length; i++) {
      newQuery._path.push(this._path[i]);
    }
    newQuery._conditions = []
    for (let i = 0; i < this._conditions.length; i++) {
      newQuery._conditions.push(this._conditions[i]);
    }
    newQuery._serverTimestamp = []
    for (let i = 0; i < this._serverTimestamp.length; i++) {
      newQuery._serverTimestamp.push(this._serverTimestamp[i]);
    }
    newQuery._explicitOrder = []
    for (let i = 0; i < this._explicitOrder.length; i++) {
      newQuery._explicitOrder.push(this._explicitOrder[i]);
    }
    newQuery._joins = []
    for (let i = 0; i < this._joins.length; i++) {
      newQuery._joins.push(this._joins[i]);
    }
    newQuery._limit = this._limit;
    newQuery._aggregate = []
    newQuery._brid = []
    newQuery._column = []
    for (let i = 0; i < this._aggregate.length; i++) {
      newQuery._aggregate.push(this._aggregate[i]);
    }
    for (let i = 0; i < this._ops.length; i++) {
      newQuery._ops.push(this._ops[i]);
    }
    for (let i = 0; i < this._column.length; i++) {
      newQuery._column.push(this._column[i]);
    }
    newQuery._col_group = this._col_group;
    newQuery._rt = this._rt;
    newQuery._vectorSearch = this._vectorSearch == null ? undefined : JSON.parse(JSON.stringify(this._vectorSearch));
    newQuery.type = this.type;
    return newQuery;
  }

  /**
   * @property {Function} withConverter
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
  withConverter (converter) {
    this.converter = converter;
    return this;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `Query` is equal to the provided one.
   * 
   * @param {Query} quer Query instance that needs to be compared.
   * @return {boolean} Returns true if both Query instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if quer is not a Query
   *  instance.
   */
  isEqual(quer) {
    if (!quer) {
      return false;
    }
    if (!(quer instanceof Query)) {
      let error = new Error("The other instance to be compared should be an \
      instance of Query.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    if (this._conditions.length !== quer._conditions.length ||
      this._explicitOrder.length !== quer._explicitOrder.length ||
      this._joins.length !== quer._joins.length ||
      this._aggregate.length !== quer._aggregate.length) {
      return false;
    }

    for (let i = 0; i < this._conditions.length; i++) {
      if (this._conditions[i].field !== quer._conditions[i].field ||
        this._conditions[i].op !== quer._conditions[i].op ||
        this._conditions[i].value !== quer._conditions[i].value) {
        return false;
      }
    }

    for (let i = 0; i < this._serverTimestamp.length; i++) {
      if (this._serverTimestamp[i] !== quer._serverTimestamp[i]) {
        return false;
      }
    }

    for (let i = 0; i < this._brid.length; i++) {
      if (this._brid[i] !== quer._brid[i]) {
        return false;
      }
    }

    for (let i = 0; i < this._aggregate.length; i++) {
      if (this._aggregate[i].func !== quer._aggregate[i].func ||
        this._aggregate[i].field !== quer._aggregate[i].field ||
        this._aggregate[i].op_key !== quer._aggregate[i].op_key) {
        return false;
      }
    }

    for (let i = 0; i < this._explicitOrder.length; i++) {
      if (this._explicitOrder[i].field !== quer._explicitOrder[i].field ||
        this._explicitOrder[i].direction !== quer._explicitOrder[i].direction) {
        return false;
      }
    }

    if (!deepEqual(this._joins, quer._joins)) {
      return false;
    }

    for (let i = 0; i < this._path.length; i++) {
      if (this._path[i] !== quer._path[i]) {
        return false;
      }
    }

    if (!deepEqual(this._vectorSearch, quer._vectorSearch)) {
      return false;
    }

    return this.__pk === quer.__pk && this._limit === quer._limit &&
      this._col_group === quer._col_group && this._rt === quer._rt;
  }

  withVectorSearch(vectorSearch) {
    let newQuery = this.__copyQuery();
    newQuery._vectorSearch = vectorSearch;
    return newQuery;
  }

  findNearest(field, query, options) {
    argCheck(field, "Invalid vector search field", true, [typeStrings.STRING]);
    validateVectorSearchQuery(query);
    if (options != null) {
      if (options.topK != null && (!Number.isInteger(options.topK) || options.topK <= 0)) {
        const error = new Error("findNearest topK must be a positive integer.");
        error.status = 400;
        throw oracledbErrorHandler(error);
      }
      if (options.threshold != null && typeof options.threshold !== "number") {
        const error = new Error("findNearest threshold must be a number.");
        error.status = 400;
        throw oracledbErrorHandler(error);
      }
    }
    return this.withVectorSearch({
      field,
      query,
      metric: options ? options.metric : undefined,
      topK: options ? options.topK : undefined,
      threshold: options ? options.threshold : undefined,
    });
  }

  /**
   * @property {Function} where
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
  where(field, opStr, fieldValue) {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (field instanceof FieldPath) {
      field = field.fullPath;
    }
    argCheck(field, "Invalid field provided", true, [typeStrings.STRING]);
    argCheck(opStr, "Invalid operation provided", true, [typeStrings.STRING]);
    if (opStr === "array-contains-any") {
      for (let i = 0;i<this._ops.length;i++) {
        if (this._ops[i] === "array-contains") {
          let error = new Error("array-contains-any can't be used with array-contains.");
          error.status = 400;
          throw oracledbErrorHandler(error);
        }
      }
    }
    if (opStr === "array-contains") {
      for (let i = 0;i<this._ops.length;i++) {
        if (this._ops[i] === "array-contains-any") {
          let error = new Error("array-contains-any can't be used with array-contains.");
          error.status = 400;
          throw oracledbErrorHandler(error);
        }
      }
    }
    this._ops.push(opStr);
    if (opStr !== "is-null") {
      nullCheck(fieldValue, "Invalid value provided.");
    }
    
    if (fieldValue == null && fieldValue === "") {
      return this.__copyQuery();
    }
    let operators = ["==", ">=", "<=", "<", ">", "in", "not-in", "like", "!=",
       "array-contains", "array-contains-any", "is-null"];

    if (!operators.includes(opStr)) {
      let error = new Error("Incorrect comparison operator");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    opStr = opStr === "==" ? "=" : opStr;
    opStr = opStr === "is-null" ? "is NULL" : opStr;
    opStr = opStr === "not-in" ? "not in" : opStr;

    if ((opStr==="in" || opStr === "not in") && !Array.isArray(fieldValue)) {
      fieldValue = [fieldValue];
    }
    let _cond = {
      field: field,
      op: opStr,
      value: fieldValue,
    };
    let newQuery = this.__copyQuery();
    newQuery._conditions = Array.from(this._conditions);
    newQuery._conditions.push(_cond);
    return newQuery;
  }

  /**
   * @property {Function} startAt
   * Creates and returns a new query that along with a where clause filters
   * documents to start from the provided document (inclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if startAt is used on a namedQuery.
   */
  startAt() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let newQuery = this.__copyQuery();
    newQuery._conditions = Array.from(this._conditions);
    if (arguments[0] instanceof DocumentSnapshot) {
      let _cond = {
        field: newQuery._explicitOrder[0].field,
        op: ">=",
        value: arguments[0].get(newQuery._explicitOrder[0].field),
      };
      newQuery._conditions.push(_cond);
    }
    else {
      for (let i = 0; i < arguments.length; i++) {
        let _cond = {
          field: newQuery._explicitOrder[i].field,
          op: ">=",
          value: arguments[i],
        };
        newQuery._conditions.push(_cond);
      }
    }
    return newQuery;
  }

  /**
   * @property {Function} endAt
   * Creates and returns a new query that along with a where clause filters
   * documents to end at the provided document (inclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if endAt is used on a namedQuery.
   */
  endAt() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let newQuery = this.__copyQuery();
    newQuery._conditions = Array.from(this._conditions);
    if (arguments[0] instanceof DocumentSnapshot) {
      let _cond = {
        field: newQuery._explicitOrder[0].field,
        op: "<=",
        value: arguments[0].get(newQuery._explicitOrder[0].field),
      };
      newQuery._conditions.push(_cond);
    }
    else {
      for (let i = 0; i < arguments.length; i++) {
        let _cond = {
          field: newQuery._explicitOrder[i].field,
          op: "<=",
          value: arguments[i],
        };
        newQuery._conditions.push(_cond);
      }
    }
    return newQuery;
  }

  /**
   * @property {Function} startAfter
   * Creates and returns a new query that along with a where clause filters
   * documents to start after the provided document (exclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if startAfter is used on a namedQuery.
   */
  startAfter() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let newQuery = this.__copyQuery();
    newQuery._conditions = Array.from(this._conditions);
    if (arguments[0] instanceof DocumentSnapshot) {
      let _cond = {
        field: newQuery._explicitOrder[0].field,
        op: ">",
        value: arguments[0].get(newQuery._explicitOrder[0].field),
      };
      newQuery._conditions.push(_cond);
    }
    else {
      for (let i = 0; i < arguments.length; i++) {
        let _cond = {
          field: newQuery._explicitOrder[i].field,
          op: ">",
          value: arguments[i],
        };
        newQuery._conditions.push(_cond);
      }
    }
    return newQuery;
  }

  /**
   * @property {Function} endBefore
   * Creates and returns a new query that along with a where clause filters
   * documents to end before the provided document (exclusive) 
   * or fieldvalue.
   * 
   * @param {DocumentSnapshot|any[]} - Provided document or the fieldvalues.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if endBefore is used on a namedQuery.
   */
  endBefore() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let newQuery = this.__copyQuery();
    newQuery._conditions = Array.from(this._conditions);
    if (arguments[0] instanceof DocumentSnapshot) {
      let _cond = {
        field: newQuery._explicitOrder[0].field,
        op: "<",
        value: arguments[0].get(newQuery._explicitOrder[0].field),
      };
      newQuery._conditions.push(_cond);
    }
    else {
      for (let i = 0; i < arguments.length; i++) {
        let _cond = {
          field: newQuery._explicitOrder[i].field,
          op: "<",
          value: arguments[i],
        };
        newQuery._conditions.push(_cond);
      }
    }
    return newQuery;
  }

  /**
   * @property {Function} limitToLast
   * Creates and returns a new query that applies a limit clause to the 
   * query. It returns the documents with a constraint on the number of
   * documents to be returned. It returns the last matching documents.
   * 
   * @param {number} limitValue - The maximum number of items to return.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if limitToLast is used on a namedQuery.
   */
  limitToLast(limitValue) {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    argCheck(limitValue, "Invalid limit value passed", true,
       [typeStrings.INT]);

    let newQuery = this.__copyQuery();
    for (let i = 0; i < this._explicitOrder.length; i++) {
      if (this._explicitOrder[i].direction === 'asc') {
        newQuery._explicitOrder[i].direction = 'desc';
      }
      else {
        newQuery._explicitOrder[i].direction = 'asc';
      }
    }
    newQuery._limit = limitValue;
    return newQuery;
  }

  /**
   * @property {Function} orderBy
   * Creates and returns a Query that when executed returns documents sorted
   * by the given field. If not specified, it sorts the values in ascending
   * order.
   * 
   * @param {String} fieldName - Field name to apply order by on.
   * @param {String} dirStr - Direction or order by "asc" or "desc".
   * @return {Query} - New Query instance.
   * @throws {OracledbError} Throws an error if orderBy is used on a namedQuery.
   */
  orderBy(fieldName, dirStr = "asc") {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (fieldName instanceof FieldPath) {
      fieldName = fieldName.fullPath;
    }
    argCheck(fieldName, "Invalid field name passed", true,
      [typeStrings.STRING]);
    argCheck(dirStr, "Invalid direction string passed", true,
      [typeStrings.STRING]);
    if (!["asc", "desc"].includes(dirStr)) {
      let error = new Error("Invalid direction.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    let _order = {
      field: fieldName,
      direction: dirStr,
    };
    let newQuery = this.__copyQuery();
    newQuery._explicitOrder = Array.from(this._explicitOrder);
    newQuery._explicitOrder.push(_order);
    return newQuery;
  }

  /**
   * @property {Function} limit
   * Creates and returns a new query that applies a limit clause to the 
   * query. It returns the documents with a constraint on the number of
   * documents to be returned.
   * 
   * @param {number} limitValue - The maximum number of items to return.
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if limit is used on a namedQuery.
   */
  limit(limitValue) {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    argCheck(limitValue, "Invalid limit value passed", true,
      [typeStrings.INT]);

    if (!(limitValue > 0)) {
      let error = new Error("Invalid limit provided.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let newQuery = this.__copyQuery();
    newQuery._limit = limitValue;
    return newQuery;
  }

  /**
   * @property {Function} column
   * Applies column selection to the query.
   *
   * @param {Array} arr - Array of column names.
   * @return {Query} Returns a Query instance.
   */
  column (arr) {
    argCheck(arr, "Invalid names passed", true, [typeStrings.ARRAY]);
    let newQuery = this.__copyQuery();
    newQuery._column = [];
    for (let i=0;i<arr.length;i++) {
      newQuery._column.push(arr[i]);
    }
    return newQuery;
  }

  /**
   * @property {Function} count
   * Creates a AggregateQuery with aggregate operation as count.
   * 
   * @return {AggregateQuery} Returns a AggregateQuery instance.
   * @throws {OracledbError} Throws an error if count is used on a namedQuery.
   */
  count() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    const agg_obj = { "func": "count", "field": "", "op_key": "" };
    let newQuery = this.__copyQuery();
    return new AggregateQuery(newQuery, agg_obj);
  }

  /**
   * @property {Function} aggregate
   * Creates a AggregateQuery with aggregate operation of type sum or average.
   * 
   * @param {Object} obj - Object containing aggregate operations
   * {
   *    totalPopulation: oracledb.AggregateField.sum('population')
   * }
   * @return {AggregateQuery} Returns a AggregateQuery instance.
   * @throws {OracledbError} Throws an error if aggregate is used on a namedQuery.
   */
  aggregate(obj) {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    argCheck(obj, "Invalid aggregate object", true,
      [typeStrings.OBJECT]);
    var agg_obj = []

    Object.entries(obj).map(entry => {
      let key = entry[0];
      let value = entry[1];
      agg_obj.push({
        "func": value.aggregateType,
        "field": value.field,
        "op_key": key
      });
      return null;
    });

    let newQuery = this.__copyQuery();
    newQuery._aggregate = agg_obj;

    return new AggregateQuery(newQuery, null);
  }

  /**
   * @async
   * @property {Function} get
   * Executes the query and return the result in form of snapshot.
   * 
   * @return {QuerySnapshot}
   */
  async get() {
    if (this.type === "namedquery") {
      const referenceModule = await import("./reference.js");
      const DocumentReference = referenceModule.DocumentReference;
      //retrieve data
      let qdata = await this.oracledb.__getBundleData(this._path[0]);
      let qdocs = [];
      for (var i = 0; i < qdata["documents"].length; i++) {
        let docRef = new DocumentReference(this.oracledb, qdata["documents"][i]["path"].substring(1));
        docRef.converter = this.converter;
        qdocs.push(new QueryDocumentSnapshot({
          "DOCUMENT": qdata["documents"][i]["data"]
        }, docRef, new SnapshotMetadata(true, false)));
      }

      let querSnap = new QuerySnapshot(qdocs, this,
        new SnapshotMetadata(true, false));
      return querSnap;
    }
    let promJson;
    const access_token = await getAccessToken(this.oracledb.app);

    try {
      promJson = await this._queryHelper.fetchDocuments(this, access_token);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      const q_meta = new SnapshotMetadata(false, false);
      return new QuerySnapshot([], this, q_meta);
    }

    if (promJson) {
      const referenceModule = await import("./reference.js");
      const CollectionReference = referenceModule.CollectionReference;
      const DocumentReference = referenceModule.DocumentReference;
      Utils.baasLogger(this.oracledb.app.logLevel, "Fetched DocSnaps!");
      let data = promJson["ret"];
      let docSnaps = [];
      let colCopy = new CollectionReference(this.oracledb, this._path.join("/"));
      colCopy.converter = this.converter;
      data.forEach((_doc) => {
        let doc = _doc["osons"];
        let id = doc[this.__pk];
        const _meta = new SnapshotMetadata(false, false);
        let ref = null;
        if (_doc["brid"]) {
          doc["ROWID"] = _doc["brid"];
        }
        ref = new DocumentReference(this.oracledb, id, colCopy);
        ref.converter = this.converter;
        let docSnap = new QueryDocumentSnapshot(doc, ref, _meta);
        docSnaps.push(docSnap);
      });
      const q_meta = new SnapshotMetadata(false, false);
      let qSnap = new QuerySnapshot(docSnaps, this, q_meta);
      return qSnap;
    }
    const q_meta = new SnapshotMetadata(false, false);
    return new QuerySnapshot([], this, q_meta);
  }

  /**
   * @property {Function} updateListenersCount
   * (Private) Updates the window listeners by amount that is passed in the
   * function. This is used during onSnapshot beacuse we need to maintain
   * the count of tabs that are listening to the same indexed db. So, it 
   * is required as we clear the indexed db when the no tab is listening to it.
   * 
   * @param {number} x - Number to update the count by.
   */
  #updateListenersCount(x) {
    let total_listeners_init =
      window.localStorage.getItem(this.oracledb.__listenerKey)
    if (total_listeners_init == null) {
      total_listeners_init = 0;
    }
    if (this.oracledb.__listening === 0) {
      window.localStorage.setItem(this.oracledb.__listenerKey,
        parseInt(total_listeners_init) + x);
      this.oracledb.__listening = x;
    }
  }

  /**
   * @property {Function} onSnapshot
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
  onSnapshot() {
    if (this.type === "namedquery") {
      let error = new Error("Operation is not supported in namedQuery.");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    let unsubscribe;

    this._rt = 1;
    this.#updateListenersCount(1);
    //extract callbacks
    let callback = extractCallbacksForSnapshot(...arguments);
    //handle snapshot
    const handleSnapshot = (querySnap) => {
      if (callback.next != null) {
        try {
          callback.next(querySnap);
        } catch (ue) {
          Utils.baasLogger(this.oracledb.app.logLevel, "Error in snapshot callback ", ue);
        }
      }
    }

    let tok =  getToken(this.oracledb.app);
    if (tok) {
      tok = new IdTokenResult(tok);
    }
    const access_token = tok;

    //for storing callbacks
    let _queryId = createUniqueName();

    String.prototype.hashCode = function () {
      var hash = 0,
        i, chr;
      if (this.length === 0) return hash;
      for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    }

    const payload = {
      path: this._path,
      conditions: this._conditions,
      explicitOrder: this._explicitOrder,
      joins: this._joins,
      access_token: access_token ? access_token.claims.sub : null
    };

    //for storing in indexed db
    const mappedQueryId = Math.abs(JSON.stringify(payload).hashCode());

    delete payload["access_token"];

    //for websocket server and unified listening
    const queryId = Math.abs(JSON.stringify(payload).hashCode());

    if (!this.oracledb._settings.experimentalAutoDetectLongPolling &&
      !this.oracledb._settings.experimentalForceLongPolling) {

      //create connection
      this.oracledb.__createSocket(access_token ? access_token.token : null, this.oracledb.app);

      const queryObject = {
        queryId: queryId,
        status: 1,
        payload: payload,
        TABLE_NAME: ""
      }

      //store callbacks and send message to web socket if not long polling
      if (!Utils.memberExists(this.oracledb.__snaps, queryId)) {
        this.oracledb.__snaps[queryId] = [];
        Utils.baasLogger(this.oracledb.app.logLevel, "__sendMessage ", queryObject);
        this.oracledb.__sendMessage(queryObject);
      }
      this.oracledb.__snaps[queryId].push(_queryId);
      this.oracledb.__callbacks[_queryId] = callback;
      this.oracledb.__queryIdMap[queryId] = mappedQueryId;

      this.get().then(querySnap => {
        querySnap.docChanges = (options) => {
          let docsChanged = [];
          querySnap.docs.forEach((doc) => {
            let docChange = {
              doc: doc,
              type: "added",
              oldIndex: -1,
              newIndex: docsChanged.length,
            };
            docsChanged.push(docChange);
          });
          return docsChanged;
        };

        handleSnapshot(querySnap);

        //store in indexed db here
        this.oracledb.__setIndexDB({
          queryId: mappedQueryId,
          snap: querySnap,
          type: "collection",
          path: this._path.join("/")
        }).then(() => {
          Utils.baasLogger(this.oracledb.app.logLevel, "added to indexed db for query", mappedQueryId, queryId);
        }).catch(e => Utils.baasLogger(this.oracledb.app.logLevel, e));

      }).catch(e => {
        if (callback.error != null) {
          try {
            callback.error(e);
          } catch (ue) {
            Utils.baasLogger(this.oracledb.app.logLevel, "Error in snapshot callback ", ue);
          }
        }
      });

      unsubscribe = () => {
        Utils.baasLogger(this.oracledb.app.logLevel, "in unsubscribe", _queryId);

        const index = this.oracledb.__snaps[queryId].indexOf(_queryId);
        if (index > -1) {
          this.oracledb.__snaps[queryId].splice(index, 1);
          delete this.oracledb.__callbacks[_queryId];
        }

        const unSubQueryObject = {
          queryId: queryId,
          status: 0,
          payload: payload
        }

        if (this.oracledb.__snaps[queryId].length === 0) {
          delete this.oracledb.__queryIdMap[queryId];
          delete this.oracledb.__snaps[queryId];
          this.oracledb.__sendMessage(unSubQueryObject);
        }

        if (callback.error != null) {
          try {
            callback.error(new Error("Unsubscribe called!"));
          } catch (ue) {
            Utils.baasLogger(this.oracledb.app.logLevel, "Error in snapshot callback ", ue);
          }
        }
        callback = {
          next: null,
          complete: null,
          error: null
        }

      }

    } else {
      let oldQuerySnap;
      //for the first time 
      this.get().then(querySnap => {
        //docChanges
        querySnap.docChanges = (options) => {
          let docsChanged = [];
          querySnap.docs.forEach((doc) => {
            let docChange = {
              doc: doc,
              type: "added",
              oldIndex: -1,
              newIndex: docsChanged.length,
            };
            docsChanged.push(docChange);
          });
          return docsChanged;
        };
        handleSnapshot(querySnap);
        oldQuerySnap = querySnap;

      })
        .catch(e => {
          var querySnap = new QuerySnapshot([], this,
            new SnapshotMetadata(false, false));
          handleSnapshot(querySnap);
        });

      const db = this.oracledb;
      const colRef = this;

      //polling
      function startPolling() {
        // Function to be executed
        function executeTask() {
          colRef.get().then(querySnap => {
            //get last snapshot
              if (oldQuerySnap == null) {
                throw new Error("Could not locate last snapshot in indexed db");
              }

              //create version maps for old and new snapshot docs
              let oldVersionMap = {};
              let newVersionMap = {};

              let newDocs = [];

              //index map for old documents
              let oldIndexMap = {};
          
              for (let i = 0; i < querySnap._docs.length; i++) {
                newVersionMap[querySnap._docs[i].id] = querySnap._docs[i]._otherMetadata["ASOF"] ?
                 BigInt(querySnap._docs[i]._otherMetadata["ASOF"]) : querySnap._docs[i]._otherMetadata["VERSION"];
              }
              for (let i = 0; i < oldQuerySnap._docs.length; i++) {
                oldVersionMap[oldQuerySnap._docs[i].id] = oldQuerySnap._docs[i]._otherMetadata["ASOF"] ?
                BigInt(oldQuerySnap._docs[i]._otherMetadata["ASOF"]) : oldQuerySnap._docs[i]._otherMetadata["VERSION"];
                oldIndexMap[oldQuerySnap._docs[i].id] = i;
              }

              //create doc changes
              let docsChanged = [];
              for (let i = 0; i < querySnap._docs.length; i++) {
                if (Object.prototype.hasOwnProperty.call(oldVersionMap,
                  querySnap._docs[i].id) && newVersionMap[querySnap._docs[i].id] >
                  oldVersionMap[querySnap._docs[i].id]) {
                  docsChanged.push({
                    doc: querySnap._docs[i],
                    type: "modified",
                    oldIndex: oldIndexMap[querySnap._docs[i].id],
                    newIndex: newDocs.length
                  });
                  newDocs.push(querySnap._docs[i]);
                } else if (!Object.prototype.hasOwnProperty.call(oldVersionMap,
                  querySnap._docs[i].id)) {
                  docsChanged.push({
                    doc: querySnap._docs[i],
                    type: "added",
                    oldIndex: -1,
                    newIndex: newDocs.length,
                  });
                  newDocs.push(querySnap._docs[i]);
                } else {
                  newDocs.push(querySnap._docs[i]);
                }
              }
              
              for (let i = 0; i < oldQuerySnap._docs.length; i++) {
                if (!Object.prototype.hasOwnProperty.call(newVersionMap,
                  oldQuerySnap._docs[i].id)) {
                  docsChanged.push({
                    doc: oldQuerySnap._docs[i],
                    type: "removed",
                    oldIndex: i,
                    newIndex: -1,
                  });
                }
              }

              querySnap._docs = newDocs;

              querySnap.docChanges = (options) => {
                return docsChanged;
              };

              if (docsChanged.length > 0) {
                handleSnapshot(querySnap);
              }

              oldQuerySnap = querySnap

          }).catch(e => { Utils.baasLogger(db.app.logLevel, e) })
        }

        let intervalId = setInterval(executeTask,
          db._settings.experimentalLongPollingOptions.timeoutSeconds*1000);
        // Continue to execute every 29 seconds

        // Return a function to stop the continuous execution
        return function stopExecution() {
          clearInterval(intervalId); // Stops the continuous execution
          Utils.baasLogger(db.app.logLevel, "Continuous execution stopped.");
        };
      }

      // Usage
      let stopPolling = startPolling();

      unsubscribe = () => {
        Utils.baasLogger(db.app.logLevel, "in unsubscribe", _queryId);
        stopPolling();

        if (callback.error != null) {
          try {
            callback.error(new Error("Unsubscribe called!"));
          } catch (ue) {
            Utils.baasLogger(db.app.logLevel, "Error in snapshot callback ", ue);
          }
        }
        callback = {
          next: null,
          complete: null,
          error: null
        }
      }

    }

    return () => {
      unsubscribe();
    }

  }
}
