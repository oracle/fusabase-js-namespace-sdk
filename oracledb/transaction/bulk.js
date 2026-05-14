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

import { QueryHelper } from "../utils/query_helper.js";
import { oracledbErrorHandler } from "../errors.js";
import { FieldPath } from "../field/path.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { getAccessToken, rearrangeBodyOfVersion2 } from "../utils/utils.js";
import { parseTimestamp } from "../utils/timestamp_util.js";
import { Utils } from "../utils/utils.js";
import { createPayloadForUpdateVersion2New } from "../utils/utils_helper.js";
import { nullCheck } from "../utils/typecheck.js";

export class BulkUpdate {

  /**
   * @property 
   * (Private) Helper class.
   */
  _queryHelper = null;

  /**
  * @property 
  * (Private) Holds information about where clause.
  */
  _conditions = [];

  _ops;

/**
 * Creates a new `BulkUpdate` instance.
 *
 * @param {Oracledb} db - Database instance.
 * @param {string} path - Path to the collection for bulk update.
 */
  constructor(db, path) {

    if (path == null) {
      let error = new Error("Path cannot be null!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    path = path.toString().trim();

    let tokens = path.split("/");

    this.oracledb = db;

    this._path = tokens;

    if (this._path.length%2==0) {
      let error = new Error("Invalid path");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    this._ops = [];
    this._queryHelper = new QueryHelper(db.app);
  }

  /**
   * @property 
   * Returns the path of the document.
   *
   * @returns {string} Path string.
   */
  get path() {
    return this._path.join("/");
  }

/**
 * @property {Function} isEqual
 * Checks whether this `BulkUpdate` is equal to the provided one.
 * 
 * @param {BulkUpdate} other BulkUpdate that needs to be compared.
 * @return {boolean} Returns true if both BulkUpdate instances are 
 *  the same.
 * @throws {OracledbError} Throws an error if other is not a BulkUpdate
 *  instance.
 */
  isEqual(docRef) {
if (!(docRef instanceof BulkUpdate)) {
      let error = new Error("The other instance to be compared should be an \
      instance of BulkUpdate");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.path === docRef.path;
  }

/**
     * @property {Function} where
     * Adds a condition to filter documents for the bulk update.
     * 
     * @param {String|FieldPath} field - Field name. 
     * @param {String} opStr - Operator to be used with where. 
     * "==", ">=", "<=", "<", ">", "in", "not-in", "like", "!=", 
     * "array-contains", "array-contains-any", "is-null"
     * (supported operators)
     * @param {any} fieldValue - Value to be used while applying operator.
     * @return {BulkUpdate} Returns this BulkUpdate instance for chaining.
     * @throws {OracledbError} Throws an error if invalid parameters are provided.
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
        return this;
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
      this._conditions.push(_cond);
      return this;
    }

/**
   * @async
   * @property {Function} update
   * Updates fields for the documents in the collection that match the where conditions.
   * @param {object} data - The data to update.
   * @param {object} [transObj] - Optional transaction object with name, start, end.
   * @return {Promise<void>}
   * Alternatively, can be called with field-value pairs.
   */
  async update() {
    let data_obj;
    let trans_obj = {
      name: "",
      start: 0,
      end: 0
    };
    if (arguments.length === 1) {
      data_obj = arguments[0];
    } else if (typeof arguments[0] === 'string' ||
      arguments[0] instanceof FieldPath) {
      data_obj = {}
      for (let i = 0; i < arguments.length - 1; i++) {
        let temp = arguments[i];
        if (temp instanceof FieldPath) {
          temp = temp.fullPathSec;
        }
        data_obj[temp] = arguments[i + 1];
      }
    } else if (arguments.length === 2 && typeof arguments[0] === 'object') {
      data_obj = arguments[0];
      trans_obj = arguments[1];
    }

    let data = data_obj;

    data = createPayloadForUpdateVersion2New(this, data, true);
    data = parseTimestamp(data);
    data = rearrangeBodyOfVersion2(data);

    const access_token = await getAccessToken(this.oracledb.app);

    try {
      await this._queryHelper.updateDocument(
        this, data, access_token, trans_obj);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }
  }
}