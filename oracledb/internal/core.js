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
import { Utils, createUniqueName } from "../utils/utils.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { Transaction, WriteBatch } from "../transaction/batch.js";
import { CollectionReference, DocumentReference } from "../collection/reference.js";
import { DualityViewColReference, DualityViewDocReference } from "../dualityview/reference.js";
import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";
import { QueryDocumentSnapshot } from "../collection/snapshot.js";
import { DBConn, getHostString } from "../utils/utils.js";
import BundleStore from "./storage/bundle_store.js";
import SnapshotStorage from "./storage/snapshot_storage.js";
import { BulkUpdate } from "../transaction/bulk.js";
import { DocumentSnapshot } from "../collection/snapshot.js";
import { SnapshotMetadata } from "../listener/snapshot.js";
import { getSnapshotToken } from "../utils/snapshot_util.js";
import { createConnection } from "../utils/snapshot_util.js";
import { QuerySnapshot } from "../collection/snapshot.js";

/**
 * Oracledb - Represents a database instance.
 */
export class Oracledb {

  /**
  * @property 
  * (Private) database config
  */
  #conn = null;

  /**
  * @property 
  * (Private) snap store for real time listeners
  */
  #snapStore;

  /**
  * @property 
  * (Private) web socket connection
  */
  #connection = null;

  /**
  * @property 
  * (Private) bundle store for load bundle
  */
  #bundleStore;

  /**
  * @property 
  * (Private) in-memory map of socket queryid to local queryid
  */
  __snaps = {};

  /**
  * @property 
  * (Private) in-memory map to store callbacks using local queryid
  */
  __callbacks = {};

  /**
  * @property 
  * (Private) if this instance is running any real time listener
  */
  __listening = 0;

  /**
  * @property 
  * (Private) in-memory map to store callbacks using local queryid
  */
  __eventManager;

  /**
  * @property 
  * (Private) message queue for pending messages to be send to 
  * socket in case connection is not initialized yet
  */
  __messageQueue = [];

  /**
  * @property 
  * (Private) in-memory map of socket queryid to indexed db queryid
  */
  __queryIdMap = {};

