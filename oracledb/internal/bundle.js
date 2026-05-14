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

import { TaskState } from "../utils/utils.js";
import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";

export class LoadBundleTaskProgress {
  bytesLoaded;
  documentsLoaded;
  totalBytes;
  taskState;
  totalDocuments;

  constructor(totalBytes, totalDocuments) {
    this.bytesLoaded = 0;
    this.documentsLoaded = 0;
    this.totalBytes = totalBytes;
    this.totalDocuments = totalDocuments;
    this.taskState = TaskState.RUNNING;
  }
}

export class LoadBundleTask {
  #data;
  #db;
  taskProgress;
  #promise = null;
  callbacks;
  #resolve = null;
  #chunkSize;
  #reject = null;

  constructor(data, db, chunkSize) {
    this.taskProgress = new LoadBundleTaskProgress(0, 0);
    this.callbacks = {
      next: null,
      error: null,
      complete: null
    };
    this.#db = db;
    this.#chunkSize = chunkSize;
    this.#promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });

    parseAndGetTotalBytes(data).then(res => {
      this.#data = res["data"];
      this.taskProgress.totalBytes = res["totalBytes"];
      this.taskProgress.totalDocuments = res["data"]["documents"].length;
      this.#initLoad();
    }).catch(e => {
      e.status = 500;
      let baas_error = oracledbErrorHandler(e);
      this.taskProgress.taskState = TaskState.ERROR;
      this.#reject(baas_error);
    })

  }

  // {
  //   "bundleID": "multi-query-bundle",
  //   "queries": [
  //     {
  //       "name": "products-query",
  //       "collectionPath": "products",
  //       "documents": [
  //         "/products/prod123",
  //         "/products/prod456"
  //       ]
  //     },
  //     {
  //       "name": "reviews-query",
  //       "collectionPath": "reviews",
  //       "documents": [
  //         "/reviews/rev123",
  //         "/reviews/rev456"
  //       ]
  //     }
  //   ],
  //   "documents": {
  //     "/products/prod123": {
  //       "name": "Smartphone",
  //       "price": 599.99,
  //       "inStock": true
  //     },
  //     "/products/prod456": {
  //       "name": "Laptop",
  //       "price": 999.99,
  //       "inStock": false
  //     },
  //     "/reviews/rev123": {
  //       "user": "Alice",
  //       "rating": 5,
  //       "comment": "Excellent!"
  //     },
  //     "/reviews/rev456": {
  //       "user": "Bob",
  //       "rating": 4,
  //       "comment": "Good, but could be better"
  //     }
  //   },
  //   "metadata": {
  //     "bundleSize": 4096,
  //     "documentCount": 4,
  //     "lastLoaded": "2024-09-05T12:34:56Z"
  //   }
  // }
  #transformData() {
    let newData = [];

    for (var j = 0; j < this.#data["queries"].length; j++) {
      let qObj = {
        name: this.#data["queries"][j]["name"],
        documents: [],
        bundleID: this.#data["bundleID"],
        metadata: this.#data["metadata"]
      };

      for (var k = 0; k < this.#data["queries"][j]["doucments"].length; k++) {
        const docPath = this.#data["queries"][j]["doucments"][k];
        if (!Object.prototype.hasOwnProperty.call(this.#data["documents"], docPath)) {
          let err = new Error(formatMessage(errorMessages.documentDataNotPresent));
          err.status = 400;
          throw oracledbErrorHandler(err);
        }
        qObj["documents"].push({
          path: docPath,
          data: this.#data["documents"][docPath]
        });
      }

      newData.push(qObj);
    }

    this.#data = newData;
  }

  async #initLoad() {
    this.#transformData();

    while (true) {
      let querOffset = 0;
      let docOffset = 0;

      let y = Math.min(docOffset + this.#chunkSize, this.#data[querOffset]["documents"].length);

      let oldData = await this.#db.__getBundleData(this.#data[querOffset]["name"]);
      let oldBytes = getTotalBytes(oldData);

      if (oldData == null) {
        oldData = {};
        oldData["name"] = this.#data[querOffset]["name"];
        oldData["documents"] = [];
        oldData["bundleID"] = this.#data[querOffset]["bundleID"];
        oldData["metadata"] = this.#data[querOffset]["metadata"];
      }

      let ct = 0;

      for (var j = docOffset; j < y; j++) {
        ct += 1;
        oldData["documents"].push(this.#data[querOffset]["documents"][j]);
      }

      await this.#db.__setBundleData(oldData);
      let newBytes = getTotalBytes(oldData);

      docOffset = y;
      docOffset = docOffset % this.#data[querOffset]["documents"].length;
      if (docOffset == 0) {
        querOffset += 1;
      }

      this.taskProgress.documentsLoaded = this.taskProgress.documentsLoaded + ct;
      this.taskProgress.bytesLoaded = this.taskProgress.bytesLoaded + (newBytes - oldBytes);

      if (this.taskProgress.documentsLoaded === this.taskProgress.totalDocuments) {
        this.taskProgress.taskState = TaskState.SUCCESS;
      }

      if (this.callbacks.next != null) {
        this.callbacks.next(this.taskProgress);
      }
      if (this.taskProgress.taskState === TaskState.SUCCESS) {
        if (this.callbacks.complete != null) {
          this.callbacks.complete();
          this.#resolve(this.taskProgress);
          break;
        }
      }
    }
  }

  onProgress(next = null, error = null, complete = null) {
    this.callbacks["next"] = next;
    this.callbacks["error"] = error;
    this.callbacks["complete"] = complete;
  }

  /**
  * @function
  * Set callback for successuful completion of the task. 
  * @returns {void} 
  */
  then(onSuccess, onReject) {
    return this.#promise.then(onSuccess, onReject);
  }

  /**
   * @function
   * Set callback for unsuccessful completion of the task. 
   * @returns {void} 
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }

}

function getTotalBytes (data) {
    if (data == null) {
        return 0;
    }
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const byteArray = encoder.encode(jsonString);
    const totalBytes = byteArray.length;
    return totalBytes;
}

async function parseAndGetTotalBytes(data) {
    let jsonObject;
    let jsonString;
  
    if (data instanceof ArrayBuffer) {
      jsonString = new TextDecoder("utf-8").decode(data);
      jsonObject = JSON.parse(jsonString);
    } else if (data instanceof ReadableStream) {
      const reader = data.getReader();
      const chunks = [];
      let done, value;
  
      while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
          chunks.push(value);
        }
      }
  
      const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let position = 0;
      for (let chunk of chunks) {
        concatenated.set(chunk, position);
        position += chunk.length;
      }
  
      jsonString = new TextDecoder("utf-8").decode(concatenated);
      jsonObject = JSON.parse(jsonString);
    } else if (typeof data === 'string') {
      jsonString = data;
      jsonObject = JSON.parse(jsonString);
    } else {
      throw new Error(formatMessage(errorMessages.unsupportedDataType));
    }
  
    const encoder = new TextEncoder();
    const encodedJson = encoder.encode(JSON.stringify(jsonObject));
    const totalBytes = encodedJson.length;
  
    return {
      data: jsonObject,
      totalBytes: totalBytes
    };
}
