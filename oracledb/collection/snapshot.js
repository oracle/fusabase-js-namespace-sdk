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

import { argCheck, typeStrings } from "../utils/typecheck.js";
import { oracledbErrorHandler } from "../errors.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { Utils } from "../utils/utils.js";
import { parseTimeInDocument } from "../utils/timestamp_util.js";
import { FieldPath } from "../field/path.js";

/**
 * QuerySnapshot - Snapshot class to store the results of query execution.
 */
export class QuerySnapshot {

  /**
   * Creates a new `QuerySnapshot` instance.
   *
   * @param {Array} snaps - Array of document snapshots.
   * @param {Query} query - Underlying query.
   * @param {SnapshotMetadata} metadata - Snapshot metadata.
   */
  constructor(snaps, query, metadata) {
    this._docs = snaps;
    this.query = query;
    this.metadata = metadata;
  }

  /**
   * @property 
   * Returns the number of documents in the snapshot.
   *
   * @returns {number} Number of documents.
   */
  get size() {
    return this._docs.length;
  }

  /**
   * @property 
   * Returns the array of document snapshots.
   *
   * @returns {Array} Array of documents.
   */
  get docs() {
    return this._docs;
  }

  /**
   * @property 
   * Returns whether the snapshot is empty.
   *
   * @returns {boolean} True if empty, false otherwise.
   */
  get empty() {
    return this._docs.length === 0;
  }

  /**
   * @property {Function} forEach
   * Enumerates all of the documents.
   *
   * @param {Function} callback - Callback function to execute for each document.
   */
  forEach(callback) {
    argCheck(callback, "Invalid callback", true, [typeStrings.FUNCTION]);
    return this._docs.forEach(callback);
  }

