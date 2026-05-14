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

import { Utils } from "./utils.js";
import { attachAppCheckHeader } from '../../app/app-trust-header.js';
import { fusabaseFetch } from "../../app/fusabase-fetch.js";

export function createConnection(url) {
  //create socket connection
  let socket = new WebSocket(url);

  socket.onopen = function (e) {
    e.preventDefault();
  };

  socket.onmessage = function (event) {
    event.preventDefault();
  };

  socket.onclose = function (event) {
    event.preventDefault();
  };

  socket.onerror = function (error) {
  };

  return socket;
}

export async function getSnapshotToken(reqURL, token, app) {

    const params = {
        method: 'GET',
        headers: {"Authorization":`Bearer ${token}`}
    };

    let response = null;
    let result = null;
    try {
        response = await fusabaseFetch(app, reqURL, params);
        Utils.checkResponse(response);
        result = await response.json();
    } catch (err) {
        err.status = response ? response.status : 408;

        try {
            var newMessage = await response.json();
            if (Utils.memberExists(newMessage, "error")) {
                err.message = newMessage["error"];
            }
            else if (Utils.memberExists(newMessage, "message")) {
                err.message = newMessage["message"];
            }
        }
        catch (jsonErr) {
            /* response is not JSON text */
            err.message = 'Unknown';
        }

        throw err;
    }

    return result;
}

/**
 * Extract callbacks from arguments
 *
 * There are different function signatures to give callbacks in onSnapshot.
 * This function will extract the callbacks next, error and complete 
 * irrespective of the signature used.
 * @returns {Object} Object containing extracted callbacks.
 */
export function extractCallbacksForSnapshot() {
  let callback = {
    next: null,
    complete: null,
    error: null
  };
  if (typeof arguments[0] === 'function') {
    callback.next = arguments[0];
    callback.error = arguments.length >= 2 ? arguments[1] : null;
    callback.complete = arguments.length >= 3 ? arguments[2] : null;
  }
  else if (typeof arguments[0] === 'object') {
    if (arguments.length === 1) {
      if (Utils.memberExists(arguments[0], "next")) {
        callback.next = arguments[0].next;
      }
      if (Utils.memberExists(arguments[0], "error")) {
        callback.error = arguments[0].error;
      }
      if (Utils.memberExists(arguments[0], "complete")) {
        callback.complete = arguments[0].complete;
      }
    }
    else {
      if (typeof arguments[1] === 'function') {
        callback.next = arguments[1];
        callback.error = arguments.length >= 3 ? arguments[2] : null;
        callback.complete = arguments.length >= 4 ? arguments[3] : null;
      }
      else if (typeof arguments[1] === 'object') {
        if (Utils.memberExists(arguments[1], "next")) {
          callback.next = arguments[1].next;
        }
        if (Utils.memberExists(arguments[1], "error")) {
          callback.error = arguments[1].error;
        }
        if (Utils.memberExists(arguments[1], "complete")) {
          callback.complete = arguments[1].complete;
        }
      }
    }
  }

  return callback;
}