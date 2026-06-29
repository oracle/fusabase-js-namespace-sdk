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

import endpoints from './const.js';
import { checkOracledbApiVersion, OracledbVersion, Utils } from "./utils.js";
import { formatMessage, errorMessages } from "../errors.js";
import { attachAppTrustHeader } from '../../app/app-trust-header.js';
import { fusabaseFetch } from '../../app/fusabase-fetch.js';

/**
 * QueryHelper - Internal helper class for query operations.
 */
export class QueryHelper {
    /**
     * @property 
     * (Private) Application instance.
     */
    #app;

    /**
     * Creates a new `QueryHelper` instance.
     *
     * @param {App} app - Application instance.
     */
    constructor(app) { this.#app = app; }

    /**
     * @async
     * @property {Function} fetchDocuments
     * Helper function to fetch the documents.
     * @param {Query} query
     * @return {Promise}
     */
    async fetchDocuments(query, access_token, trans_obj) {
        let _db = query.oracledb;
        const memberExists = (obj, member) =>
            Object.prototype.hasOwnProperty.call(obj, member)

        let jCon = memberExists(query, '_joins') && query._joins.length>0;

        let body = {
            conditions: (memberExists(query, '_conditions') ?
                query._conditions : []),
            explicitOrder: (memberExists(query, '_explicitOrder') ?
                query._explicitOrder : []),
            aggregate: (memberExists(query, '_aggregate') ?
                query._aggregate : []),
            column: (memberExists(query, '_column') ?
                query._column : []),    
            joins: jCon ? query._joins[0] : [],
            limit: (memberExists(query, '_limit') ? query._limit : 0),
            col_group: (memberExists(query, '_col_group') ?
                query._col_group : ""),
            snapshot: (memberExists(query, '_rt') ?
                query._rt : 0),
            options: {}
        };
        if (checkOracledbApiVersion(query.oracledb.app.options, OracledbVersion.VER_2)
            && query._vectorSearch) {
            body.vectorSearch = query._vectorSearch;
        }
        let isAggregate = false;
        if (body.aggregate.length != 0) {
            isAggregate = true;
        }

        if (isDualityView(query)) {
            let tokens = query._path;
            body["dv_name"] = tokens[0];
            if (tokens.length > 1) {
                body["oid"] = tokens[1];
            }
        } else {
            body["path"] = query._path
        }
        
        if (jCon) {
            body["path"] = [];
        }
        let reqURL = _db.url + endpoints.GET_DOCS_V1 + 
        `?apiKey=${this.#app.options.appID}`;
        if (checkOracledbApiVersion(query.oracledb.app.options, OracledbVersion.VER_2)) {
            reqURL = _db.url + endpoints.GET_DOCS_V2 + 
                `?apiKey=${this.#app.options.appID}`;
        }

        const params = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "x-transaction": JSON.stringify({
                    begin_trans: trans_obj ? trans_obj.start : 0,
                    end_trans: trans_obj ? trans_obj.end : 0,
                    trans_name: trans_obj ? trans_obj.name : ""
                })
            },
            body: JSON.stringify(body)
        }
        if (access_token) {
            params.headers["Authorization"] = `Bearer ${access_token}`;
        }

        let response = null;
        let result = null;

        try {
            response = await fusabaseFetch(this.#app, reqURL, params);
            Utils.checkResponse(response);
            result = await response.json();
            // if (result && trans_obj && trans_obj.name && trans_obj.name!="") {
            //     let new_result = {"ret":[]};
            //     for (let i=0;i<result["ret"].length;i++) {
            //         new_result["ret"].push({
            //             "osons":result["ret"][i]["osons"]["data"]
            //         });
            //     }
            //     result = new_result;
            // }
            // if (isDualityView(query)) {
            //     let new_result = {"ret":[]};
            //     for (let i=0;i<result["ret"].length;i++) {
            //         new_result["ret"].push({
            //             "osons":result["ret"][i]["osons"]["DATA"]
            //         });
            //     }
            //     result = new_result;
            // }
        } catch (err) {
            Utils.baasTrace(this.#app.logLevel, params, reqURL,
                response, result);
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
                err.message = formatMessage(errorMessages.unknownError);
            }

            throw err;
        }

