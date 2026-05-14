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

import { errorMessages, formatMessage } from "../../errors.js";

class IndexDBStore {

  constructor(name, objectStoreName, key) {
    this.name = name;
    this.objectStoreName = objectStoreName;
    this.key = key;
  }

  async get(id) {
    let pResolve = null;
    let pReject = null;
    let promise = new Promise((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
    });

    let result = null;
    let key = this.key;

    const request = indexedDB.open(this.name, 1);

    request.onerror = function (event) {
      pReject("An error occurred with IndexedDB");
    };

    request.onupgradeneeded = function () {
      const db = request.result;
      const store = db.createObjectStore(this.objectStoreName, { keyPath: key });
    };

    request.onsuccess = function () {

      const db = request.result;
      const transaction = db.transaction(this.objectStoreName, "readwrite");

      const store = transaction.objectStore(this.objectStoreName);
      const idQuery = store.get(id);
      idQuery.onsuccess = function () {

        if (idQuery.result == null) {
          throw new Error(formatMessage(errorMessages.entryNotFound));
        }
        result = idQuery.result;
      };

      transaction.oncomplete = function () {
        db.close();
        pResolve(result);
      };
    };

    return promise;
  }

  async set(obj) {
    let pResolve = null;
    let pReject = null;
    let promise = new Promise((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
    });

    let key = this.key;
    const request = indexedDB.open(this.name, 1);

    request.onerror = function (event) {
      pReject("An error occurred with IndexedDB");
    };

    request.onupgradeneeded = function () {
      const db = request.result;
      const store = db.createObjectStore(this.objectStoreName, { keyPath: key });
    };

    request.onsuccess = function () {

      const db = request.result;
      const transaction = db.transaction(this.objectStoreName, "readwrite");

      const store = transaction.objectStore(this.objectStoreName);

      store.put(obj);

      transaction.oncomplete = function () {
        db.close();
        pResolve();
      };

    };

    return promise;
  }

  async delete(id) {
    let pResolve = null;
    let pReject = null;
    let promise = new Promise((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
    });
    let key = this.key;
    const request = indexedDB.open(this.name, 1);

    request.onerror = function (event) {
      pReject("An error occurred with IndexedDB");
    };

    request.onupgradeneeded = function () {
      const db = request.result;
      const store = db.createObjectStore(this.objectStoreName, { keyPath: key });
    };

    request.onsuccess = function () {
      const db = request.result;
      const transaction = db.transaction(this.objectStoreName, "readwrite");

      const store = transaction.objectStore(this.objectStoreName);
      store.delete(id);

      transaction.oncomplete = function () {
        db.close();
        pResolve();
      };

    };

    return promise;
  }

  async deleteDB() {
    let pResolve = null;
    let pReject = null;
    let promise = new Promise((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
    });
    const DBDeleteRequest = window.indexedDB.deleteDatabase(this.name);

    DBDeleteRequest.onerror = (event) => {
      pReject("An error occurred with IndexedDB");
    };

    DBDeleteRequest.onsuccess = (event) => {
      pResolve();
    };

    return promise;
  }
}

export default IndexDBStore;
