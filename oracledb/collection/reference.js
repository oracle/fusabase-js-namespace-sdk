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

import { Query } from "./query.js";
import { QueryHelper } from "../utils/query_helper.js";
import { oracledbErrorHandler } from "../errors.js";
import { DocumentSnapshot } from "./snapshot.js";
import { FieldPath } from "../field/path.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { checkOracledbApiVersion, isInstanceOfAnyClass } from "../utils/utils.js";
import { getToken, getAccessToken, createUniqueName, updateFieldsWithQuotes,rearrangeBodyOfVersion2 } from "../utils/utils.js";
import { parseTimestamp } from "../utils/timestamp_util.js";
import { Utils, OracledbVersion } from "../utils/utils.js";
import { setWholeData, createPayloadForUpdateVersion2New, updateNestedData, serializeVersion2, extractEmbeddingsMapForCreate } from "../utils/utils_helper.js";
import { extractCallbacksForSnapshot } from "../utils/snapshot_util.js";
import { IdTokenResult } from "../../auth/types/idtoken.js";

/**
 * CollectionReference - Represents a reference to a collection.
 */
export class CollectionReference extends Query {

  /**
   * Creates a new `CollectionReference` instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} path - Path to the collection.
   * @param {DocumentReference} [parent=null] - Parent document.
   */
  constructor(db, path, parent = null) {
    super(db);
    this.type = "collection";

    if (path == null) {
      let error = new Error("Path cannot be empty for a collection!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    path = path.toString().trim();

    let tokens = path.split("/");
    if ((parent == null || Utils.isTypeOf(parent, DocumentReference)) &&
      tokens.length % 2 === 0) {
      let error = new Error("Incorrect path for Collection");
      error.status = 400;

      throw oracledbErrorHandler(error);
    } else if (Utils.isTypeOf(parent, CollectionReference) &&
      tokens.length % 2 === 1) {
      let error = new Error("Incorrect path for Collection");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this.id = tokens.pop();

    // if (this.id === "") {
    //   let error = new Error("Incorrect collection id!");
    //   error.status = 400;
    //   throw oracledbErrorHandler(error);
    // }

    if (tokens.length === 0) this.parent = parent;
    else this.parent = new DocumentReference(db, tokens.join("/"), parent);

    this._path = [];
    if (this.parent != null) {
      this._path = Array.from(this.parent._path);
    }
    this._path.push(this.id);
  }

  /**
   * @property 
   * Returns the path of the collection.
   *
   * @returns {string} Path string.
   */
  get path() {
    return this._path.join("/");
  }

  /**
   * @property {Function} doc
   * Returns the DocumentReference for the document in the collection for the path.
   * @param {String} docPath
   * @return {DocumentReference < T >}
   */
  doc(docPath) {
    argCheck(docPath, "Invalid document path", false, [typeStrings.STRING]);
    let newDoc = new DocumentReference(this.oracledb, docPath, this);
    newDoc.converter = this.converter;
    return newDoc;
  }

  /**
   * @async
   * @property {Function} add
   * Adds a new document to this collection.
   * @param {T} document
   * @return {Promise < DocumentReference < T > >}
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
      let newDoc = new DocumentReference(this.oracledb, promJson["OID"], this);
      newDoc.converter = this.converter;
      return newDoc;

    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }
  }

  /**
   * @property {Function} isEqual
   * Checks whether this `CollectionReference` is equal to the provided one.
   * 
   * @param {CollectionReference} colref CollectionReference that needs to be compared.
   * @return {boolean} Returns true if both CollectionReference instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if colref is not a CollectionReference
   *  instance.
   */
  isEqual(colref) {
    if (!(colref instanceof CollectionReference)) {
      let error = new Error("The other instance to be compared should be an \
      instance of CollectionReference");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (this.id === colref.id && this.path === colref.path) {
      return true;
    }
    return false;
  }
}

/**
 * DocumentReference - Represents a reference to a document.
 */
export class DocumentReference {

  /**
   * @property 
   * (Private) Helper class.
   */
  _queryHelper = null;

  /**
   * @property 
   * (Private) If true, query will return row ids with the response.
   */
  _rt;

  /**
   * @property 
   * (Private) Converter object.
   */
  converter;

  _serverTimestamp = [];

  /**
   * Creates a new `DocumentReference` instance.
   *
   * @param {Oracledb} db - Database instance.
   * @param {string} path - Path to the document.
   * @param {CollectionReference} [parent=null] - Parent collection.
   */
  constructor(db, path, parent = null) {
    // If user is not providing an OID,
    // it can be used for inserting a new doc through setDoc.

    this.converter = null;

    if ((path === "" || path == null) && parent == null) {
      let error = new Error("Both path and parent cannot be null!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    if (path == null || path == "") {
      path = createUniqueName();
    }

    this._rt = 0;

    path = path.toString().trim();

    let tokens = path.split("/");

    if ((Utils.isTypeOf(parent, DocumentReference)) &&
      tokens.length % 2 === 1) {
      let error = new Error("Incorrect path for Collection");
      error.status = 400;

      throw oracledbErrorHandler(error);
    }

    this.oracledb = db;
    this.type = "document"
    this.id = tokens.pop();
    if (this.id === "") {
      let error = new Error("Incorrect document id!");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    this._path = [];
    if (tokens.length === 0) this.parent = parent;
    else this.parent = new CollectionReference(db, tokens.join("/"), parent);

    if (this.parent != null) {
      this._path = Array.from(this.parent._path);
    }
    this._path.push(this.id); // since OID is always a string

    if (this.parent == null) {
      let error = new Error("Parent Collection can't be null");
      error.status = 400;

      throw oracledbErrorHandler(error);
    }
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
   * Checks whether this `DocumentReference` is equal to the provided one.
   * 
   * @param {DocumentReference} docRef DocumentReference that needs to be compared.
   * @return {boolean} Returns true if both DocumentReference instances are 
   *  the same.
   * @throws {OracledbError} Throws an error if docRef is not a DocumentReference
   *  instance.
   */
  isEqual(docRef) {
    if (!(docRef instanceof DocumentReference)) {
      let error = new Error("The other instance to be compared should be an \
      instance of DocumentReference");
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.id === docRef.id && this.path === docRef.path;
  }

  /**
   * @property {Function} collection
   * Returns the CollectionReference for the collection at the specified path.
   * @param {String} colPath
   * @return {CollectionReference < T >}
   */
  collection(colPath) {
    argCheck(colPath, "Invalid collection path", true, [typeStrings.STRING]);
    let newCol = new CollectionReference(this.oracledb, colPath, this);
    newCol.converter = this.converter;
    return newCol;
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
            start: trans_obj.start,
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
        data = updateNestedData(this, doc_data["_data"], data_obj);
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
    if (!Utils.memberExists(setOptions, "merge")) {
      setOptions.merge = false;
    }
    if (!Utils.memberExists(setOptions, "mergeFields")) {
      setOptions.mergeFields = [];
    }
    try {
      await this._queryHelper.setDocument(this, data, setOptions, access_token, trans_obj);
    } catch (err) {
      Utils.baasTrace(this.oracledb.app.logLevel);
      throw oracledbErrorHandler(err);
    }
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
  onSnapshot() {
    let unsubscribe;

    this.#updateListenersCount(1);

    //extract callbacks
    let callback = extractCallbacksForSnapshot(...arguments);

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

    let tok =  getToken(this.oracledb.app);
    if (tok) {
      tok = new IdTokenResult(tok);
    }
    const access_token = tok;

    const payload = {
      path: this._path,
      conditions: [],
      explicitOrder: [],
      access_token: access_token ? access_token.claims.sub : null
    };

    const mappedQueryId = Math.abs(JSON.stringify(payload).hashCode());

    delete payload["access_token"];

    const queryId = Math.abs(JSON.stringify(payload).hashCode());

    const handleSnapshot = (docSnap) => {
      if (callback.next) {
        try {
          callback.next(docSnap);
        } catch (ue) {
          Utils.baasLogger(this.oracledb.app.logLevel, "Error in snapshot callback ", ue);
        }
      }
    }

    if (!this.oracledb._settings.experimentalAutoDetectLongPolling &&
      !this.oracledb._settings.experimentalForceLongPolling) {

      //create connection
      this.oracledb.__createSocket(access_token ? access_token.token : null, this.oracledb.app);

      const queryObject = {
        queryId: queryId,
        status: 1,
        payload: payload
      }

      //store callbacks 
      if (!Utils.memberExists(this.oracledb.__snaps, queryId)) {
        this.oracledb.__snaps[queryId] = [];
        Utils.baasLogger(this.oracledb.app.logLevel, "__sendMessage ", queryObject);
        this.oracledb.__sendMessage(queryObject);
      }
      this.oracledb.__snaps[queryId].push(_queryId);
      this.oracledb.__callbacks[_queryId] = callback;
      this.oracledb.__queryIdMap[queryId] = mappedQueryId;

      this.get().then(docSnap => {
        handleSnapshot(docSnap);
        //store in indexed db here
        this.oracledb.__setIndexDB({
          queryId: mappedQueryId,
          snap: docSnap,
          type: "document",
          path: this._path.join("/")
        }).then(() => {
          Utils.baasLogger(this.oracledb.app.logLevel, "added indexed db for document", _queryId);
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
        Utils.baasLogger(this.oracledb.app.logLevel, "in unsubscribe for document", this.oracledb.__snaps[queryId]);

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

      this._rt = 1;
      let db = this.oracledb;
      let lastDocUpdate = null;

      const getSnap = () => {
        this.get().then(docSnap => {
          let newVer = null;
          if (docSnap._otherMetadata["ASOF"]) {
            newVer = BigInt(docSnap._otherMetadata["ASOF"]);
          } else {
            newVer = BigInt(docSnap._otherMetadata["VERSION"]);
          }
          if (!lastDocUpdate || !newVer
            || lastDocUpdate < newVer) 
          {
            lastDocUpdate = newVer;
            handleSnapshot(docSnap);
          }
        }
        ).catch(e => { Utils.baasLogger(this.oracledb.app.logLevel, e); });
      }

      getSnap();

      let intervalId = setInterval(() => {
        getSnap();

      }, this.oracledb._settings.experimentalLongPollingOptions.timeoutSeconds*1000);

      // Return the unsubscribe function
      unsubscribe = () => {
        clearInterval(intervalId);
        if (callback.error != null) {
          try {
            callback.error(new Error("Unsubscribe called!"));
          } catch (ue) {
            Utils.baasLogger(db.app.logLevel, "Error in snapshot callback ", ue);
          }
        }
        Utils.baasLogger(db.app.logLevel, "Polling stopped.");
      };
    }

    return () => {
      unsubscribe();
    }
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
   * @returns {DocumentReference} `DocumentReference` instance with converter.
   */
  withConverter (converter) {
    this.converter = converter;
    return this;
  }
}
