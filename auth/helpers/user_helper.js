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

import LogLevel from "../../logger.js";
import { IDCSConfig, ONPREMConfig } from "./config.js";
import { ErrorCode, authErrorHandler } from "../errors.js";
import { attachAppCheckHeader } from "../../app/app-trust-header.js";
import { IdTokenResult } from "../types/idtoken.js"
import { Utils } from "../utils/utils.js";
// import { ModUtils } from "../utils/srp.js";
import { EmailAuthCredential } from "../types/credential.js";
import { EmailAuthProvider } from "../providers/email.js";
import { fusabaseFetch } from '../../app/fusabase-fetch.js';

/**
 * Internal helper class for managing IDCS user operations.
 */
export class IDCSUserHelper {
  config = null;
  authnToken = null;
  access_token = null;
  fusabase_token = null;
  encodedSecret = null;
  _app = null;
  user = null;
  #logLevel = LogLevel.SILENT;

  /**
   * Constructs an instance of IDCSUserHelper.
   * @param {Object} config - The configuration object.
   * @param {String} [authnToken=null] - The authentication token.
   * @param {String} access_token - The access token.
   * @param {LogLevel} logLevel - The logging level.
   */
  constructor(config, authnToken = null, access_token, logLevel) {
    this.config = config;
    this.authnToken = authnToken;
    this.access_token = access_token;
    this.encodedSecret = btoa(
      `${this.config.clientId}:${this.config.clientSecret}`
    );
    this.#logLevel = logLevel;
  }

  _setApp(app) {
    this._app = app;
  }

