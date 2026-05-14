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
//

import { Utils, createUniqueName } from "../utils/utils.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";
import { DocumentReference } from "../collection/reference.js";
import { FieldPath } from "../field/path.js";

export class Transaction {

  #name = null;
  #status = null;
  #operations = [];
  #versions = {};

  constructor(name) {
    this.#status = 0;
    this.#name = name;
  }

  __reset() {
    this.#name = createUniqueName();
    this.#status = 0;
    this.#operations = [];
    this.#versions = {};
  }

  async get(docRef) {
    if (this.#status === -1) {
      let err = new Error(formatMessage(errorMessages.transactionEnded));
      err.status = 400;
      throw oracledbErrorHandler(err);
    }

    var trans_obj = {
      name: this.#name,
      start: 1-this.#status,
      end: 0
    };
    if (this.#status === 0) {
      this.#status = 1;
    }
    this.#operations.push({
      method: "get",
      docRef: docRef,
      data: null,
      options: null,
      version: null
    });

    const res = await docRef.get({ source: "server" }, trans_obj);

    this.#versions[docRef.path] = res.__version;
    return res;
  }

  delete(docRef) {
    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (this.#status === -1) {
      let err = new Error("Transaction has ended!");
      err.status = 400;
      throw oracledbErrorHandler(err);
    }
    this.#operations.push({
      method: "delete",
      docRef: docRef,
      data: null,
      options: null
    });

    return this;
  }

  set(docRef, data, options = null) {
    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    argCheck(data, "Invalid data", true, [typeStrings.OBJECT]);
    if (this.#status === -1) {
      let err = new Error(formatMessage(errorMessages.transactionEnded));
      err.status = 400;
      throw oracledbErrorHandler(err);
    }
    if (options == null) {
      options = {
        merge: false,
        mergeFields: []
      };
    }
    this.#operations.push({
      method: "set",
      docRef: docRef,
      data: data,
      options: options
    });

    return this;
  }

  update() {
    if (this.#status === -1) {
      let err = new Error("Transaction has ended!");
      err.status = 400;
      throw oracledbErrorHandler(err);
    }
    let data;
    let docRef = arguments[0];
    if (arguments.length === 2) {
      data = arguments[1];
      let new_data = {};
      Object.entries(data).map(entry => {
        let key = entry[0] instanceof FieldPath ?
          entry[0].fullPathSec : entry[0];
        let value = entry[1];
        new_data[key] = value;
        return null;
      });
      data = new_data;
    }
    else {
      data = {}
      for (let i = 1; i < arguments.length - 1; i++) {
        if (arguments[i] instanceof FieldPath) {
          data[arguments[i].fullPathSec] = arguments[i + 1];
        }
        else {
          data[arguments[i]] = arguments[i + 1];
        }
      }
    }

    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this.#operations.push({
      method: "update",
      docRef: docRef,
      data: data,
      options: null
    });

    return this;
  }

  async __makeOperations() {
    let j = this.#operations.length - 1;
    if (j < 0) {
      this.#status = -1;
      return null;
    }

    for (let i = 0; i < j; i++) {
      if (this.#operations[i].method === "get") {
        continue;
      }
      var trans_obj = {
        name: this.#name,
        start: 1 - this.#status,
        end: 0,
        version: this.#versions[this.#operations[i].docRef.path]
      };
      if (this.#status === 0) {
        this.#status = 1;
      }
      switch (this.#operations[i].method) {
        case "set":
          await this.#operations[i].docRef.set(this.#operations[i].data,
            this.#operations[i].options, trans_obj);
          break;
        case "delete":
          await this.#operations[i].docRef.delete(trans_obj);
          break;
        case "update":
          await this.#operations[i].docRef.update(this.#operations[i].data,
             trans_obj);
          break;
        default:
          Utils.baasLogger(LogLevel.ERROR, "incorrect");
      }
      this.#versions[this.#operations[i].docRef.path] = trans_obj.version;
    }

    let res = await this.__commit(j);
    this.#status = -1;
    return res;
  }

  async __commit(idx) {
    var trans_obj = {
      name: this.#name,
      start: 1 - this.#status,
      end: 1,
      version: this.#versions[this.#operations[idx].docRef.path]
    };
    let res = null;
    switch (this.#operations[idx].method) {
      case "set":
        res = await this.#operations[idx].docRef.set(this.#operations[idx].data,
          this.#operations[idx].options, trans_obj);
        break;
      case "delete":
        res = await this.#operations[idx].docRef.delete(trans_obj);
        break;
      case "update":
        res = await this.#operations[idx].docRef.update( 
          this.#operations[idx].data, trans_obj);
        break;
      case "get":
        res = await this.#operations[idx].docRef.get({ source: "server" }, trans_obj);
        break;
      default:
        Utils.baasLogger(LogLevel.ERROR, "incorrect");
    }
    this.#versions[this.#operations[idx].docRef.path] = trans_obj.version;
    return res;
  }

}