  /**
   * Creates a new `Oracledb` instance.
   * Private constructor
   *
   * @param {App} app - fusabase app instance.
   */
  constructor(app) {
    this.__listenerKey = "__fusabaseindexeddb__";
    this.app = app;
    this.type = "oracledb";
    let socketURL = app.options.ordsHost;
    let cert = socketURL.split("://")[0];
    let useSSL = true;
    if (cert === "http") {
      useSSL = false;
    }
    socketURL = socketURL.split("://")[1];
    let schemaName = socketURL.split("ords")[1];
    socketURL = socketURL.split("ords")[0];
    socketURL = socketURL + "ords/baas-realtime" + schemaName;
    this._settings = {
      experimentalAutoDetectLongPolling: !app.options.useSocket,
      experimentalForceLongPolling: !app.options.useSocket,
      host: socketURL,
      ssl: useSSL,
      merge: false,
      ignoreUndefinedProperties: true,
      experimentalLongPollingOptions: {timeoutSeconds: app.options.longPollingInterval}
    };
    this.#conn = new DBConn(app);
    this.#snapStore = new SnapshotStorage(this, app.options.appID +
      "FUSABASE_SNAP_DB1", "SNAPS", "queryId");
    this.#bundleStore = new BundleStore(app.options.appID +
      "FUSABASE_BUNDLES", "BUNDLE_DOCS", "name");

    this.__eventManager = new EventTarget();
    if (this.__eventManager.addEventListener != null) {
      this.__eventManager.addEventListener("socket established", (e) => {
        e.preventDefault();
        for (let i = 0; i < this.__messageQueue.length; i++) {
          Utils.baasLogger(this.app.logLevel, "sending message from queue", this.__messageQueue[i]);
          this.#connection.send(this.__messageQueue[i]);
        }
      });
    }

    let __cleanDB = () => {
      Utils.baasLogger(this.app.logLevel, "cleaning db");
      this.#connection = null;
      this.__snaps = {};
      if (this.#snapStore != null) {
        this.#snapStore.deleteDB();
      }
    }

    if (typeof window !== "undefined") {
      const listenerKey = this.__listenerKey;
      const listening = this;
      window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        let total_listeners = window.localStorage.getItem(listenerKey);
        if (total_listeners != null && listening.__listening === 1) {
          //Utils.baasLogger(this.app.logLevel, "reduce");
          total_listeners = parseInt(total_listeners);
          window.localStorage.setItem(listenerKey,
            Math.max(total_listeners - 1, 0));
          if (total_listeners <= 1) {
            __cleanDB();
          }
        }
        e.returnValue = '';
      });
    }

  }

  /**
   * @property {Function} settings
   * Configures settings for the database instance.
   *
   * @param {Object} obj - Settings object.
   */
  settings (obj) {
    argCheck(obj, "Invalid argument passed", true, [typeStrings.OBJECT]);
    let new_settings = {
      experimentalAutoDetectLongPolling: obj.experimentalAutoDetectLongPolling
       ? obj.experimentalAutoDetectLongPolling : 
       this._settings.experimentalAutoDetectLongPolling,
      experimentalForceLongPolling: obj.experimentalForceLongPolling ? 
      obj.experimentalForceLongPolling : 
      this._settings.experimentalForceLongPolling,
      host: obj.host ? obj.host : this._settings.host,
      ssl: obj.ssl ? obj.ssl : this._settings.ssl,
      merge: obj.merge ? obj.merge : this._settings.merge,
      ignoreUndefinedProperties: obj.ignoreUndefinedProperties ? 
      obj.ignoreUndefinedProperties : this._settings.ignoreUndefinedProperties,
      experimentalLongPollingOptions: obj.experimentalLongPollingOptions ? 
      obj.experimentalLongPollingOptions : 
      this._settings.experimentalLongPollingOptions
    };
    this._settings = new_settings;
  }

  /**
   * (Private) Retrieves data from bundle store using id (named query)
   *
   * @param {string} id - id to search from bundle store.
   * @returns {Object} - Retrieved data from indexed db.
   */
  __getBundleData(id) {
    Utils.baasLogger(this.app.logLevel, "retrieving bundle data", id);
    return this.#bundleStore.get(id);
  }

  /**
   * (Private) Sets data in bundle store.
   *
   * @param {Object} obj - Data to set in indexed db
   */
  __setBundleData(obj) {
    Utils.baasLogger(this.app.logLevel, "setting bundle data", obj);
    this.#bundleStore.set(obj);
  }

  /**
   * (Private) Retrieves data for real-time snapshots from snap store.
   *
   * @param {string} id - Indexed db query id.
   * @returns {Object} - Retrieved data from indexed db.
   */
  __retrieveSnaps(id) {
    return this.#snapStore.get(id);
  }

  /**
   * (Private) Sets data for real-time snapshots in snap store.
   *
   * @param {Object} object - Data to set on indexed db.
   */
  __setIndexDB(object) {
    Utils.baasLogger(this.app.logLevel, "index db set", object);
    //set on index db
    return this.#snapStore.set(object);
  }

  /**
   * (Private) Removes data from snap store.
   *
   * @param {string} id - Indexed db query id.
   */
  __removeIndexDB(id) {
    //remove from index db
    return this.#snapStore.delete(id);
  }

  /**
   * (Private) Sends message from message queue to socket.
   *
   * @param {Object} payload - Payload to send to the socket.
   */
  __sendMessage(payload) {
    payload = JSON.stringify(payload);
    if (this.#connection == null || this.#connection.readyState !== 1) {
      Utils.baasLogger(this.app.logLevel, "adding to message queue");
      this.__messageQueue.push(payload);
    } else {
      Utils.baasLogger(this.app.logLevel, "sending directly");
      this.#connection.send(payload);
    }
  }

  // {"changedData":
  // {"DOCUMENT":
  //  {"pid":46611,"}}, 
  //
  //  "CREATED":"2025-08-04T12:32:28.438713",
  //  "LAST_MODIFIED":"2025-08-04T12:32:28.438713",
  //  "VERSION":1,
  //  "SUBCOLLECTION":null,
  //  "PARENT_OID":"_docId",
  //  "OID":"5lzbte"},
  //  "operations":["INSERT"],
  //  "rowId":"AAASjvAABAAAQABAAE",
  //  "queryId":1
  // }
  /**
   * (Private) Creates connection with web socket and attaches listener for 
   * message events.
   */
  async __createSocket(token, app) {
    if (this.#connection != null 
      && !(this.#connection.readyState === WebSocket.CLOSED)) {
      return;
    }

    const snapToken = await getSnapshotToken(`${this.app.options.ordsHost}_/baas-services/idm/onprem/${this.app.options.projectID}/authorizeSnapshot?apiKey=${this.app.options.appID}`, token, app);

    this.#connection = createConnection(getHostString(this._settings.ssl, this._settings.host, snapToken["access_token"]));

    let __fireEvent = (event) => {
      this.__eventManager.dispatchEvent(event);
    }

    this.#connection.onopen = function (event) {
      event.preventDefault();
      __fireEvent(new Event("socket established"));
    };

    this.#connection.onerror = function (error) {
      alert(`[error]`);
    };

    const oracleDB = this;

    // adddoc {"changedData":{"name":"X","OID":"3DFC53CB5D260C74E0630C6846645653"},"operations":["INSERT"],"rowId":"AAASnuAABAAAAL+AAA","queryId":563653331}
    // setdoc {"changedData":{"name":"y","OID":"mydoc"},"operations":["UPDATE"],"rowId":"AAASnuAABAAAAL9AAA","queryId":563653331}
    // upddoc {"changedData":{"name":"y","OID":"3DFC53CB5D260C74E0630C6846645653"},"operations":["UPDATE"],"rowId":"AAASnuAABAAAAL+AAA","queryId":563653331}
    this.#connection.onmessage = function (event) {
      event.preventDefault();
      Utils.baasLogger(oracleDB.app.logLevel, "event received!", event.data);
      let eventData;
      try {
        eventData = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      //if not valid event
      if (!Object.prototype.hasOwnProperty.call(eventData, "queryId")
        || !Object.prototype.hasOwnProperty.call(eventData, "rowId")) {
        return;
      }

      const queryId = eventData.queryId;
      const rowId = eventData.rowId;
      let changedData = eventData.changedData;
      let oid = eventData.changedData.OID;
      const opr = eventData.operations;
      delete changedData["OID"];

      //if we are not listening for this particular query then return
      if (!Object.prototype.hasOwnProperty.call(oracleDB.__snaps, queryId)) {
        return;
      }

      const mappedQueryId = oracleDB.__queryIdMap[queryId];

      oracleDB.__retrieveSnaps(mappedQueryId).then(resObj => {
      Utils.baasLogger(oracleDB.app.logLevel, "resObj from retrieve", resObj);

        if (resObj == null) {
          return;
        }

        //if type is document
        if (resObj.type === 'document') {
          Utils.baasLogger(oracleDB.app.logLevel, "doucment level run");
          let docR;
          if (resObj.snap.ref.type === "dualityviewdocument") {
            docR = oracleDB.dualityViewDoc(resObj.path);
          } else {
            docR = oracleDB.doc(resObj.path);
          }

          if (opr[opr.length-1]=='DELETE') {
            changedData = resObj.snap._data;
          }

          let ver = null;
          let asof = null;
          let lastmod = null;
          if (changedData && changedData["_metadata"]) {
            ver = changedData["_metadata"]["etag"];
            asof = changedData["_metadata"]["asof"];
            delete changedData["_metadata"];
          }

          if (changedData && changedData["VERSION"]) {
            ver = changedData["VERSION"];
            delete changedData["VERSION"];
          }

          if (changedData && changedData["LAST_MODIFIED"]) {
            lastmod = changedData["LAST_MODIFIED"];
            delete changedData["LAST_MODIFIED"];
          }

          let docData = {
            "DOCUMENT": changedData,
            "LAST_MODIFIED": lastmod,
            "CREATED": null,
            "SUBCOLLECTION": null,
            "ASOF": asof,
            "PARENT_OID": null,
            "VERSION": ver,
            "ROWID": rowId
          }

          let docSnap = new DocumentSnapshot(docData, docR, new SnapshotMetadata(false, false));
          resObj.snap = docSnap;

          for (let it = 0; it < oracleDB.__snaps[queryId].length; it++) {
            const _queryId = oracleDB.__snaps[queryId][it];
            if (oracleDB.__callbacks[_queryId] != null) {
              try {
                oracleDB.__callbacks[_queryId].next(docSnap);
              } catch (ue) {
                 Utils.baasLogger(oracleDB.app.logLevel, "Error running callbacks ", ue);
              }
            }
          }

          oracleDB.__setIndexDB(resObj).then(() => {
            Utils.baasLogger(oracleDB.app.logLevel, "document set successful for onmessage");
          }).catch(e => { Utils.baasLogger(oracleDB.app.logLevel, e); return; });

          //end for document level
        } else {
          //start for query level
          Utils.baasLogger(oracleDB.app.logLevel, "query level run");

          let query;
          let ref = null;
          let oldSnap = resObj.snap;

          if (opr[opr.length-1]=='DELETE') {
            changedData = null;
            if (!oid) {
              for (let i =0;i<oldSnap._docs.length;i++) {
                if (oldSnap._docs[i].__rowId == rowId) {
                  oid = oldSnap._docs[i].id;
                  changedData = oldSnap._docs[i]._data;
                  break;
                }
              }
            }
          }

          if (resObj.snap.query.type === "dualityviewcollection") {
            query = oracleDB.dualityViewCollection(resObj.path);
            
            ref = query.dualityViewDoc(oid);
          } else {
            query = oracleDB.collection(resObj.path);
            ref = query.doc(oid);
          }
          let docChange = [];
          let ver = null;
          let asof = null;
          let lastmod = null;
          if (changedData && changedData["_metadata"]) {
            ver = changedData["_metadata"]["etag"];
            asof = changedData["_metadata"]["asof"];
            delete changedData["_metadata"];
          }

          if (changedData && changedData["VERSION"]) {
            ver = changedData["VERSION"];
            delete changedData["VERSION"];
          }

          if (changedData && changedData["LAST_MODIFIED"]) {
            lastmod = changedData["LAST_MODIFIED"];
            delete changedData["LAST_MODIFIED"];
          }

          let docData = {
            "DOCUMENT": changedData,
            "LAST_MODIFIED": lastmod,
            "CREATED": null,
            "SUBCOLLECTION": null,
            "ASOF": asof,
            "PARENT_OID": null,
            "VERSION": ver,
            "ROWID": rowId
          }
          
          let docSnap = new QueryDocumentSnapshot(docData, ref, new SnapshotMetadata(false, false));

          let docSnaps = oldSnap._docs;

          let indexMap = {};
          for (let i=0;i<docSnaps.length;i++) {
            indexMap[docSnaps[i].id] = i;
          }

          for (let i=opr.length-1;i>=0;i--) {
            if (opr[i] === "INSERT") {
              docSnaps.push(docSnap);
              docChange.push({
                doc: docSnap,
                type: "added",
                oldIndex: -1,
                newIndex: docSnaps.length-1,
              });
            } else if (opr[i] === "UPDATE") {
              docSnaps[indexMap[oid]] = docSnap;
              docChange.push({
                doc: docSnap,
                type: "modified",
                oldIndex: indexMap[oid],
                newIndex: indexMap[oid],
              });
            } else if (opr[i] === "DELETE") {
              docSnaps.splice(indexMap[oid],1);
              docChange.push({
                doc: docSnap,
                type: "removed",
                oldIndex: indexMap[oid],
                newIndex: -1,
              });
            }
            break;
          }
        
          let querSnap = new QuerySnapshot(docSnaps, query, new SnapshotMetadata(false, false));
          querSnap._docs = docSnaps;

          querSnap.docChanges = (options) => {
            return docChange;
          };

          resObj.snap = querSnap;

          //run the available callbacks
          for (let it = 0; it < oracleDB.__snaps[queryId].length; it++) {
            Utils.baasLogger(oracleDB.app.logLevel, "in for loop of callbacks");
            const _queryId = oracleDB.__snaps[queryId][it];

            Utils.baasLogger(oracleDB.app.logLevel, _queryId, oracleDB.__callbacks[_queryId]);
            if (oracleDB.__callbacks[_queryId] != null) {
              try {
                oracleDB.__callbacks[_queryId].next(resObj.snap);
              } catch (ue) {
                 Utils.baasLogger(oracleDB.app.logLevel, "Error running callbacks ", ue);
              }
            }
          }
          
          Utils.baasLogger(oracleDB.app.logLevel, "query set on message", resObj);
            oracleDB.__setIndexDB(resObj).then(() => {
              Utils.baasLogger(oracleDB.app.logLevel, "query set successful for onmessage");
            }).catch(e => { Utils.baasLogger(oracleDB.app.logLevel, e); return; });

        }

        //end on message
      }).catch(e => { Utils.baasLogger(oracleDB.app.logLevel, e); return; })

    }
  }

  /**
   * @property url
   * (Private) Gets base url string for database operations.
   *
   * @returns {string} url string.
   */
  get url() {
    return this.#conn.url;
  }

  /**
   * @property {Function} setLogLevel
   * Sets the log level for this database instance.
   * 
   * @returns {null}
   */
  setLogLevel(log) {
    this.app.logLevel = log;
  }

  /**
   * @property {Function} collection
   * Method to get `CollectionReference` instance that refers to the collection
   * for the given path.
   * 
   * @param {String} colPath
   * @returns {CollectionReference}
   */
  collection(colPath) {
    argCheck(colPath, "Invalid collection path", true, [typeStrings.STRING]);
    return new CollectionReference(this, colPath);
  }

  /**
   * @property {Function} dualityViewCollection
   * Method to get `DualityViewColReference` instance that refers to the duality 
   * view with the given name.
   * 
   * @param {String} name
   * @return {DualityViewColReference}
   */
  dualityViewCollection(name) {
    argCheck(name, "Invalid collection path", true, [typeStrings.STRING]);
    return new DualityViewColReference(this, name);
  }

  /**
   * @property {Function} dualityViewDoc
   * Method to get `DualityViewDocReference` instance that refers to the duality 
   * view document with the given path.
   * 
   * @param {String} docPath
   * @return {DualityViewDocReference}
   */
  dualityViewDoc(docPath) {
    argCheck(docPath, "Invalid document path", true, [typeStrings.STRING]);
    return new DualityViewDocReference(this, docPath);
  }

  /**
   * @property {Function} collectionGroup
   * Method to get `CollectionReference` instance that refers to the collection
   * group with the given name.
   * 
   * @param {String} name
   * @return {CollectionReference}
   */
  collectionGroup(name) {
    argCheck(name, "Invalid collection group name", true, [typeStrings.STRING]);
    const colRef = new CollectionReference(this, "");
    const query = colRef.__copyQuery();
    query._col_group = name;
    return query;
  }

  /**
   * @property {Function} doc
   * Method to get `DocumentReference` instance that refers to the document at 
   * the specified path.
   * 
   * @param {String} docPath
   * @return {DocumentReference}
   */
  doc(docPath) {
    argCheck(docPath, "Invalid document path", false, [typeStrings.STRING]);
    return new DocumentReference(this, docPath);
  }

  /**
   * @property {Function} runTransaction
   * Executes the callback function that gets a `Transaction` object and
   * uses it to read and write data. It applies the changes and finally
   * commits the changes. If it fails to commit after 5 attempts, the 
   * transaction fails.
   * 
   * @param {Function} callback // Function to execute.
   * @param {number} attempts   // Number of attempts to retry transaction.
   * @return {Promise <T>}
   */
  async runTransaction(callback, attempts) {
    argCheck(callback, "Invalid callback passed", true, [typeStrings.FUNCTION]);
    var trans_name = createUniqueName();
    let trans = new Transaction(trans_name);
    let res = null;
    let temp_res = null;
    let success = false;
    attempts = attempts == null ? 5 : attempts.maxAttempts;
    let retry = attempts;
    while (success === false && retry > 0) {
      try {
        if (retry < attempts) {
          trans.__reset();
        }
        res = await callback(trans);
        temp_res = await trans.__makeOperations();
        success = true;
      } catch (e) {
        if (retry === 1) {
          throw e;
        }
        retry--;
        success = false;
        
        let baseDelay = 50;
        let maxDelay = 10000;
        let delay = Math.min(baseDelay * (2 ** (attempts - retry)), maxDelay);
        let jitter = Math.random() * delay * 0.5;
        let waitTime = delay + jitter;
        
        // Utils.baasLogger(this.app.logLevel,
        //   `Will retry in ${Math.round(waitTime)} ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (res != null) {
      return res;
    }
    return temp_res;
  }

  /**
   * @property {Function} batch
   * Creates a write batch where multiple writes can be grouped together
   * as a single operation.
   * 
   * @return {WriteBatch}
   */
  batch() {
    var trans_name = createUniqueName();
    let wBatch = new WriteBatch(trans_name);
    return wBatch;
  }

  /**
   * @property {Function} join
   * Creates and returns a new Qery that applies a join.
   * 
   * @param {String} viewName
   * @return {Query} Returns a Query instance.
   * @throws {OracledbError} Throws an error if join is used on a namedQuery.
   */
  join(viewName) {
    argCheck(viewName, "Invalid join view passed", true,
      [typeStrings.STRING]);
    let _join = {
      "view_name":viewName
    };
    let q = this.collection("");
    let newQuery = q.__copyQuery();
    newQuery._joins.push(_join);
    return newQuery;
  }

  /**
   * @property {Function} updateDocs
   * Creates and returns a BulkUpdate instance.
   * 
   * @param {String} path
   * @return {BulkUpdate} Returns a BulkUpdate instance.
   */
  updateDocs (path) {
    return new BulkUpdate(this, path);
  }

  toJSON() {
    return {
      appName: this.app.name,
      type: this.type
    };
  }

  // /**
  //  * @property {Function} loadBundle
  //  * Loads a bundle data into the local cache. After loading, the bundle can be
  //  * queried using namedQuery.
  //  * 
  //  * @param {ArrayBuffer|ReadableStream<Uint8Array>|string} data
  //  * @return {LoadBundleTask} A task to manage bundle loading. 
  //  */
  // loadBundle(data) {
  //   nullCheck(data, "Invalid data.");
  //     if (!(data instanceof ReadableStream || data instanceof ArrayBuffer ||
  //       typeof data === 'string')) {
  //       let error = new Error(formatMessage(errorMessages.unsupportedBundleDataType));
  //       error.status = 400;
  //       throw oracledbErrorHandler(error);
  //     }

  //   return new LoadBundleTask(data, this, 10);
  // }

  /**
   * @property {Function} loadBundle
   * Creates a `Query` object that can be used to read data from bundle in
   * indexed db.
   * 
   * @param {string} name
   * @return {Query} Query object which can be used to get the data.
   */
  async namedQuery(name) {
    let query = new Query(this);
    query._path = [name];
    query.type = "namedquery";
    return query;
  }

}