        if (jCon) {
            for (let i = 0;i<result["ret"].length;i++) {
                let relResult = {};
                for (const key in result["ret"][i]["data"]) {
                    if (Object.prototype.hasOwnProperty.call(result["ret"][i]["data"], key) && 
                        (key != "OID") ) {
                        relResult[key] = result["ret"][i]["data"][key];
                    }
                }
                result["ret"][i]["osons"] = {};
                result["ret"][i]["osons"]["DOCUMENT"] = relResult;
                result["ret"][i]["osons"]["CREATED"] = null;
                result["ret"][i]["osons"]["LAST_MODIFIED"] = null;
                result["ret"][i]["osons"]["VERSION"] = null;
                result["ret"][i]["osons"]["SUBCOLLECTION"] = null;
                result["ret"][i]["osons"]["PARENT_OID"] = null;
            }
        }
        else if (!isAggregate) {
            for (let i = 0;i<result["ret"].length;i++) {
                if (!("DOCUMENT" in result["ret"][i]["osons"])
                     && result["ret"][i]["osons"] != null) {
                    let relResult = {};
                    for (const key in result["ret"][i]["osons"]) {
                        if (Object.prototype.hasOwnProperty.call(result["ret"][i]["osons"], key) && 
                            (key != "OID" && key != "parent_oid"
                            && key != "_metadata") ) {
                            relResult[key] = result["ret"][i]["osons"][key];
                        }
                    }
                    result["ret"][i]["osons"]["DOCUMENT"] = relResult;
                    result["ret"][i]["osons"]["CREATED"] = null;
                    result["ret"][i]["osons"]["LAST_MODIFIED"] = null;
                    result["ret"][i]["osons"]["VERSION"] =
                      result["ret"][i]["osons"]["_metadata"]["etag"];
                    result["ret"][i]["osons"]["ASOF"] =
                      result["ret"][i]["osons"]["_metadata"]["asof"];
                    result["ret"][i]["osons"]["SUBCOLLECTION"] =
                      result["ret"][i]["osons"]["subcollection"];
                    result["ret"][i]["osons"]["PARENT_OID"] =
                      result["ret"][i]["osons"]["parent_oid"];
                }
            }
        }

        if (body["snapshot"] == 1) {
            for (let i=0;i<result["ret"].length;i++) {
                if (result["ret"][i]["rid"]) {
                    result["ret"][i]["osons"]["ROWID"] = result["ret"][i]["rid"];
                }
               
            }
        }

