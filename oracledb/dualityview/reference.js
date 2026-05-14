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

import { Query } from "../collection/query.js";
import { oracledbErrorHandler } from "../errors.js";
import { getToken, getAccessToken, updateFieldsWithQuotes } from "../utils/utils.js";
import { Utils, OracledbVersion } from "../utils/utils.js";
import { QueryHelper } from "../utils/query_helper.js";
import { FieldPath } from "../field/path.js";
import { typeStrings, argCheck } from "../utils/typecheck.js";
import { QuerySnapshot } from "../collection/snapshot.js";
import { DocumentSnapshot, QueryDocumentSnapshot } from "../collection/snapshot.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { parseTimestamp } from "../utils/timestamp_util.js";
import { createUniqueName, checkOracledbApiVersion, isInstanceOfAnyClass, rearrangeBodyOfVersion2 } from "../utils/utils.js";
import { setWholeData, createPayloadForUpdateVersion2New, serializeVersion2, updateNestedData, extractEmbeddingsMapForCreate } from "../utils/utils_helper.js";

export class DualityViewColReference extends Query {

  _serverTimestamp = [];

  constructor(db, name) {
    super(db);
    this.type = 'dualityviewcollection';

    if (name == null) {
      let error = new Error("View name cannot be empty for a duality view collection!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    name = name.toString().trim();

    this.id = name;

    this.parent = null;
    this._path = name.split("/");
    if (this._path.length > 1) {
      let error = new Error("Incorrect path for DualityView");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
  }

  /**
  * @property 
  */
  get path() {
    return this._path.join("/");
  }

  /**
   * @property {Function} doc
   * Returns the DualityViewDocReference for the document in the collection for the path.
   * @param {String} docPath
   * @return {DualityViewDocReference < T >}
   */
  doc(docPath) {
    argCheck(docPath, "Invalid document path", false, [typeStrings.STRING]);
    let newDoc = new DualityViewDocReference(this.oracledb, docPath, this);
    newDoc.converter = this.converter;
    return newDoc;
  }

  /**
   * @async
   * @property {Function} add
   * Adds a new document to this collection.
   * @param {T} document
   * @return {Promise < DualityViewDocReference < T > >}
   */
  async add(data_obj) {
    if (this.converter != null) {
      data_obj = this.converter.toOracledb(data_obj);
    }
    argCheck(data_obj, "Invalid data", true, [typeStrings.OBJECT]);
    let promJson;
    let data;
    let document;

    if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_1)) {
      data = setWholeData(this, {}, data_obj, true);
      document = parseTimestamp(data);
    } else if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_2)) {
      data = setWholeData(this, {}, data_obj, true);
      const embeddings = extractEmbeddingsMapForCreate(data);
      if (Object.keys(embeddings).length > 0) {
        data = Object.fromEntries(
          Object.entries(data).filter(([k]) => !Object.prototype.hasOwnProperty.call(embeddings, k))
        );
        data["$embeddings"] = embeddings;
      }
      document = parseTimestamp(data);
    }

    const access_token = await getAccessToken(this.oracledb.app);

    try {
      promJson = await this._queryHelper.createDocument(this, document, access_token);

      /* check if OID is returned, if not throw error - 404 */
      if (!promJson) {
        let error = new Error("DocID not returned!");
        error.status = 404;
        throw error;
      }

      Utils.baasLogger(this.oracledb.app.logLevel, "Received OID");
      let newDoc = new DualityViewDocReference(this.oracledb, promJson["OID"], this);
      newDoc.converter = this.converter;
      return newDoc;

    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }

