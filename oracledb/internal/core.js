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
import { getAppStorageKey, getAppStorageScope } from "../../app/storage-scope.js";
import {
  DEFAULT_LONG_POLLING_TIMEOUT_SECONDS,
  MAX_REALTIME_MESSAGE_QUEUE_BYTES,
  MAX_REALTIME_MESSAGE_QUEUE_COUNT,
  normalizeLongPollingOptions
} from "./settings.js";

const DISALLOWED_REALTIME_SETTINGS = ["host", "ssl"];
const MAX_LIKE_MATCH_LENGTH = 1024;

function buildRealtimeEndpoint(ordsHost) {
  const [scheme, hostWithPath = ""] = ordsHost.split("://");
  const schemaName = hostWithPath.split("ords")[1] ?? "";
  const hostPrefix = hostWithPath.split("ords")[0] ?? "";

  return {
    host: `${hostPrefix}ords/baas-realtime${schemaName}`,
    ssl: scheme !== "http"
  };
}

function rejectRealtimeEndpointOverrides(settings) {
  for (const key of DISALLOWED_REALTIME_SETTINGS) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const error = new Error(
        "Oracledb realtime host and SSL settings cannot be changed at runtime."
      );
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
  }
}

function normalizeRuntimeLongPollingOptions(
  options,
  fallbackTimeoutSeconds = DEFAULT_LONG_POLLING_TIMEOUT_SECONDS
) {
  try {
    return normalizeLongPollingOptions(options, fallbackTimeoutSeconds);
  } catch (err) {
    throw oracledbErrorHandler(err);
  }
}

function getMessageByteLength(message) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(message).length;
  }

  return message.length;
}

function createRealtimeQueueError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function createRealtimeSocketError(message) {
  const error = new Error(message);
  error.status = 408;
  return error;
}

function versionMarker(value) {
  if (value == null || value === "") return null;
  try {
    return BigInt(String(value));
  } catch {
    const timestamp = Date.parse(String(value));
    return Number.isNaN(timestamp) ? null : timestamp;
  }
}

function isStaleRealtimeDocumentEvent(snapshot, incomingVersion) {
  const currentVersion = snapshot?._otherMetadata?.VERSION ?? snapshot?.__version;
  const currentMarker = versionMarker(currentVersion);
  const incomingMarker = versionMarker(incomingVersion);
  return currentMarker != null && incomingMarker != null &&
    typeof currentMarker === typeof incomingMarker && incomingMarker < currentMarker;
}

function extractRealtimeChange(eventData) {
  const rawChangedData = eventData.changedData;
  const relationalData = rawChangedData?.DATA;
  const sourceData = relationalData != null && typeof relationalData === "object"
    ? relationalData
    : rawChangedData ?? {};
  const {
    OID: dataOid,
    _metadata: dataMetadata,
    parent_oid: parentOid,
    ...changedData
  } = sourceData;
  const metadata = dataMetadata ?? rawChangedData?._metadata ?? eventData._metadata ?? {};
  const oid = dataOid ?? rawChangedData?.OID ?? metadata.OID ?? null;
  return {
    changedData,
    oid,
    metadata: {
      version: metadata.VERSION ?? metadata.etag ?? null,
      asOf: metadata.ASOF ?? metadata.asof ?? null,
      lastModified: metadata.LAST_MODIFIED ?? null,
      created: metadata.CREATED ?? null,
      parentOid: metadata.PARENT_OID ?? parentOid ?? null
    }
  };
}

function getFieldValue(data, fieldPath) {
  if (!data || !fieldPath) return undefined;
  return fieldPath.split(".").reduce((value, key) =>
    value != null && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined,
  data);
}

/**
 * Matches SQL-style LIKE wildcards without constructing a regular expression.
 * `%` matches zero or more UTF-16 code units; `_` matches one code unit.
 */
function matchesLikePattern(pattern, actual) {
  if (pattern.length > MAX_LIKE_MATCH_LENGTH || actual.length > MAX_LIKE_MATCH_LENGTH) {
    return false;
  }

  let patternIndex = 0;
  let actualIndex = 0;
  let percentIndex = -1;
  let percentMatchIndex = 0;

  while (actualIndex < actual.length) {
    if (patternIndex < pattern.length &&
        (pattern[patternIndex] === "_" || pattern[patternIndex] === actual[actualIndex])) {
      patternIndex += 1;
      actualIndex += 1;
    } else if (patternIndex < pattern.length && pattern[patternIndex] === "%") {
      percentIndex = patternIndex;
      patternIndex += 1;
      percentMatchIndex = actualIndex;
    } else if (percentIndex !== -1) {
      patternIndex = percentIndex + 1;
      percentMatchIndex += 1;
      actualIndex = percentMatchIndex;
    } else {
      return false;
    }
  }

  while (patternIndex < pattern.length && pattern[patternIndex] === "%") {
    patternIndex += 1;
  }
  return patternIndex === pattern.length;
}