  /**
   * @property {Function} docChanges
   * Returns an array of document changes.
   *
   * @param {Object} [options] - Options for changes.
   * @returns {Array} Array of document changes.
   */
  docChanges(options) {
    let docsChanged = [];
    this.docs.forEach((doc) => {
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

  /**
   * @property {Function} isEqual
   * Checks whether this `QuerySnapshot` is equal to the provided one.
   *
   * @param {QuerySnapshot} snap - Snapshot to compare.
   * @returns {boolean} True if equal, false otherwise.
   * @throws {OracledbError} Throws an error if snap is not a QuerySnapshot instance.
   */
  isEqual(snap) {
    if (!(snap instanceof QuerySnapshot)) {
      let error = new Error("The other instance to be compared should be an \
      instance of QuerySnapshot");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (!this.query.isEqual(snap.query)) {
      return false;
    }
    return JSON.stringify(snap.docs) === JSON.stringify(this.docs) &&
      JSON.stringify(snap.metadata) === JSON.stringify(this.metadata);
  }

  /**
   * @property {Function} _jsonObject
   * (Private) Returns a JSON representation of the snapshot.
   *
   * @returns {Object} JSON object.
   */
  _jsonObject() {
    const data = this.docChanges();
    const docChanges = [];
    for (let i = 0; i < data.length; i++) {
      docChanges.push({
        doc: JSON.parse(JSON.stringify(data[i].doc)),
        type: data[i].type,
        oldIndex: data[i].oldIndex,
        newIndex: data[i].newIndex,
      });
    }
    let obj = JSON.parse(JSON.stringify(this));
    obj["docChanges"] = docChanges;
    return obj;
  }

  /**
   * @static
   * @property {Function} _parse
   * (Private) Parses an object into a QuerySnapshot.
   *
   * @param {Object} obj - Object to parse.
   * @param {Query} ref - Query reference.
   * @param {Array} snaps - Array of snapshots.
   * @returns {QuerySnapshot} Parsed QuerySnapshot.
   */
  static _parse(obj, ref, snaps) {
    const querySnap = new QuerySnapshot(snaps, ref,
      new SnapshotMetadata(obj.metadata.fromCache, obj.metadata.hasPendingWrites));
    return querySnap;
  }
}

/**
 * DocumentSnapshot - Snapshot class to store the result of document get.
 */
export class DocumentSnapshot {
  /**
   * Creates a new `DocumentSnapshot` instance.
   *
   * @param {Object} data - Document data.
   * @param {DocumentReference} ref - Document reference.
   * @param {SnapshotMetadata} [metadata=new SnapshotMetadata(false, false)] - Snapshot metadata.
   */
  constructor(data, ref, metadata = new SnapshotMetadata(false, false)) {
    this._data = data != null ? parseTimeInDocument(data["DOCUMENT"]) : null;
    this.metadata = metadata;
    this.ref = ref;
    this._converted_data = null;
    this._otherMetadata = {};
    this._otherMetadata["LAST_MODIFIED"] = data ? data["LAST_MODIFIED"] : null;
    this._otherMetadata["CREATED"] = data ? data["CREATED"] : null;
    this._otherMetadata["SUBCOLLECTION"] = data ? data["SUBCOLLECTION"] : null;
    this._otherMetadata["PARENT_OID"] = data ? data["PARENT_OID"] : null;
    this._otherMetadata["VERSION"] = null;
    this._otherMetadata["ASOF"] = data ? data["ASOF"] : null;
    this.__version = null;
    this.__rowId = null;

    if (data != null && data["VERSION"]) {
      this.__version = data["VERSION"];
      this._otherMetadata["VERSION"] = data["VERSION"];
    }
    else if (data != null && data["BAAS_VERSION"]) {
      this.__version = data["BAAS_VERSION"];
      this._otherMetadata["VERSION"] = data["BAAS_VERSION"];
    }

    if (data != null && data["ROWID"]) {
      this.__rowId = data["ROWID"];
    }
    if (this._converted_data == null && this.ref.converter != null) {
      this._converted_data = this.ref.converter.fromOracledb(this);
    }

  }

  /**
   * @property 
   * Returns the document ID.
   *
   * @returns {string|null} Document ID or null.
   */
  get id() {
    return this.ref == null ? null : this.ref.id;
  }

  /**
   * @property 
   * Returns whether the document exists.
   *
   * @returns {boolean} True if exists, false otherwise.
   */
  get exists() {
    return this._data != null;
  }

  /**
   * @property {Function} data
   * Retrieves all the data in the document.
   *
   * @param {Object} [options] - Options for data retrieval.
   * @returns {Object|null} Document data or null.
   */
  data(options) {
    if (this._converted_data != null) {
      return this._converted_data;
    }
    return this._data;
  }

  /**
   * @property {Function} get
   * Retrieves the field specified.
   *
   * @param {string|FieldPath} fieldName - Field name or path.
   * @param {Object} [options] - Options for retrieval.
   * @returns {any} Field value or null.
   * @throws {OracledbError} Throws an error if document does not exist or invalid field name.
   */
  get(fieldName, options) {
    if (!this.exists) {
      let err = new Error("Document does not exist!");
      err.status = 404;
      throw oracledbErrorHandler(err);
    }
    if (fieldName instanceof FieldPath) {
      return Utils.getObjectProperty(this._data, fieldName.fullPath);
    }
    argCheck(fieldName, "Invalid field name.", true, [typeStrings.STRING]);
    if (Utils.memberExists(this._data, fieldName))
      return this._data[fieldName];

    return null;
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `DocumentSnapshot` is equal to the provided one.
   *
   * @param {DocumentSnapshot} snap - Snapshot to compare.
   * @returns {boolean} True if equal, false otherwise.
   * @throws {OracledbError} Throws an error if snap is not a DocumentSnapshot instance.
   */
  isEqual(snap) {
    if (!(snap instanceof DocumentSnapshot)) {
      let error = new Error("The other instance to be compared should be an \
      instance of DocumentSnapshot");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return JSON.stringify(snap.data()) === JSON.stringify(this.data());
  }

  /**
   * @property {Function} _jsonObject
   * (Private) Returns a JSON representation of the snapshot.
   *
   * @returns {Object} JSON object.
   */
  _jsonObject() {
    return JSON.parse(JSON.stringify(this));
  }

  /**
   * @static
   * @property {Function} _parse
   * (Private) Parses an object into a DocumentSnapshot.
   *
   * @param {Object} obj - Object to parse.
   * @param {DocumentReference} ref - Document reference.
   * @returns {DocumentSnapshot} Parsed DocumentSnapshot.
   */
  static _parse(obj, ref) {
    return new DocumentSnapshot({
      "DOCUMENT": obj._data, "ROWID": obj.__rowId,
      "CREATED":obj._otherMetadata["CREATED"],
      "LAST_MODIFIED":obj._otherMetadata["LAST_MODIFIED"],
      "VERSION":obj._otherMetadata["VERSION"],
      "SUBCOLLECTION":obj._otherMetadata["SUBCOLLECTION"],
      "ASOF":obj._otherMetadata["ASOF"],
      "PARENT_OID":obj._otherMetadata["PARENT_OID"]
    },
      ref, new SnapshotMetadata(obj.metadata.fromCache,
        obj.metadata.hasPendingWrites));
  }
}

/**
 * QueryDocumentSnapshot - Extends DocumentSnapshot for query results.
 */
export class QueryDocumentSnapshot extends DocumentSnapshot {
  /**
   * Creates a new `QueryDocumentSnapshot` instance.
   *
   * @param {Object} data - Document data.
   * @param {DocumentReference} ref - Document reference.
   * @param {SnapshotMetadata} metadata - Snapshot metadata.
   */
  // constructor(data, ref, metadata) {
  //   super(data, ref, metadata);
  // }

  /**
   * @static
   * @property {Function} _parse
   * (Private) Parses an object into a QueryDocumentSnapshot.
   *
   * @param {Object} obj - Object to parse.
   * @param {DocumentReference} ref - Document reference.
   * @returns {QueryDocumentSnapshot} Parsed QueryDocumentSnapshot.
   */
  static _parse(obj, ref) {
    return new QueryDocumentSnapshot({
      "DOCUMENT": obj._data, "ROWID": obj.__rowId,
        "CREATED":obj._otherMetadata["CREATED"],
      "LAST_MODIFIED":obj._otherMetadata["LAST_MODIFIED"],
      "VERSION":obj._otherMetadata["VERSION"],
      "SUBCOLLECTION":obj._otherMetadata["SUBCOLLECTION"],
      "ASOF":obj._otherMetadata["ASOF"],
      "PARENT_OID":obj._otherMetadata["PARENT_OID"]
    },
      ref, new SnapshotMetadata(obj.metadata.fromCache,
        obj.metadata.hasPendingWrites));
  }
}