    return null;
  }

  /**
   * @async
   * @property {Function} get
   * Executes the query and return the result.
   * @return { Promise < QuerySnapshot < T > >}
   */
  async get() {
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
      Utils.baasLogger(this.oracledb.app.logLevel, "Fetched DocSnaps!");
      let data = promJson["ret"];
      let docSnaps = [];
      let colCopy = null;
      colCopy = new DualityViewColReference(this.oracledb, this._path.join("/"));
      colCopy.converter = this.converter;
      data.forEach((_doc) => {
        let doc = _doc["osons"];
        let id = doc[this.__pk];
        const _meta = new SnapshotMetadata(false, false);
        let ref = null;
        if (_doc["brid"]) {
          doc["ROWID"] = _doc["brid"];
        }
        ref = new DualityViewDocReference(this.oracledb, id, colCopy);
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
  * @property 
  */
  isEqual(ref) {
    if (!(ref instanceof DualityViewColReference)) {
      let error = new Error("The other instance to be compared should be an \
      instance of DualityViewColReference");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (this.id === ref.id && this.path === ref.path) {
      return true;
    }
    return false;
  }


}

export class DualityViewDocReference {

  _queryHelper = null;
  _rt;
  converter;

  constructor(db, path, parent = null) {

    if ((path == null || path == "") && parent == null) {
      let error = new Error("Both path and parent cannot be null!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this.converter = null;

    this._rt = 0;

    if (path == null || path == "") {
      path = createUniqueName();
    }
    path = path.toString().trim();
    let tokens = path.split("/");

    this.oracledb = db;
    this.type = "dualityviewdocument"
    this.id = tokens.pop();

    if (this.id === "") {
      let error = new Error("Incorrect duality view document id!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this._path = [];
    let parPath = parent ? parent._path.join("/") : "";
    if (parPath != "") {
      parPath += "/";
    }
    if (tokens.length === 0) this.parent = parent;
    else this.parent = new DualityViewColReference(db, parPath + tokens.join("/"));

    if (this.parent != null) {
      this._path = Array.from(this.parent._path);
    }
    this._path.push(this.id); // since OID is always a string

    if (this.parent == null) {
      let error = new Error("Parent Collection can't be null");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    if (this._path.length != 2) {
      let error = new Error("Incorrect path for DuaityView document");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this._queryHelper = new QueryHelper(db.app);
  }

  /**
  * @property 
  */
  get path() {
    return this._path.join("/");
  }

  /**
  * @property 
  */
  isEqual(docRef) {
    if (!(docRef instanceof DualityViewDocReference)) {
      let error = new Error("The other instance to be compared should be an \
      instance of DualityViewDocReference");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.id === docRef.id && this.path === docRef.path;
  }

  /**
   * @async
   * @property {Function} get
   * Reads the document for this.
   * @return {Promise < DocumentSnapshot < T > >}
   */
  async get(options = { source: "server" }, trans_obj = null) {
    let promJson;
    const access_token = await getAccessToken(this.oracledb.app);

    try {
      promJson = await this._queryHelper.fetchDocuments(this, access_token, trans_obj);

      if (!promJson || !promJson['ret'] || !promJson['ret'][0]) {
        let error = new Error(`DocumentID not found`);
        error.status = 404;

        throw error;
      }

    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      return new DocumentSnapshot(null, this);
    }

    if (promJson) {
      let data = promJson["ret"][0];

      let doc = data["osons"];
      if (data["brid"]) {
        doc["ROWID"] = data["brid"];
      }
      const _meta = new SnapshotMetadata(false, false);
      let docSnap = new DocumentSnapshot(doc, this, _meta);
      Utils.baasLogger(this.oracledb.app.logLevel, docSnap);
      return docSnap;
    }
    return new DocumentSnapshot(null, this);
  }

  /**
   * @async
   * @property {Function} update
   * Updates fields for the document referred by this.
   * @param {T} data
   * @return {Promise < void >}
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

    if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_1)) {
      let doc_data = null;
      try {
        doc_data = await this.get(null, {
          name: trans_obj.name,
          start: trans_obj.start,
          end: 0,
          version: trans_obj.version
        });
        if (trans_obj.start === 1) {
          trans_obj.start = 0;
        }
      } catch (e) {
        let error = new Error(`Error occured while fetching docunent during update.`);
        error.status = 500;
        throw error;
      }
      data = updateNestedData(this, doc_data["_data"], data_obj);
      data = parseTimestamp(data);
    } else if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_2)) {
      data = createPayloadForUpdateVersion2New(this, data, false);
      data = parseTimestamp(data);
      data = rearrangeBodyOfVersion2(data);
    }

    const access_token = await getAccessToken(this.oracledb.app);

    try {
      await this._queryHelper.updateDocument(
        this, data, access_token, trans_obj);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }

  }

  /**
   * @async
   * @property {Function} delete
   * Deletes the document referred by this.
   * @return {Promise < void >}
   */
  async delete(trans_obj = null) {
    const access_token = await getAccessToken(this.oracledb.app);

    try {
      await this._queryHelper.deleteDocument(this, access_token, trans_obj);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }
    Utils.baasLogger(this.oracledb.app.logLevel, "deleteDoc called");
  }

  /**
   * @async
   * @property {Function} set
   * Writes to the document.
   * @param {T} data
   * @param {Object} setOptions
   * @return {Promise < void >}
   */
  async set(data_obj, setOptions, trans_obj = null) {
    if (this.converter != null) {
      data_obj = this.converter.toOracledb(data_obj);
    }
    if (!trans_obj) {
      trans_obj = {
        name: "",
        start: 0,
        end: 0
      };
    }
    argCheck(data_obj, "Invalid data", true, [typeStrings.OBJECT]);
    argCheck(setOptions, "Invalid options passed", false, [typeStrings.OBJECT]);
    let data = data_obj;
    if (setOptions == null) {
      setOptions = {
        merge: false,
        mergeFields: []
      };
    }

    if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_1)) {
      if (setOptions && (setOptions.merge 
        || (setOptions.mergeFields && setOptions.mergeFields.length>0))) {
          let doc_data = null;
        try {
          doc_data = await this.get(null, {
            name: trans_obj.name,
            start: trans_obj.stack,
            end: 0,
            version: trans_obj.version
          });
          if (trans_obj.start === 1) {
            trans_obj.start = 0;
          }
        } catch (e) {
          let error = new Error(`No such doc exists!`);
          error.status = 404;
          throw error;
        }
        data = updateNestedData(doc_data["_data"], data_obj);
      } else {
        data = setWholeData(this, {}, data_obj, true);
      }

      data = parseTimestamp(data);
    } else if (checkOracledbApiVersion(this.oracledb.app.options, OracledbVersion.VER_2)) {
      if (setOptions && setOptions.merge) {
        data = createPayloadForUpdateVersion2New(this, data, setOptions.merge);
      } else {
        data = setWholeData(this, {}, data, true);
        data = serializeVersion2(this, data, false)
      }
      data = parseTimestamp(data);
      data = rearrangeBodyOfVersion2(data);
    }

    const access_token = await getAccessToken(this.oracledb.app);
    
    if (Utils.memberExists(setOptions, "merge")) {
      setOptions.merge = false;
    }
    if (Utils.memberExists(setOptions, "mergeFields")) {
      setOptions.mergeFields = [];
    }
    try {
      await this._queryHelper.setDocument(this, data, setOptions, access_token, trans_obj);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }
  }

  // #updateListenersCount(x) {
  //   let total_listeners_init =
  //     window.localStorage.getItem(this.oracledb.__listenerKey)
  //   if (total_listeners_init == null) {
  //     total_listeners_init = 0;
  //   }
  //   if (this.oracledb.__listening === 0) {
  //     window.localStorage.setItem(this.oracledb.__listenerKey,
  //       parseInt(total_listeners_init) + x);
  //     this.oracledb.__listening = x;
  //   }
  // }

  withConverter(converter) {
    this.converter = converter;
    return this;
  }
}