  /**
   * Refreshes the access token using the refresh token.
   * @param {String} refresh_token - The refresh token.
   * @returns {Promise<String>} The new refresh token.
   */
  async refreshAccessToken(refresh_token) {
    let result = null;
    let response = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.OAUTH_TOKEN_REST_EP}`;
    const params = {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.encodedSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=refresh_token&refresh_token=${refresh_token}&scope=offline_access`,
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: {
          ...params.headers,
          Authorization: "***REDACTED***",
        },
        body: "<OAUTH REFRESH TOKEN PAYLOAD REDACTED>",
      };
      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }

    this.access_token = new IdTokenResult(result.access_token);
    this.refresh_token = result.refresh_token;
    return this.refresh_token;
  }

  /**
   * Validates the access token by checking if the time left for expiration is greater than 5 minutes.
   * @returns {boolean} True if the token is valid, false otherwise.
   */
  validateAccessToken() {
    let exp = 0;
    if (this.access_token.expirationTime) {
      exp = this.access_token.expirationTime;
    }
    if (
      exp <
      Math.round(new Date().getTime() / 1000)
    ) {
      return false;
    }
    return true;
  }

  validateFUSABASEAccessToken() {
    if (!this.fusabase_token) {
      return false;
    }
    let exp = 0;
    if (this.fusabase_token.expirationTime) {
      exp = this.fusabase_token.expirationTime;
    }
    if (
      exp <
      Math.round(new Date().getTime() / 1000)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Creates operations for updating the user profile.
   * @param {Object} userProfile - The user profile data to update.
   * @returns {Array} Array of operations for the patch request.
   */
  makeOperations(userProfile) {
    let operations = [];
    if (
      Object.hasOwn(userProfile, "displayName") &&
      userProfile.displayName !== this.user.displayName
    ) {
      operations.push({
        op: this.user.displayName
          ? userProfile.displayName
            ? "replace"
            : "remove"
          : "add",
        path: "displayName",
        value: userProfile.displayName,
      });
    }

    if (
      Object.hasOwn(userProfile, "phoneNumber") &&
      userProfile.phoneNumber !== this.user.phoneNumber
    ) {
      operations.push({
        op: this.user.phoneNumber
          ? userProfile.phoneNumber
            ? "replace"
            : "remove"
          : "add",
        path: "phoneNumbers",
        value: [{
          "value": userProfile.phoneNumber,
          "type": "home"
        }],
      });
    }

    if (
      Object.hasOwn(userProfile, "photoURL") &&
      userProfile.photoURL !== this.user.photoURL
    ) {
      operations.push({
        op: this.user.photoURL
          ? userProfile.photoURL
            ? "replace"
            : "remove"
          : "add",
        path: "photos",
        value: [{
          "value": userProfile.photoURL,
          "type": "photo"
        }],
      });
    }
    return operations;
  }

  /**
   * Updates the user's profile.
   * @param {Object} userProfile - The profile data to update. 
   * Can include displayName, phoneNumber, photoURL.
   * @returns {Promise<Object>} The updated profile data.
   */
  async updateProfile(userProfile) {
    let result = null;
    let response = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.SELF_ME_REST_EP}`;
    let body = {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: this.makeOperations(userProfile),
    };
    const params = {
      method: "PATCH",
      headers: {
        "Content-Type": "application/scim+json",
        Authorization: `Bearer ${await this.user.getIdToken()}`,
      },
      body: JSON.stringify(body),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }

    return result;
  }

  /**
   * Updates the user's password.
   * @param {String} email - The user's email.
   * @param {String} newPassword - The new password.
   * @param {String} oldPassword - The old password.
   * @returns {Promise<Object>} The result of the password update.
   */
  async updatePasswordHelper(email, newPass, oldPassword) {
    let response = null
    let result = null
    const reqURL = `${this.config.domainURL}${IDCSConfig.UPDATE_PASSWORD_HELPER}`;
    const data = {
      password: newPass,
      oldPassword: oldPassword,
      schemas: [
        "urn:ietf:params:scim:schemas:oracle:idcs:MePasswordChanger"
      ]
    }
    const params = {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.access_token.token}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result;
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: {
          ...params.headers,
          Authorization: "***REDACTED***",
        },
        body: "<SENSITIVE PAYLOAD REDACTED>",
      };
      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  /**
   * Sends email verification.
   * @param {String} email - The email to verify.
   * @param {String} id - The user ID.
   * @returns {Promise<void>}
   */
  async sendEmailVerificationHelper(email, id) {
    let response = null
    // let result = null
    const reqURL =
      `${this.config.domainURL}${IDCSConfig.SEND_EMAIL_VERIFICATION}`;
    const data = {
      id: id,
      email: email,
      schemas: ["urn:ietf:params:scim:schemas:oracle:idcs:MeEmailVerifier"],
      meta: {
        "resourceType": "MeEmailVerifier"
      }
    }
    const params = {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.access_token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  async fetchFusabaseToken(url) {
    let response = null
    let result = null
    const reqURL =
      url;
    const data = {
      token: this.access_token.token
    }
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result.access_token;
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  async linkWithCredentialHelper (credential) {
    let err = new Error(
      "Method is not supported in IDCS authentication");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = "IDCS";
    throw authErrorHandler(err);
  }

  async socialLink(url) {
    let err = new Error(
      "Method is not supported in IDCS authentication");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = "IDCS";
    throw authErrorHandler(err);
    let popup = window.open("", "name", "width=800,height=600");
    popup.location.href = url;

    const data = await this.listenForSuccess(popup);

    popup.close();

    const result = {
      success: data.success
    }

    return result;
  }

  async listenForSuccess(popupWindow) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      let providerAuthToken = (event) => {
        const data = JSON.parse(event.data);
        if (event.source != popupWindow)
          return;
        Utils.baasLogger(this.#logLevel, "Received auth popup message");
        controller.abort(); //remove listener after getting response from Popup
        resolve(data);
      }
      window.addEventListener("message",
        providerAuthToken,
        { signal: controller.signal })
    });
  }

  async unlinkHelper (providerId) {
    let err = new Error(
      "Method is not supported in IDCS authentication");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = "IDCS";
    throw authErrorHandler(err);
  }

}

/**
 * Internal helper class for managing on-premises user operations.
 */
export class ONPREMUserHelper {
  config = null;
  authnToken = null;
  fusabase_token = null;
  access_token = null;
  user = null;
  _app = null;
  #logLevel = LogLevel.SILENT;

  /**
   * Constructs an instance of ONPREMUserHelper.
   * @param {Object} config - The configuration object.
   * @param {String} [authnToken=null] - The authentication token.
   * @param {String} access_token - The access token.
   * @param {LogLevel} logLevel - The logging level.
   */
  constructor(config, authnToken = null, access_token, logLevel) {
    this.config = config;
    this.authnToken = authnToken;
    this.access_token = access_token;
    this.#logLevel = logLevel;
  }

  _setApp(app) {
    this._app = app;
  }

  /**
   * Refreshes the access token using the refresh token.
   * @param {String} refresh_token - The refresh token.
   * @returns {Promise<String>} The new refresh token.
   */
  async refreshAccessToken(refresh_token) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.AUTHENTICATE_REST_EP}` +
      `?apiKey=${this.config.appID}`;
    const params = {
      method: "POST",
      headers: {
      },
      body: JSON.stringify({
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      const tok_res = {
        access_token: new IdTokenResult(result.access_token),
        refresh_token: result.refresh_token
      }

      this.access_token = tok_res.access_token;
      return tok_res.refresh_token;
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: params.headers,
        body: "<REFRESH TOKEN PAYLOAD REDACTED>",
      };
      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  /**
   * Validates the access token by checking if the time left for expiration is greater than 5 minutes.
   * @returns {boolean} True if the token is valid, false otherwise.
   */
  validateAccessToken() {
    let exp = 0;
    if (this.access_token.expirationTime) {
      exp = this.access_token.expirationTime;
    }
    if (
      exp <
      Math.round(new Date().getTime() / 1000)
    ) {
      return false;
    }
    return true;
  }

  validateFUSABASEAccessToken() {
    if (!this.fusabase_token) {
      return false;
    }
    let exp = 0;
    if (this.fusabase_token.expirationTime) {
      exp = this.fusabase_token.expirationTime;
    }
    if (
      exp <
      Math.round(new Date().getTime() / 1000)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Creates operations for updating the user profile.
   * @param {Object} userProfile - The user profile data to update.
   * @returns {Array} Array of operations for the update request.
   */
  makeOperations(userProfile) {
    let operations = [];
    if (
      Object.hasOwn(userProfile, "displayName") &&
      userProfile.displayName !== this.user.displayName
    ) {
      operations.push({
        op: this.user.displayName
          ? userProfile.displayName
            ? "replace"
            : "replace"
          : "add",
        path: "displayName",
        value: userProfile.displayName,
      });
    }
    if (
      Object.hasOwn(userProfile, "phoneNumber") &&
      userProfile.phoneNumber !== this.user.phoneNumber
    ) {
      operations.push({
        op: this.user.phoneNumber
          ? userProfile.phoneNumber
            ? "replace"
            : "replace"
          : "add",
        path: "phoneNumber",
        value: userProfile.phoneNumber,
      });
    }
    return operations;
  }

  /**
   * Updates the user's profile for on-premises.
   * @param {Object} userProfile - The profile data to update. Can include displayName, phoneNumber.
   * @returns {Promise<Object>} The updated profile data.
   */
  async updateProfile(userProfile) {
    let response = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.UPDATE_PROFILE_HELPER}` +
      `?apiKey=${this.config.appID}`;
    let body = {
      Operations: this.makeOperations(userProfile),
    };
    if (body.Operations.length === 0) {
      let err = new Error("No operation to perform");
      err.status = 400;
      throw authErrorHandler(err);
    }
    const params = {
      method: "PUT",
      headers: {
        "X-AUTHZ": this.access_token.token,
      },
      body: JSON.stringify(body),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }

    return { displayName: userProfile.displayName, phoneNumber: userProfile.phoneNumber };
  }

  /**
   * Updates the user's password.
   * @param {String} email - The user's email.
   * @param {String} newPass - The new pass.
   * @param {String} oldPass - The old pass.
   * @returns {Promise<void>}
   */
  async updatePasswordHelper(email, newPass, oldPass) {
    let response = null
    const reqURL = `${this.config.domainURL}${ONPREMConfig.UPDATE_PASSWORD_HELPER}`
      + `?apiKey=${this.config.appID}`;
    const data = {
      "oldPassword": oldPass,
      "password": newPass
    }

    const params = {
      method: "PUT",
      headers: {
        "X-AUTHZ": this.access_token.token,
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: {
          ...params.headers,
          "X-AUTHZ": "***REDACTED***",
        },
        body: "<PASSWORD CHANGE PAYLOAD REDACTED>",
      };

      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  /**
   * Sends email verification.
   * @param {String} email - The email to verify.
   * @param {String} id - The user ID.
   * @returns {Promise<void>}
   */
  async sendEmailVerificationHelper(email, id) {
    let response = null
    // let result = null
    const reqURL =
      `${this.config.domainURL}${ONPREMConfig.SEND_EMAIL_VERIFICATION}` +
      `?apiKey=${this.config.appID}&email=${email}&requesttype=verifyemail`;

    const params = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.access_token.token}`,
        "Content-Type": "application/json",
      }
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  async fetchFusabaseToken(url) {
    return this.access_token.token;
  }

  async linkWithCredentialHelper (credential) {
    let response = null;
    let result = null;
    let body = {
      "token":"",
      "password":"",
    };
    let linkProvider = credential.providerId;
    if (credential instanceof EmailAuthCredential) {
      body["password"] = credential.password;
      linkProvider = "epw";
    } else {
      body["token"] = credential.idToken;
    }
    const reqURL = `${this.config.domainURL}${ONPREMConfig.SIGN_IN_WITH_CREDENTIAL}` +
      `?apiKey=${this.config.appID}&method=${linkProvider}&link=1`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await this.user.getIdToken()}`,
      },
      body: JSON.stringify(body),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result;
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  /**
   * Performs social login using the provided URL.
   * @param {string} url - The social login URL.
   * @returns {Promise<object>} Authentication tokens.
   */
  async socialLink(url) {
    let popup = window.open("", "name", "width=800,height=600");
    popup.location.href = url;

    const data = await this.listenForAuthToken(popup);

    popup.close();

    const result = {
      idToken:data.id_token
    }

    return result;
  }

  /**
   * Listens for authentication token from popup window.
   * @param {Window} popupWindow - The popup window.
   * @returns {Promise<object>} The authentication data.
   */
  async listenForAuthToken(popupWindow) {
    const expectedOrigin = new URL(this.config.domainURL).origin;
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      let providerAuthToken = (event) => {
        const data = JSON.parse(event.data);
        if (event.source != popupWindow)
          return;
        if (event.origin !== expectedOrigin) return;
        Utils.baasLogger(this.#logLevel, "Received auth popup message");
        controller.abort(); //remove listener after getting response from Popup
        resolve(data);
      }
      window.addEventListener("message",
        providerAuthToken,
        { signal: controller.signal })
    });
  }

  async unlinkHelper (providerId) {
    let response = null;
    let result = null;
    let linkProvider = providerId;
    if (providerId === EmailAuthProvider.PROVIDER_ID) {
      linkProvider = "epw";
    } else {
      linkProvider = providerId;
    }
    const reqURL = `${this.config.domainURL}${ONPREMConfig.SIGN_IN_WITH_CREDENTIAL}` +
      `?apiKey=${this.config.appID}&method=${linkProvider}`;
    const params = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await this.user.getIdToken()}`,
      }
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result;
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, response, result);
      err.status = response ? response.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await response.json();
        err.message = newMessage["error"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }
  }

  /**
   * Encodes array buffer to base64 URL string.
   * @param {ArrayBuffer} arrayBuffer - The array buffer.
   * @returns {string} Base64 URL encoded string.
   */
  base64UrlEncode(arrayBuffer) {
    return btoa(String.fromCharCode.apply(null, arrayBuffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generates code verifier.
   * @param {number} [length=64] - Length in bits.
   * @returns {string} Code verifier.
   */
  generateCodeVerifier(length = 96) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Generates code challenge from verifier.
   * @param {string} codeVerifier - The code verifier.
   * @returns {Promise<string>} Code challenge.
   */
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }
}

/**
 * Internal helper class for managing on-premises SRP user operations, extending ONPREMUserHelper.
 */
// export class ONPREMSRPUserHelper extends ONPREMUserHelper {

//   #logLevel;

//   /**
//    * Constructs an instance of ONPREMSRPUserHelper.
//    * @param {Object} config - The configuration object.
//    * @param {String} [authnToken=null] - The authentication token.
//    * @param {String} access_token - The access token.
//    * @param {LogLevel} logLevel - The logging level.
//    */
//   constructor(config, authnToken = null, access_token, logLevel) {
//     super(config, authnToken, access_token, logLevel)
//     this.#logLevel = logLevel;
//   }

//   /**
//    * Sends a request to update the password using SRP.
//    * @param {Object} body - The body for the password update request.
//    * @returns {Promise<Object>} The result of the update request.
//    */
//   async updatePasswordRequest(body) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.SRP_UPDATE_PASSWORD}`
//       + `?apiKey=${this.config.appID}&reqtype=session_match`;
//     const params = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-AUTHZ": this.access_token.token,
//       },
//       body: JSON.stringify(body),
//     };

//     try {
//       response = await fetch(reqURL, params);
//       Utils.checkResponse(response);
//       result = await response.json();
//       return result;
//     } catch (err) {
//       Utils.baasTrace(this.#logLevel, params, reqURL, response, result);
//       err.status = response ? response.status : 408;
//       err.authType = this.config.authType.toUpperCase();
//       try {
//         var newMessage = await response.json();
//         err.message = newMessage["error"];
//       }
//       catch (jsonErr) {
//         /* response is not JSON text */
//         err.message = 'Unknown';
//       }
//       throw authErrorHandler(err);
//     }
//   }

//   /**
//    * Updates the user's password using SRP protocol.
//    * @param {String} email - The user's email.
//    * @param {String} newPassword - The new password.
//    * @param {String} oldPassword - The old password.
//    * @returns {Promise<void>}
//    * @throws {Error} If password update fails.
//    */
//   async updatePasswordHelper(email, newPassword, oldPassword) {
//     const a = this.generateRandomBigInteger(256);
//     const res = await this.getSharedKey(email);
//     const G = BigInt(res["G"]);
//     const N = BigInt(res["N"]);
//     const K = BigInt(res["K"]);
//     const A = ModUtils.modPow(G, a, N);
//     const key_res = await this.keyExchangeSRP(A, email);
//     const U = await this.encodeToBigInt(`${A}${BigInt(key_res["B"])}`);
//     const B = BigInt(key_res["B"]);
//     const salt = BigInt('0x' + key_res["salt"]);
//     const credHash = await this.generateHash(`${email}${newPassword}`)
//     const X = await this.encodeToBigInt(`${salt}${credHash}`);
//     const gPowXmodN = ModUtils.modPow(G, X, N);          
//     const kTimesgPowXmodN = K * gPowXmodN;      
//     const subB = BigInt(B - kTimesgPowXmodN);
//     const subtractedValue = ModUtils.customMod(subB,N); 
//     const exponent = a + (U * X);                  
//     const S = ModUtils.modPow(subtractedValue, exponent, N);  
//     const f_K = await this.encodeToBigInt(S);
//     const result = await this.updatePasswordRequest({
//       "v": gPowXmodN,
//       "salt": salt,
//       "email": email,
//       "shared_key":f_K
//     });
//     if (!(result["success"] && result["success"][0]==1)) {
//       let error = new Error("Password update failed");
//       error.status = ErrorCode.UNKNOWN;
//       throw authErrorHandler(error);
//     }
//   }
// }