        return result;
    }

    /**
     * @async
     * @property {Function} createDocument
     * Helper function to create the document.
     * @param {CollectionReference} colRef
     * @param {T} document
     * @return {Promise}
     */
    async createDocument(colRef, document, access_token) {
        let _db = colRef.oracledb;

        let reqURL = colRef.oracledb.url;
        if (checkOracledbApiVersion(colRef.oracledb.app.options, OracledbVersion.VER_2)) {
            reqURL += "v2/";
        } else {
            reqURL += "v1/";
        }

        reqURL += endpoints.ADD_DOC +
            `?apiKey=${this.#app.options.appID}`;

        let body = {
            data: document,
            servertimestamp:colRef._serverTimestamp,
        };

        if (isDualityView(colRef)) {
            let tokens = colRef._path;
            body["dv_name"] = tokens[0];
            if (tokens.length > 1) {
                body["oid"] = tokens[1];
            }
        } else {
            body["path"] = colRef._path;
        }

        const params = {
            method: 'POST',
            headers: {
                "x-transaction": JSON.stringify({
                    begin_trans: 0,
                    end_trans: 0,
                    trans_name: ""
                })
            },
            body: JSON.stringify(body)
        };
        if (access_token) {
            params.headers["Authorization"] = `Bearer ${access_token}`;
        }

        let response = null;
        let result = null;
        try {
            response = await fusabaseFetch(this.#app, reqURL, params);
            Utils.checkResponse(response);
            result = await response.json();
        } catch (err) {
            Utils.baasTrace(this.#app.logLevel, params, reqURL,
                response, result);
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
                err.message = formatMessage(errorMessages.unknownError);
            }

            throw err;
        }

        return result;
    }

    /**
     * @async
     * @property {Function} updateDocument
     * Helper function to update the document
     * @param {DocumentReference} docRef
     * @param {T} document
     * @return {Promise}
     */
    async updateDocument(docRef, document, access_token, trans_obj) {
        let url = docRef.oracledb.url;
        if (checkOracledbApiVersion(docRef.oracledb.app.options, OracledbVersion.VER_2)) {
            url += "v2/";
        } else {
            url += "v1/";
        }

        url += endpoints.UPDATE_DOC +
            `?apiKey=${this.#app.options.appID}`;
        const memberExists = (obj, member) =>
            Object.prototype.hasOwnProperty.call(obj, member)

        let body = {
            data: document,
            conditions: (memberExists(docRef, '_conditions') ?
                docRef._conditions : []),
        };

        if (isDualityView(docRef)) {
            let tokens = docRef._path;
            body["dv_name"] = tokens[0];
            if (tokens.length > 1) {
                body["oid"] = tokens[1];
            }
        } else {
            body["path"] = docRef._path;
        }
        if (!isDualityView(docRef) && body["path"].length%2==1) {
            body["path"].push("*")
        }
        
        if (trans_obj != null && trans_obj.version != null) {
            body["version"] = trans_obj.version;
        }

        const req_par = {
            method: 'PUT',
            headers: {
                "x-transaction": JSON.stringify({
                    begin_trans: trans_obj ? trans_obj.start : 0,
                    end_trans: trans_obj ? trans_obj.end : 0,
                    trans_name: trans_obj ? trans_obj.name : "",
                })
            },
            body: JSON.stringify(body)
        };
        if (access_token) {
            req_par.headers["Authorization"] = `Bearer ${access_token}`;
        }

        let response = null;
        let result = null;

        try {
            response = await fusabaseFetch(this.#app, url, req_par);
            Utils.checkResponse(response);
            result = await response.json();
            if (result["OID"] == null && result["count"] == null) {
                throw new Error(formatMessage(errorMessages.unknownError));
            }
        } catch (err) {
            Utils.baasTrace(this.#app.logLevel, req_par, url,
                response, result);
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
                err.message = formatMessage(errorMessages.unknownError);
            }

            throw err;
        }
        if (trans_obj != null && trans_obj.version != null) {
            trans_obj.version = result["VERSION"];
        }

        return result;
    }

    /**
     * @async
     * @property {Function} deleteDocument
     * Helper function to delete the document.
     * @param {DocumentReference} docRef
     * @return {Promise}
     */
    async deleteDocument(docRef, access_token, trans_obj) {

        let url = docRef.oracledb.url;
        // if (checkOracledbApiVersion(docRef.oracledb.app.options, OracledbVersion.VER_2)) {
        //     url += "v2/";
        // } else {
        //     url += "v1/";
        // }
        
        url += endpoints.DELETE_DOC +
            `?apiKey=${this.#app.options.appID}`;

        let body = {};

        if (isDualityView(docRef)) {
            let tokens = docRef._path;
            body["dv_name"] = tokens[0];
            if (tokens.length > 1) {
                body["oid"] = tokens[1];
            }
        } else {
            body["path"] = docRef._path;
        }
        if (trans_obj != null && trans_obj.version != null) {
            body["version"] = trans_obj.version;
        }

        const req_par = {
            method: 'PUT',
            headers: {
                "x-transaction": JSON.stringify({
                    begin_trans: trans_obj ? trans_obj.start : 0,
                    end_trans: trans_obj ? trans_obj.end : 0,
                    trans_name: trans_obj ? trans_obj.name : "",
                })
            },
            body: JSON.stringify(body)
        };
        if (access_token) {
            req_par.headers["Authorization"] = `Bearer ${access_token}`;
        }
        let response = null;
        try {
            response = await fusabaseFetch(this.#app, url, req_par);
            Utils.checkResponse(response);
        } catch (err) {
            Utils.baasTrace(this.#app.logLevel, req_par, url,
                response);
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
                err.message = formatMessage(errorMessages.unknownError);
            }

            throw err;
        }
    }

    /**
     * @async
     * @property {Function} setDocument
     * Helper function to set the document.
     * @param {DocumentReference} docRef
     * @param {T} data
     * @param {Object} options
     * @return {Promise}
     */
    async setDocument(docRef, data, options, access_token, trans_obj) {
        var new_data = {}
        if (options.mergeFields.length > 0) {
            options.merge = true;
        }

        const path_arr = docRef._path;
        const _oid = path_arr.pop();
        if (_oid !== '$_random_$') { path_arr.push(_oid); }

        let url = docRef.oracledb.url;
        if (checkOracledbApiVersion(docRef.oracledb.app.options, OracledbVersion.VER_2)) {
            url += "v2/";
        } else {
            url += "v1/";
        }

        url += endpoints.SET_DOC +
            `?apiKey=${this.#app.options.appID}`;

        let body = {
            options: { merge: options.merge },
            data: data,
            servertimestamp:docRef._serverTimestamp
        }

        if (isDualityView(docRef)) {
            let tokens = path_arr;
            body["dv_name"] = tokens[0];
            if (tokens.length > 1) {
                body["oid"] = tokens[1];
            }
        } else {
            body["path"] = path_arr;
        }
        if (trans_obj != null && trans_obj.version != null) {
            body["version"] = trans_obj.version;
        }

        let apiVersion = 1;
        if (checkOracledbApiVersion(docRef.oracledb.app.options, OracledbVersion.VER_2)) {
            apiVersion = 2;
            body["apiversion"] = 2;
        }

        const req_par = {
            method: 'POST',
            headers: {
                "x-transaction": JSON.stringify({
                    begin_trans: trans_obj ? trans_obj.start : 0,
                    end_trans: trans_obj ? trans_obj.end : 0,
                    trans_name: trans_obj ? trans_obj.name : "",
                })
            },
            body: JSON.stringify(body)
        };
        if (access_token) {
            req_par.headers["Authorization"] = `Bearer ${access_token}`;
        }

        let response = null;
        let result = null;

        try {
            response = await fusabaseFetch(this.#app, url, req_par);
            Utils.checkResponse(response);
            result = await response.json();
            if (!result || result["OID"] == null) {
                throw new Error(formatMessage(errorMessages.unknownError));
            }
        } catch (err) {
            Utils.baasTrace(this.#app.logLevel, req_par, url,
                response, result);
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
                err.message = formatMessage(errorMessages.unknownError);
            }

            throw err;
        }
        if (trans_obj != null && trans_obj.version != null) {
            trans_obj.version = result["VERSION"];
        }

        return result;
    }

}

/**
 * Checks if the query is for a duality view.
 *
 * @param {Query} query - The query to check.
 * @returns {boolean} True if it's a duality view, false otherwise.
 */
function isDualityView(query) {
    return query.type === "dualityviewdocument"
        || query.type === "dualityviewcollection";
}
