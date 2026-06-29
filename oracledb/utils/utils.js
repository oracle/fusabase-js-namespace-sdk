
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

import LogLevel from '../../logger.js';
import { redactLogData } from "../../app/log-redaction.js";


export const OracledbVersion = Object.freeze({
    VER_1: 1,
    VER_2: 2
  });

export function getHostString(ssl, host, token) {
    let socketHost = String(host).trim().replace(/[?#].*$/, "");
    socketHost = socketHost.endsWith("/")
      ? socketHost.slice(0, socketHost.length - 1)
      : socketHost;

    const url = new URL(`${ssl ? "wss" : "ws"}://${socketHost}`);
    if (token && token != "") {
        url.searchParams.set("authToken", token);
    }
    return url.toString();
}

export function getToken(app) {
    const auth = app?.auth?.();
    const user = auth?.currentUser;
    return user && user.__getToken ? user.__getToken() : null;
}



export async function getAccessToken(app) {
    const auth = app?.auth?.();
    const user = auth?.currentUser;
    if (!user) {
        return null;
    }

    if (user.getFUSABASEToken) {
        try {
            const token = await user.getFUSABASEToken();
            if (token) {
                return token;
            }
        } catch {
            // Fall back to the regular auth token below.
        }
    }

    return user.getIdToken ? await user.getIdToken() : null;
}

export function isInstanceOfAnyClass(variable) {
    return typeof variable === 'object' && variable !== null && Object.getPrototypeOf(variable) !== Object.prototype;
  }
  

export function createUniqueName() {
    var name = crypto.randomUUID();
    var trans_name = "";
    for (let i = 0; i < name.length; i++) {
        if (name[i] != "-") {
            trans_name += name[i];
        }
    }
    return trans_name;
}

export function escapeFieldName(field) {
  if (field.startsWith('"') && field.endsWith('"')) {
    return field; // already escaped
  }
  if (field.includes(".")) {
    return `"${field}"`; // wrap in quotes
  }
  return field;
}

export function updateFieldsWithQuotes(arr) {
  return arr.map(item => {
    if (item && typeof item === "object" && "field" in item) {
      return {
        ...item,
        field: escapeFieldName(item.field)
      };
    }
    return item;
  });
}

export function checkOracledbApiVersion (options, version) {
    return options["useOracledbVersion"] === version;
}

export function identifyValueType(value) {
    if (value === null) {
        return "nullValue";
    } else if (typeof value === "boolean") {
        return "booleanValue";
    } else if (typeof value === "number") {
        return Number.isInteger(value) ? "integerValue" : "doubleValue";
    } else if (typeof value === "string") {
        const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;
        return isoTimestampRegex.test(value) ? "timestampValue" : "stringValue";
    } else if (Array.isArray(value)) {
        return "arrayValue";
    } else if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
        return "bytesValue";
    } else if (typeof value === "object") {
        return "mapValue";
    } else {
        return "unknownValue";
    }
}

export function validateDenseVector(values, message = "Dense vector must be a numeric array.") {
    if (!Array.isArray(values) || values.some(v => typeof v !== "number" || Number.isNaN(v))) {
        const error = new Error(message);
        error.status = 400;
        throw error;
    }
}

export function validateSparseEmbedding(sparse) {
    if (!Number.isInteger(sparse.dimension) || sparse.dimension <= 0) {
        const error = new Error("Sparse embedding dimension must be an integer greater than 0.");
        error.status = 400;
        throw error;
    }
    validateDenseVector(sparse.indices, "Sparse embedding indices must be a numeric array.");
    validateDenseVector(sparse.values, "Sparse embedding values must be a numeric array.");
    if (sparse.indices.length !== sparse.values.length) {
        const error = new Error("Sparse embedding indices and values must have the same length.");
        error.status = 400;
        throw error;
    }
}

export function validateVectorSearchQuery(query) {
    const hasDense = Array.isArray(query && query.vector);
    const hasSparse = !!(query && query.sparse);
    if ((hasDense && hasSparse) || (!hasDense && !hasSparse)) {
        const error = new Error("Vector search query must contain exactly one of query.vector or query.sparse.");
        error.status = 400;
        throw error;
    }
    if (hasDense) {
        validateDenseVector(query.vector, "Vector search query.vector must be a numeric array.");
    }
    if (hasSparse) {
        validateSparseEmbedding(query.sparse);
    }
}

export function rearrangeBodyOfVersion2(body) {
    let res = [];
    for (let i = 0; i < body.length; i++) {
        if (body[i]['op'] == 'servertimestamp') {
            res.push(body[i]);
        }
    }

    for (let i = 0; i < body.length; i++) {
        if (body[i]['op'] != 'servertimestamp' && body[i]['op'] != 'arrayUnion' && body[i]['op'] != 'arrayRemove') {
            res.push(body[i]);
        }
    }

    for (let i = 0; i < body.length; i++) {
        if (body[i]['op'] == 'arrayUnion' || body[i]['op'] == 'arrayRemove') {
            res.push(body[i]);
        }
    }
    return res;
}

/**
* DBConn internal class to create the config and url required for functions.
*/
export class DBConn {
    constructor(app) {
        this._host = app.options.ordsHost
        this._schema = app.options.schema
        this._module = 'database'
        this._appID = app.options.appID
        this._projectID = app.options.projectID
    }
    get url() {
        return `${this._host}_/baas-services/${this._module}/${this._projectID}/`
    }
}

export const TaskState = Object.freeze({
    ERROR: "Error",
    RUNNING: "Running",
    SUCCESS: "Success"
});

/**
* Utils class for internal functions.
*/
export class Utils {

    /**
     * @static
     * @property {Function} checkResponse 
     * Checks if the returned response has status code >= 200 & <= 299.
     * Throws error if the status code isn't in the specified range.
     * @param {Object} response 
     */
    static checkResponse(response) {
        if (!response || !response.status) {
            response = {"status":408};
            const error = new Error("Request failed");
            error.status = 408;
            throw error;
        }
        if (!response.ok) {
            const error = new Error(response.statusText);
            error.status = response ? response.status : 408;
            throw error;
        }
    }

    /**
     * @static
     * @property {Function} baasTrace
     * Get the trace of the request and the funtion stack.
     * @param {Object} data
     */
    static baasTrace(logLevel, ...data) {
        if (logLevel === LogLevel.ERROR) {
          const safeData = redactLogData(data);
          for (let i =0;i<data.length;i++) {
            console.trace(safeData[i]);
          }
        }
      }

    /**
     * @static
     * @property {Function} baasLogger
     * Log the data to the console.
     * @param {T} data
     */
    static baasLogger(logLevel, ...data) {
        if (logLevel === LogLevel.ERROR) {
            const safeData = redactLogData(data);
            for (let i =0;i<data.length;i++) {
                console.log(safeData[i]);
            }
        }
    }

    static getObjectProperty(object, path) {
        if (object == null) {
            return object;
        }
        const parts = path.split('#FieldPath#');
        for (let i = 0; i < parts.length; ++i) {
            if (object == null) {
                return undefined;
            }
            let key = parts[i];
            if (key.length > 14 && key.startsWith("__fusabaseindex__")) {
                key = key.substring(14);
                key = parseInt(key);
            }
            object = object[key];
        }
        return object;
    }


    static memberExists(obj, member) {
        return Object.prototype.hasOwnProperty.call(obj, member)
    }

    static isTypeOf(obj, classname) {
        return obj instanceof classname;
    }

    static isNumber(value) {
        if (typeof value === "string") {
            return !isNaN(value);
        }
    }

}
