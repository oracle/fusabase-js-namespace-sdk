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

import IndexDBStore from './indexeddb_store.js';

//storage format
// {
//     name:<query name>,
//     documents:[{
//     path : <document path>,
//     data: <document data>
//     }],
//     bundleID: <bundle id>,
//     metadata: <metadata of bundle>
// }
class BundleStore {
  iDBStore;

  constructor(name, objectStoreName, key) {
    this.iDBStore = new IndexDBStore(name,objectStoreName,key);
  }

  async get(id) {
    return this.iDBStore.get(id);
  }

  async set(obj) {
    await this.iDBStore.set(obj);
  }

  async delete(id) {
    await this.iDBStore.delete(id);
  }

  async deleteDB() {
    await this.iDBStore.deleteDB();
  }
}

export default BundleStore;