function matchesQueryFilters(data, conditions = []) {
  return conditions.every(({ field, op, value }) => {
    if (!field) return false;
    const actual = getFieldValue(data, field);
    switch (op) {
      case "=": case "==": return actual === value;
      case "!=": return actual !== value;
      case "<": return actual < value;
      case "<=": return actual <= value;
      case ">": return actual > value;
      case ">=": return actual >= value;
      case "in": return Array.isArray(value) && value.includes(actual);
      case "not in": case "not-in": return Array.isArray(value) && !value.includes(actual);
      case "array-contains": return Array.isArray(actual) && actual.includes(value);
      case "array-contains-any": return Array.isArray(actual) && Array.isArray(value) && value.some(item => actual.includes(item));
      case "is NULL": case "is-null": return actual == null;
      case "like": {
        if (typeof actual !== "string") return false;
        return matchesLikePattern(String(value), actual);
      }
      default: return false;
    }
  });
}

function compareQueryValues(left, right) {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return left < right ? -1 : 1;
}

function applyQueryOrdering(docs, query) {
  const orderedDocs = [...docs];
  const explicitOrder = query?._explicitOrder ?? [];
  if (explicitOrder.length > 0) {
    orderedDocs.sort((left, right) => {
      for (const { field, direction } of explicitOrder) {
        const comparison = compareQueryValues(
          getFieldValue(left._data, field),
          getFieldValue(right._data, field)
        );
        if (comparison !== 0) return direction === "desc" ? -comparison : comparison;
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }
  return orderedDocs;
}

function querySnapshotChanges(previous, current) {
  const key = doc => doc.ref?.path ?? doc.id;
  const dataKey = doc => JSON.stringify(doc.data());
  const previousByKey = new Map(previous.docs.map((doc, index) => [key(doc), { doc, index }]));
  const currentByKey = new Map(current.docs.map((doc, index) => [key(doc), { doc, index }]));
  const changes = [];
  for (const [documentKey, entry] of previousByKey) {
    if (!currentByKey.has(documentKey)) changes.push({ doc: entry.doc, type: "removed", oldIndex: entry.index, newIndex: -1 });
  }
  for (const [documentKey, entry] of currentByKey) {
    const previousEntry = previousByKey.get(documentKey);
    if (!previousEntry) changes.push({ doc: entry.doc, type: "added", oldIndex: -1, newIndex: entry.index });
    else if (previousEntry.index !== entry.index || dataKey(previousEntry.doc) !== dataKey(entry.doc)) {
      changes.push({ doc: entry.doc, type: "modified", oldIndex: previousEntry.index, newIndex: entry.index });
    }
  }
  return changes;
}

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
   * (Private) in-flight websocket creation shared by concurrent listeners.
   */
  #connectionPromise = null;

  /**
   * Increments whenever authenticated realtime state is discarded. Socket
   * creation captures this value so a request started for a previous user
   * cannot install a connection after sign-out.
   * @private
   */
  #realtimeGeneration = 0;

  /**
  * @property 
  * (Private) bundle store for load bundle
  */
  #bundleStore;

  #realtimeHost;
  #realtimeSsl;

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
  __messageQueueBytes = 0;

  /**
  * @property 
  * (Private) in-memory map of socket queryid to indexed db queryid
  */
  __queryIdMap = {};
  __initialSnapshotReady = {};
  __initialSnapshotEvents = {};
  __initialSnapshotEventBytes = {};
  __realtimeEventTails = {};
  __realtimeProcessingEvents = new WeakSet();

  /**
   * Creates a new `Oracledb` instance.
   * Private constructor
   *
   * @param {App} app - fusabase app instance.
   */
  constructor(app) {
    this.app = app;
    const storageScope = getAppStorageScope(app);
    this.__listenerKey = getAppStorageKey(app, "indexeddb_listener_count");
    this.type = "oracledb";
    const realtimeEndpoint = buildRealtimeEndpoint(app.options.ordsHost ?? '');
    this.#realtimeHost = realtimeEndpoint.host;
    this.#realtimeSsl = realtimeEndpoint.ssl;
    const initialLongPollingOptions = app.options.longPollingInterval === undefined
      ? undefined
      : { timeoutSeconds: app.options.longPollingInterval };
    this._settings = {
      experimentalAutoDetectLongPolling: !app.options.useSocket,
      experimentalForceLongPolling: !app.options.useSocket,
      host: this.#realtimeHost,
      ssl: this.#realtimeSsl,
      merge: false,
      ignoreUndefinedProperties: true,
      experimentalLongPollingOptions: normalizeRuntimeLongPollingOptions(initialLongPollingOptions)
    };
    this.#conn = new DBConn(app);
    this.#snapStore = new SnapshotStorage(this, `${storageScope}:SNAP_DB1`,
      "SNAPS", "queryId");
    this.#bundleStore = new BundleStore(`${storageScope}:BUNDLES`,
      "BUNDLE_DOCS", "name");

    this.__eventManager = new EventTarget();
    if (this.__eventManager.addEventListener != null) {
      this.__eventManager.addEventListener("socket established", (e) => {
        e.preventDefault();
        const queuedMessages = [...this.__messageQueue];
        this.__clearMessageQueue();
        for (let i = 0; i < queuedMessages.length; i++) {
          Utils.baasLogger(this.app.logLevel, "sending message from queue", queuedMessages[i]);
          try {
            this.#connection.send(queuedMessages[i]);
          } catch {
            const error = createRealtimeSocketError("Realtime socket send failed.");
            this.__failRealtimeListeners(error);
            break;
          }
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
    rejectRealtimeEndpointOverrides(obj);
    const currentTimeoutSeconds =
      this._settings.experimentalLongPollingOptions?.timeoutSeconds ??
      DEFAULT_LONG_POLLING_TIMEOUT_SECONDS;
    const experimentalLongPollingOptions =
      obj.experimentalLongPollingOptions === undefined
        ? this._settings.experimentalLongPollingOptions
        : normalizeRuntimeLongPollingOptions(
            obj.experimentalLongPollingOptions,
            currentTimeoutSeconds
          );
    this._settings = {
      experimentalAutoDetectLongPolling: obj.experimentalAutoDetectLongPolling ?? this._settings.experimentalAutoDetectLongPolling,
      experimentalForceLongPolling: obj.experimentalForceLongPolling ?? this._settings.experimentalForceLongPolling,
      host: this.#realtimeHost,
      ssl: this.#realtimeSsl,
      merge: obj.merge ?? this._settings.merge,
      ignoreUndefinedProperties: obj.ignoreUndefinedProperties ?? this._settings.ignoreUndefinedProperties,
      experimentalLongPollingOptions
    };
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

  __clearMessageQueue() {
    this.__messageQueue = [];
    this.__messageQueueBytes = 0;
  }

  __registerSnapshotQuery(queryId, snapshotKey) {
    const existing = this.__queryIdMap[queryId];
    if (existing != null && existing !== snapshotKey) {
      throw new Error("Snapshot query ID collision");
    }
    this.__queryIdMap[queryId] = snapshotKey;
    if (!Object.prototype.hasOwnProperty.call(this.__snaps, queryId)) {
      this.__initialSnapshotReady[queryId] = false;
      this.__initialSnapshotEvents[queryId] = [];
      this.__initialSnapshotEventBytes[queryId] = 0;
    }
  }

  __markInitialSnapshotReady(queryId) {
    if (!Object.prototype.hasOwnProperty.call(this.__snaps, queryId)) return;
    this.__initialSnapshotReady[queryId] = true;
    const events = this.__initialSnapshotEvents[queryId] ?? [];
    delete this.__initialSnapshotEvents[queryId];
    delete this.__initialSnapshotEventBytes[queryId];
    for (const event of events) {
      void this.#connection?.onmessage?.(event);
    }
  }

  __unregisterSnapshotQuery(queryId) {
    delete this.__queryIdMap[queryId];
    delete this.__initialSnapshotReady[queryId];
    delete this.__initialSnapshotEvents[queryId];
    delete this.__initialSnapshotEventBytes[queryId];
    delete this.__realtimeEventTails[queryId];
  }

  __clearInitialSnapshotEvents() {
    this.__initialSnapshotReady = {};
    this.__initialSnapshotEvents = {};
    this.__initialSnapshotEventBytes = {};
    this.__realtimeEventTails = {};
    this.__realtimeProcessingEvents = new WeakSet();
  }

  __enqueueRealtimeEvent(queryId, event, processor) {
    if (this.__realtimeProcessingEvents.has(event)) return processor();

    this.__realtimeProcessingEvents.add(event);
    const previous = this.__realtimeEventTails[queryId] ?? Promise.resolve();
    const current = previous.catch(() => {}).then(processor);
    this.__realtimeEventTails[queryId] = current;
    return current.finally(() => {
      this.__realtimeProcessingEvents.delete(event);
      if (this.__realtimeEventTails[queryId] === current) {
        delete this.__realtimeEventTails[queryId];
      }
    });
  }

  __failRealtimeListeners(error) {
    const callbacks = Object.values(this.__callbacks);
    this.__clearMessageQueue();
    this.__clearInitialSnapshotEvents();
    this.__snaps = {};
    this.__callbacks = {};
    this.__queryIdMap = {};

    for (const callback of callbacks) {
      if (callback?.error) {
        try {
          callback.error(error);
        } catch (ue) {
          Utils.baasLogger(this.app.logLevel, "Error in snapshot callback", ue);
        }
      }
    }
  }

  /**
   * Discards all authenticated realtime state for the current app.
   *
   * This is called when Auth signs out. It closes the authenticated socket,
   * fails active callbacks, drops queued messages and query mappings, and
   * removes cached snapshots so a later user cannot inherit prior-user data.
   *
   * @param {Error} [error] - Error delivered to active listener error
   * callbacks.
   * @returns {Promise<void>} Resolves after local realtime state is cleared.
   * @private
   */
  async __clearRealtimeState(
    error = new Error("Realtime listeners were terminated because the user signed out.")
  ) {
    this.#realtimeGeneration += 1;
    const socket = this.#connection;
    this.#connection = null;
    this.#connectionPromise = null;
    this.__failRealtimeListeners(error);
    this.__listening = 0;

    if (socket != null) {
      try {
        socket.close();
      } catch {
        // Ignore close failures while clearing local realtime state.
      }
    }

    if (this.#snapStore != null) {
      try {
        await this.#snapStore.deleteDB();
      } catch (err) {
        Utils.baasLogger(this.app.logLevel, "Unable to clear realtime snapshot cache", err);
      }
    }
  }

  __failRealtimeQuery(queryId, error) {
    const listenerIds = this.__snaps[queryId] ?? [];
    delete this.__snaps[queryId];
    this.__unregisterSnapshotQuery(queryId);

    for (const listenerId of listenerIds) {
      const callback = this.__callbacks[listenerId];
      delete this.__callbacks[listenerId];
      if (callback?.error) {
        try {
          callback.error(error);
        } catch (ue) {
          Utils.baasLogger(this.app.logLevel, "Error in snapshot callback", ue);
        }
      }
    }
  }

  __queueMessage(message) {
    const messageBytes = getMessageByteLength(message);
    if (
      messageBytes > MAX_REALTIME_MESSAGE_QUEUE_BYTES ||
      this.__messageQueue.length >= MAX_REALTIME_MESSAGE_QUEUE_COUNT ||
      this.__messageQueueBytes + messageBytes > MAX_REALTIME_MESSAGE_QUEUE_BYTES
    ) {
      const error = createRealtimeQueueError("Realtime listener message queue limit exceeded.");
      this.__failRealtimeListeners(error);
      throw oracledbErrorHandler(error);
    }

    this.__messageQueue.push(message);
    this.__messageQueueBytes += messageBytes;
  }

  /**
   * (Private) Sends message from message queue to socket.
   *
   * @param {Object} payload - Payload to send to the socket.
   */
  __sendMessage(payload) {
    const strPayload = JSON.stringify(payload);
    if (this.#connection == null || this.#connection.readyState !== 1) {
      Utils.baasLogger(this.app.logLevel, "adding to message queue");
      this.__queueMessage(strPayload);
    } else {
      Utils.baasLogger(this.app.logLevel, "sending directly");
      this.#connection.send(strPayload);
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

    if (this.#connectionPromise != null) {
      return this.#connectionPromise;
    }

    const connectionGeneration = this.#realtimeGeneration;
    const connectionPromise = (async () => {
      const snapToken = await getSnapshotToken(`${this.app.options.ordsHost}_/baas-services/idm/onprem/${this.app.options.projectID}/authorizeSnapshot?apiKey=${this.app.options.appID}`, token, app);

      if (connectionGeneration !== this.#realtimeGeneration) {
        return;
      }

      if (this.#connection != null && this.#connection.readyState !== WebSocket.CLOSED) {
        return;
      }

      const socket = createConnection(getHostString(this.#realtimeSsl, this.#realtimeHost, snapToken["access_token"]));
      if (connectionGeneration !== this.#realtimeGeneration) {
        try {
          socket.close();
        } catch {
          // Ignore close failures for a stale socket.
        }
        return;
      }
      this.#connection = socket;

      let __fireEvent = (event) => {
        this.__eventManager.dispatchEvent(event);
      }

      socket.onopen = function (event) {
        event.preventDefault();
        if (oracleDB.#connection !== socket) return;
        __fireEvent(new Event("socket established"));
      };

      socket.onerror = (error) => {
        if (this.#connection !== socket) return;
        Utils.baasLogger(this.app.logLevel, "Realtime socket error", error);
        this.__failRealtimeListeners(
          createRealtimeSocketError("Realtime socket connection failed.")
        );
        try {
          socket.close();
        } catch {
          // Ignore close errors after a failed websocket connection.
        }
        this.#connection = null;
      };

      const oracleDB = this;

    // adddoc {"changedData":{"name":"X","OID":"3DFC53CB5D260C74E0630C6846645653"},"operations":["INSERT"],"rowId":"AAASnuAABAAAAL+AAA","queryId":563653331}
    // setdoc {"changedData":{"name":"y","OID":"mydoc"},"operations":["UPDATE"],"rowId":"AAASnuAABAAAAL9AAA","queryId":563653331}
    // upddoc {"changedData":{"name":"y","OID":"3DFC53CB5D260C74E0630C6846645653"},"operations":["UPDATE"],"rowId":"AAASnuAABAAAAL+AAA","queryId":563653331}
    socket.onmessage = async function (event) {
      if (oracleDB.#connection !== socket ||
          connectionGeneration !== oracleDB.#realtimeGeneration) {
        return;
      }
      event.preventDefault();
      if (typeof event.data !== "string" ||
          event.data.length > MAX_REALTIME_MESSAGE_QUEUE_BYTES) {
        return;
      }
      const eventBytes = getMessageByteLength(event.data);
      if (eventBytes > MAX_REALTIME_MESSAGE_QUEUE_BYTES) {
        return;
      }
      let eventData;
      try {
        eventData = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      Utils.baasLogger(oracleDB.app.logLevel, "event received!", event.data);

      if (eventData?.error && eventData.queryId != null) {
        oracleDB.__failRealtimeQuery(
          eventData.queryId,
          new Error(typeof eventData.error === "string" ? eventData.error : "Realtime listener error.")
        );
        return;
      }

      //if not valid event
      if (!Object.prototype.hasOwnProperty.call(eventData, "queryId")
        || !Object.prototype.hasOwnProperty.call(eventData, "rowId")) {
        return;
      }

      const queryId = eventData.queryId;
      const rowId = eventData.rowId;
      const realtimeChange = extractRealtimeChange(eventData);
      let changedData = realtimeChange.changedData;
      let oid = realtimeChange.oid;
      const opr = eventData.operations;

      //if we are not listening for this particular query then return
      if (!Object.prototype.hasOwnProperty.call(oracleDB.__snaps, queryId)) {
        return;
      }

      // Do not let a realtime delta overtake the initial REST snapshot that
      // establishes the listener's local state.
      if (oracleDB.__initialSnapshotReady[queryId] === false) {
        const events = oracleDB.__initialSnapshotEvents[queryId] ?? [];
        const pendingBytes = oracleDB.__initialSnapshotEventBytes[queryId] ?? 0;
        if (
          events.length >= MAX_REALTIME_MESSAGE_QUEUE_COUNT ||
          pendingBytes + eventBytes > MAX_REALTIME_MESSAGE_QUEUE_BYTES
        ) {
          oracleDB.__failRealtimeQuery(
            queryId,
            createRealtimeQueueError("Realtime initial snapshot event queue limit exceeded.")
          );
          return;
        }
        events.push(event);
        oracleDB.__initialSnapshotEvents[queryId] = events;
        oracleDB.__initialSnapshotEventBytes[queryId] = pendingBytes + eventBytes;
        return;
      }

      // IndexedDB reads and writes are asynchronous. Process deltas for a
      // subscription one at a time so a later message cannot overwrite an
      // earlier message's snapshot update.
      if (!oracleDB.__realtimeProcessingEvents.has(event)) {
        return oracleDB.__enqueueRealtimeEvent(
          queryId,
          event,
          () => oracleDB.#connection?.onmessage?.(event)
        );
      }

      const mappedQueryId = oracleDB.__queryIdMap[queryId];

      try {
      const resObj = await oracleDB.__retrieveSnaps(mappedQueryId);
      Utils.baasLogger(oracleDB.app.logLevel, "resObj from retrieve", resObj);

        if (resObj == null) {
          return;
        }

        //if type is document
        if (resObj.type === 'document') {
          Utils.baasLogger(oracleDB.app.logLevel, "doucment level run");
          const listenedDocId = String(resObj.path ?? "").split("/").filter(Boolean).pop();
          if ((oid && listenedDocId && oid !== listenedDocId) ||
              (!oid && rowId && resObj.snap?.__rowId && resObj.snap.__rowId !== rowId)) {
            return;
          }
          let docR;
          if (resObj.snap.ref.type === "dualityviewdocument") {
            docR = oracleDB.dualityViewDoc(resObj.path);
          } else {
            docR = oracleDB.doc(resObj.path);
          }

          if (isStaleRealtimeDocumentEvent(resObj.snap, realtimeChange.metadata.version)) {
            return;
          }

          if (opr[opr.length-1]=='DELETE') {
            changedData = resObj.snap._data;
          }

          let ver = realtimeChange.metadata.version;
          let asof = realtimeChange.metadata.asOf;
          let lastmod = realtimeChange.metadata.lastModified;
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
            "CREATED": realtimeChange.metadata.created,
            "SUBCOLLECTION": null,
            "ASOF": asof,
            "PARENT_OID": realtimeChange.metadata.parentOid,
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

          await oracleDB.__setIndexDB(resObj);
          Utils.baasLogger(oracleDB.app.logLevel, "document set successful for onmessage");

          //end for document level
        } else {
          //start for query level
          Utils.baasLogger(oracleDB.app.logLevel, "query level run");

          let query;
          let ref = null;
          let oldSnap = resObj.snap;

          const currentDocument = oldSnap._docs.find(doc => oid ? doc.id === oid : doc.__rowId === rowId);
          if (currentDocument && isStaleRealtimeDocumentEvent(currentDocument, realtimeChange.metadata.version)) {
            return;
          }

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
          const operation = opr[opr.length - 1];
          const oldIndex = oldSnap._docs.findIndex(doc => String(doc.id) === String(oid));
          let ver = realtimeChange.metadata.version;
          let asof = realtimeChange.metadata.asOf;
          let lastmod = realtimeChange.metadata.lastModified;
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
            "CREATED": realtimeChange.metadata.created,
            "SUBCOLLECTION": null,
            "ASOF": asof,
            "PARENT_OID": realtimeChange.metadata.parentOid,
            "VERSION": ver,
            "ROWID": rowId
          }
          
          let docSnap = new QueryDocumentSnapshot(docData, ref, new SnapshotMetadata(false, false));

          if (!oid) return;

          const activeQuery = oldSnap.query ?? query;

          let docSnaps = [...oldSnap._docs];
          const existedInOldSnapshot = oldIndex >= 0;
          const matchesQuery = operation !== "DELETE" &&
            matchesQueryFilters(changedData, oldSnap.query?._conditions ?? []);

          if (operation === "DELETE") {
            if (!existedInOldSnapshot) return;
            docSnaps.splice(oldIndex, 1);
          } else if (!matchesQuery) {
            if (!existedInOldSnapshot) return;
            docSnaps.splice(oldIndex, 1);
          } else if (operation === "INSERT" || !existedInOldSnapshot) {
              docSnaps.push(docSnap);
          } else if (operation === "UPDATE") {
              docSnaps[oldIndex] = docSnap;
          }

          docSnaps = applyQueryOrdering(docSnaps, activeQuery);
          let querSnap = new QuerySnapshot(docSnaps, activeQuery, new SnapshotMetadata(false, false));
          const docChange = querySnapshotChanges(oldSnap, querSnap);
          if (docChange.length === 0) return;

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
          await oracleDB.__setIndexDB(resObj);
          Utils.baasLogger(oracleDB.app.logLevel, "query set successful for onmessage");

        }

        //end on message
      } catch (e) {
        Utils.baasLogger(oracleDB.app.logLevel, e);
      }

      };
    })();

    this.#connectionPromise = connectionPromise;
    try {
      await connectionPromise;
    } finally {
      if (this.#connectionPromise === connectionPromise) {
        this.#connectionPromise = null;
      }
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