export class WriteBatch {
  #name = null;
  #status = null;
  #operations = [];

  constructor(name) {
    this.#status = 0;
    this.#name = name;
  }

  delete(docRef) {
    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    this.#operations.push({
      method: "delete",
      docRef: docRef,
      data: null,
      options: null
    });

    return this;
  }

  set(docRef, data, options = null) {
    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    argCheck(data, "Invalid data", true, [typeStrings.OBJECT]);
    if (options == null) {
      options = {
        merge: false,
        mergeFields: []
      };
    }
    this.#operations.push({
      method: "set",
      docRef: docRef,
      data: data,
      options: options
    });

    return this;
  }

  update() {
    let data;
    let docRef = arguments[0];
    if (arguments.length === 2) {
      data = arguments[1];
    }
    else {
      data = {}
      for (let i = 1; i < arguments.length - 1; i++) {
        if (arguments[i] instanceof FieldPath) {
          data[arguments[i].fullPathSec] = arguments[i + 1];
        }
        else {
          data[arguments[i]] = arguments[i + 1];
        }
      }
    }

    if (!(docRef instanceof DocumentReference)) {
      let error = new Error(formatMessage(errorMessages.invalidDocumentReference));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this.#operations.push({
      method: "update",
      docRef: docRef,
      data: data,
      options: null
    });

    return this;
  }

  async __makeOperations() {
    let j = this.#operations.length - 1;
    if (j < 0) {
      this.#status = -1;
      return null;
    }

    for (let i = 0; i < j; i++) {
      var trans_obj = {
        name: this.#name,
        start: 1 - this.#status,
        end: 0
      };
      if (this.#status === 0) {
        this.#status = 1;
      }
      switch (this.#operations[i].method) {
        case "set":
          await this.#operations[i].docRef.set(this.#operations[i].data,
            this.#operations[i].setOptions, trans_obj);
          break;
        case "delete":
          await this.#operations[i].docRef.delete(trans_obj);
          break;
        case "update":
          await this.#operations[i].docRef.update(
            this.#operations[i].data, trans_obj);
          break;
        default:
          Utils.baasLogger(LogLevel.ERROR, "incorrect");
      }
    }

    return j;
  }

  async commit() {
    let idx = await this.__makeOperations();
    var trans_obj = {
      name: this.#name,
      start: 1 - this.#status,
      end: 1
    };
    this.#status = -1;

    switch (this.#operations[idx].method) {
      case "set":
        await this.#operations[idx].docRef.set(this.#operations[idx].data,
          this.#operations[idx].setOptions, trans_obj);
        break;
      case "delete":
        await this.#operations[idx].docRef.delete(trans_obj);
        break;
      case "update":
        await this.#operations[idx].docRef.update(
          this.#operations[idx].data, trans_obj);
        break;
      default:
        Utils.baasLogger(LogLevel.ERROR, "incorrect");
    }
  }

}
