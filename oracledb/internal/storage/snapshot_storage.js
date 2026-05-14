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

import oracledb_o from '../../oracledb.js';
import IndexDBStore from './indexeddb_store.js';

import { errorMessages, formatMessage } from "../../errors.js";

class SnapshotStorage {
  oracledb;
  iDBStore;

  constructor(oracledb, name, objectStoreName, key) {
    this.iDBStore = new IndexDBStore(name,objectStoreName,key);
    this.oracledb = oracledb;
  }

  async get(id) {
    const oracleDB = this.oracledb;
    let result = await this.iDBStore.get(id);

    //process 
    let ref = null;
    let snaps = [];
    let docChanges = [];
    if (result.type === "document") {
      const path = result.snap.ref._path.join("/");
      if (result.snap.ref.type === "dualityviewdocument") {
        ref = oracleDB.dualityViewDoc(path);
      } else {
        ref = oracleDB.doc(path);
      }
      ref = oracleDB.doc(path);
      result.snap = oracledb_o.DocumentSnapshot._parse(result.snap, ref);
    } else {
      for (let i = 0; i < result.snap._docs.length; i++) {
        const path = result.snap._docs[i].ref._path.join("/");
        if (result.snap._docs[i].ref.type === "dualityviewdocument") {
          ref = oracleDB.dualityViewDoc(path);
        } else {
          ref = oracleDB.doc(path);
        }
        snaps.push(oracledb_o.QueryDocumentSnapshot._parse(result.snap._docs[i], ref));
      }
      for (let i = 0; i < result.snap.docChanges.length; i++) {
        const path = result.snap.docChanges[i].doc.ref._path.join("/");
        if (result.snap.docChanges[i].doc.ref.type === "dualityviewdocument") {
          ref = oracleDB.dualityViewDoc(path);
        } else {
          ref = oracleDB.doc(path);
        }
        result.snap.docChanges[i].doc = oracledb_o.QueryDocumentSnapshot._parse(result.snap.docChanges[i].doc, ref);
        //result.snap.docChanges[i].doc = oracledb_o.QueryDocumentSnapshot._parse(result.snap._docs[i], ref);
        docChanges.push(result.snap.docChanges[i]);
      }
      const path = result.snap.query._path.join("/");
      if (result.snap.query.type === "dualityviewcollection") {
        ref = oracleDB.dualityViewCollection(path);
      } else {
        ref = oracleDB.collection(path);
      }
      
      ref = ref.__copyQuery();
      ref._conditions = result.snap.query._conditions;
      ref._aggregate = result.snap.query._aggregate;
      ref._explicitOrder = result.snap.query._explicitOrder;
      ref._joins = result.snap.query._joins;
      ref._limit = result.snap.query._limit;
      ref._col_group = result.snap.query._col_group;
      result.snap = oracledb_o.QuerySnapshot._parse(result.snap, ref, snaps);
      result.snap.docChanges = (options) => { return docChanges; }
    }

    return result;
  }

  async set(old_obj) {
    if (old_obj == null || old_obj["queryId"] == null || old_obj["queryId"] == "") {
      throw new Error(formatMessage(errorMessages.cannotSetNullEntry));
    }
    let obj = old_obj;
    obj.snap = old_obj.snap._jsonObject();
    
    await this.iDBStore.set(obj);
  }

  async delete(id) {
    await this.iDBStore.delete(id);
  }

  async deleteDB() {
    await this.iDBStore.deleteDB();
  }
}

export default SnapshotStorage;
