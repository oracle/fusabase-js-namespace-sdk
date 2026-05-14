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

import LogLevel from "../../logger.js";
import { IDCSConfig, ONPREMConfig } from "./config.js";
import { ErrorCode, authErrorHandler } from "../errors.js";
import { Utils } from "../utils/utils.js";
import { TimestampUtils } from "../utils/timestamp.js";
// import { ModUtils } from "../utils/srp.js";
import { IdTokenResult } from "../types/idtoken.js"
import { fusabaseFetch } from '../../app/fusabase-fetch.js';
import { attachAppCheckHeader } from "../../app/app-trust-header.js";

/**
 * Internal helper class for authentication with IDCS.
 */
export class IDCSAuthHelper {

  config = null;
  encodedSecret = null;
  bearerToken = null;
  ordsHostOrigin = "";
  #logLevel = LogLevel.SILENT;
  _app = null;

  /**
   * Constructs an instance of IDCSAuthHelper.
   * @param {object} config - Configuration data for IDCS.
   * @param {LogLevel} logLevel - The logging level.
   */
  constructor(config, logLevel, ordsHostOrigin = "") {
    this.config = config;
    this.encodedSecret = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    this.#logLevel = logLevel;
    this.ordsHostOrigin = ordsHostOrigin;
  }

  _setApp (app) {
    this._app = app;
  }

  /**
   * Fetches the bearer token from IDCS.
   * @returns {Promise<IdTokenResult>} The bearer token.
   */
  async getBearerToken() {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.OAUTH_TOKEN_REST_EP}`;
    const params = {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.encodedSecret}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: "grant_type=client_credentials&scope=urn:opc:idm:__myscopes__",
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
        body: params.body,
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

    this.bearerToken = new IdTokenResult(result.access_token);
    return this.bearerToken;
  }

  /**
   * Fetches the authentication form for credential submission.
   * @param {IdTokenResult} bearerToken - The bearer token.
   * @returns {Promise<object>} The authentication form.
   */
  async getAuthForm(bearerToken) {
    let form = null;
    let formResult = null;
    let reqURL = `${this.config.domainURL}${IDCSConfig.AUTHENTICATE_REST_EP}`;
    let params = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken.token}`,
      },
    };

    try {
      form = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(form);
      formResult = await form.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, params, reqURL, form, formResult);
      err.status = form ? form.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await form.json();
        err.message = newMessage["detail"];
      }
      catch (jsonErr) {
        /* response is not JSON text */
        err.message = 'Unknown';
      }
      throw authErrorHandler(err);
    }

    return formResult;
  }

  /**
   * Authenticates a user and retrieves details.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} User details and tokens.
   */
  async authenticateAndGetDetails(email, password) {
    const authnToken = await this.authenticateUser(email, password);
    const tokens = await this.getAccessToken(authnToken);
    Utils.baasLogger(this.#logLevel, "Fetched IDCS auth tokens");
    const userDetails = await this.getUserDetails(
      tokens.access_token
    );
    return {
      userDetails: userDetails,
      authnToken: authnToken,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    }
  }

  /**
   * Authenticates a user with email and password.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<IdTokenResult>} Authentication token.
   */
  async authenticateUser(email, password) {
    let formResult = null;
    let response = null;
    let result = null;
    const bearerToken = (this.bearerToken && this.bearerToken.token)
      ? this.bearerToken
      : await this.getBearerToken();
    formResult = await this.getAuthForm(bearerToken);
    // Check for nextop
    const reqURL = `${this.config.domainURL}${IDCSConfig.AUTHENTICATE_REST_EP}`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken.token}`,
      },
      body: JSON.stringify({
        op: "credSubmit",
        credentials: {
          username: `${email}`,
          password: `${password}`,
        },
        requestState: `${formResult.requestState}`,
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, {}, reqURL, response, result);
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

    return new IdTokenResult(result.authnToken);
  }

  /**
   * Fetches access and refresh tokens for the authenticated user.
   * @param {IdTokenResult} authnToken - Authentication token.
   * @returns {Promise<object>} Access and refresh tokens.
   */
  async getAccessToken(authnToken) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.OAUTH_TOKEN_REST_EP}`;
    const params = {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.encodedSecret}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&scope=urn:opc:idm:__myscopes__+offline_access&assertion=${authnToken.token}`,
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
    } catch (err) {
      Utils.baasTrace(this.#logLevel, {}, reqURL, response, result);
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

    return {
      access_token: new IdTokenResult(result.access_token),
      refresh_token: result.refresh_token,
    };
  }

  /**
   * Reloads user details.
   * @param {object} user - The user object.
   * @returns {Promise<object>} Updated user details.
   */
  async reloadUser(user) {
    const access_token = await user.getIdTokenResult(true);
    return this.getUserDetails(access_token);
  }

  /**
   * Fetches details of the authenticated user.
   * @param {IdTokenResult} access_token - Access token.
   * @returns {Promise<object>} User details.
   */
  async getUserDetails(access_token) {
    const token_data = Utils.parseJWT(access_token.token);
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.SELF_ME_REST_EP}`;
    const params = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token.token}`,
        "Content-Type": "application/scim+json",
      },
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
    result["emailVerified"] = token_data["email_verified"];
    result["meta"]["lastSignIn"] = TimestampUtils.convertIatToTimestamp(token_data["iat"]);
    result["meta"]["created"] =
      TimestampUtils.convertOCITimeToTimestampString(result["meta"]["created"]);
    result["idp_name"] = token_data["idp_name"];
    result["idp_type"] = token_data["idp_type"];
    return result;
  }

  /**
   * Registers a new user in IDCS.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} Registered user data.
   */
  async registerUser(email, password, url) {
    const bearerToken = (this.bearerToken && this.bearerToken.token)
      ? this.bearerToken
      : await this.getBearerToken();
    const data = {
      email: email,
      first_name: "-",
      last_name: "-",
      password: password
    };
    let userData = null;
    let dataJSON = null;
    let reqURL = url;
    let params = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken.token}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(data),
    };

    try {
      userData = await fusabaseFetch(this._app, reqURL, params);

      Utils.checkResponse(userData);
    } catch (err) {
      const safeData = {
        schemas: data.schemas,
        userName: "***REDACTED***",
        name: {
          givenName: data.name.givenName,
          familyName: data.name.familyName,
        },
        password: "***REDACTED***",
        emails: [
          {
            value: "***REDACTED***",
            type: "work",
            primary: true,
          },
        ],
        "urn:ietf:params:scim:schemas:oracle:idcs:extension:selfRegistration:User": {
          selfRegistrationProfile: "***REDACTED***",
          consentGranted: data[
            "urn:ietf:params:scim:schemas:oracle:idcs:extension:selfRegistration:User"
          ].consentGranted,
        },
      };

      const safeParams = {
        method: params.method,
        headers: {
          "Content-Type": params.headers["Content-Type"],
          Authorization: "***REDACTED***",
        },
        body: JSON.stringify(safeData),
      };

      Utils.baasTrace(this.#logLevel, safeParams, reqURL, userData, dataJSON);
      err.status = userData ? userData.status : 408;
      err.authType = this.config.authType.toUpperCase();
      try {
        var newMessage = await userData.json();
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
   * Performs social login using the provided URL.
   * @param {string} url - The social login URL.
   * @returns {Promise<object>} Authentication tokens.
   */
  async socialLogin(url) {
    let popup = window.open("", "name", "width=800,height=600");
    popup.location.href = url;

    //idcs social login
    //popup.location.href = "https://phoenix313956.dev3sub2phx.databasede3phx.oraclevcn.com:8443/ords/user1/_/baas-services/idm/idcs/social?method=google-idcs&appID=1A1FBBE7F753079EE0630C68466410A3&device=web"

    const data = await this.listenForAuthToken(popup);

    popup.close();

    const result = {
      authnToken: null,
      tokens: {
        access_token: new IdTokenResult(data.access_token),
        refresh_token: data.refresh_token
      }
    }

    return result;
  }

  /**
   * Listens for authentication token from popup window.
   * @param {Window} popupWindow - The popup window.
   * @returns {Promise<object>} The authentication data.
   */
  async listenForAuthToken(popupWindow) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      let providerAuthToken = (event) => {
        if (event.source != popupWindow)
          return;
        if (this.ordsHostOrigin && event.origin !== this.ordsHostOrigin)
          return;
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        Utils.baasLogger(this.#logLevel, "Received auth popup message");
        controller.abort(); //remove listener after getting response from Popup
        resolve(data);
      }
      window.addEventListener("message",
        providerAuthToken,
        { signal: controller.signal })
    });
  }

  /**
   * Performs sign out and revokes refresh token.
   * @param {string} refresh_token - The refresh token.
   * @returns {Promise<void>}
   */
  async performSignOut(refresh_token) {
    await this.signOutFromIDCS();
    await this.revokeRefreshToken(refresh_token);
  }

  /**
   * Signs out from IDCS.
   * @returns {Promise<void>}
   */
  async signOutFromIDCS() {
    let response = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.LOGOUT_REST_EP}`;
    const params = {
      method: "GET",
      headers: {
        "Content-Type": "application/scim+json",
      },
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

  /**
   * Revokes the refresh token.
   * @param {string} refresh_token - The refresh token.
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(refresh_token) {
    let response = null;
    const reqURL = `${this.config.domainURL}${IDCSConfig.REVOKE_REFRESH_TOKEN_REST_EP}`;
    const params = {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.encodedSecret}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Accept: "*/*",
      },
      body: `token=${refresh_token}`,
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: {
          ...params.headers,
          Authorization: "***REDACTED***",
        },
        body: "<OAUTH REFRESH TOKEN PAYLOAD REDACTED>",
      };
      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response);
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
   * Sends password reset email.
   * @param {string} email - User's email.
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmailHelper(email) {
    let response = null;
    // let result = null;
    const bearerToken = (this.bearerToken && this.bearerToken.token)
      ? this.bearerToken
      : await this.getBearerToken();
    const copy_email = email;
    const email_domain = copy_email.split('@')[1];

    const data = {
      userName: `${email}`,
      notificationType: "email",
      notificationEmailAddress: `****@${email_domain}`,
      schemas: [
        "urn:ietf:params:scim:schemas:oracle:idcs:MePasswordResetRequestor"
      ]
    }
    let reqURL = `${this.config.domainURL}${IDCSConfig.SEND_PASSWORD_RESET_EMAIL}`;
    let params = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken.token}`,
        "Content-Type": "application/scim+json",
        "Accept": "application/json"
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      // result = await response.json();
      // return result ? result.userName ? result.userName : null : null;
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: {
          ...params.headers,
          Authorization: "***REDACTED***",
        },
        body: "<PASSWORD RESET REQUEST PAYLOAD REDACTED>",
      };

      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response);
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
   * Verifies password reset code.
   * @param {string} token - The reset token.
   * @returns {Promise<object>} Verification result.
   */
  async verifyPasswordResetCodeHelper(token) {
    let response = null;
    let result = null;
    const bearerToken = (this.bearerToken && this.bearerToken.token)
      ? this.bearerToken
      : await this.getBearerToken();
    const data = {
      token: token,
      schemas: [
        "urn:ietf:params:scim:schemas:oracle:idcs:UserTokenValidator"
      ]
    }
    let reqURL = `${this.config.domainURL}${IDCSConfig.VERIFY_PASSWORD_RESET_CODE}`;
    let params = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken.token}`,
        "Content-Type": "application/scim+json",
      },
      body: JSON.stringify(data),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result.userName;
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
  }

  /**
   * Confirms password reset.
   * @param {string} code - The reset code.
   * @param {string} newPassword - New password.
   * @returns {Promise<void>}
   */
  async confirmPasswordResetHelper(code, newPassword) {
    let response = null;
    const bearerToken = (this.bearerToken && this.bearerToken.token)
      ? this.bearerToken
      : await this.getBearerToken();
    let reqURL = `${this.config.domainURL}${IDCSConfig.CONFIRM_PASSWORD_RESET}`;

    const data = {
      token: `${code}`,
      password: `${newPassword}`,
      schemas: [
        "urn:ietf:params:scim:schemas:oracle:idcs:MePasswordResetter"
      ]
    }
    let params = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken.token}`,
        "Content-Type": "application/scim+json",
        "Accept": "application/json"
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
          Authorization: "***REDACTED***",
        },
        body: "<PASSWORD RESET CONFIRMATION PAYLOAD REDACTED>",
      };

      Utils.baasTrace(this.#logLevel, safeParams, reqURL, response);
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
   * Signs in with credential (not supported in IDCS).
   * @param {object} credential - The credential.
   * @returns {Promise} Throws error as not implemented.
   */
  async signInWithCredentialHelper (credential) {
    let err = new Error(
      "Method is not supported in IDCS authentication");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = this.config.authType.toUpperCase();
    throw authErrorHandler(err);
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

  /**
   * Gets redirect credentials.
   * @param {string} code - The code.
   * @returns {Promise<object>} Credentials.
   */
  async getRedirectCredentials(code, url) {

    let response = null;
    let result = null;
    const codeVerifier = localStorage.getItem("codeVerifier");
    const reqURL = url;

    const params = {
      method: "POST",
      body: JSON.stringify({
        "code_verifier": codeVerifier,
        "code": code
      })
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = response.json();
      Utils.baasLogger(this.#logLevel, "Fetched redirect credential response");
      return result;
    } catch (err) {
      Utils.baasLogger(this.#logLevel, "Error occurred in getting redirect credentials");
    }
  }

}

/**
 * Internal helper class for authentication with On-Prem.
 */
export class ONPREMAuthHelper {

  config = null;
  ordsHostOrigin = "";
  #logLevel = LogLevel.SILENT;
  _app = null;

  /**
   * Constructs an instance of ONPREMAuthHelper.
   * @param {object} config - Configuration data.
   * @param {LogLevel} logLevel - The logging level.
   * @param {string} [ordsHostOrigin=""] - Allowed ORDS origin for popup messaging.
   */
  constructor(config, logLevel, ordsHostOrigin = "") {
    this.config = config;
    this.ordsHostOrigin = ordsHostOrigin;
    this.#logLevel = logLevel
  }

  _setApp (app) {
    this._app = app;
  }

  /**
   * Fetches authentication form (not supported in On-Prem).
   * @param {IdTokenResult} bearerToken - Bearer token.
   * @returns {Promise<object>} Throws error as not implemented.
   */
  async getAuthForm(bearerToken) {
    let err = new Error("This method is not supported in onprem");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = this.config.authType.toUpperCase();
    throw authErrorHandler(err);
  }

  /**
   * Authenticates user and gets details.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} User details and tokens.
   */
  async authenticateAndGetDetails(email, password) {
    const tok_res = await this.authenticateUser(email, password);
    const access_token = tok_res.access_token;
    const refresh_token = tok_res.refresh_token;
    const userDetails = await this.getUserDetails(
      access_token
    );
    return {
      userDetails: userDetails,
      authnToken: null,
      access_token: access_token,
      refresh_token: refresh_token,
    }
  }

  /**
   * Authenticates user with email and password.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} Tokens.
   */
  async authenticateUser(email, password) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.AUTHENTICATE_REST_EP}`
      + `?apiKey=${this.config.appID}`;
    const params = {
      method: "POST",
      headers: {
      },
      body: JSON.stringify({
        grant_type: "user_credentials",
        username: `${email}`,
        password: `${password}`,
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      const tok_res = {
        access_token: new IdTokenResult(result.access_token),
        refresh_token: String(result.refresh_token)
      }
      return tok_res;
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: params.headers,
        body: JSON.stringify({
          grant_type: "user_credentials",
          username: "***REDACTED***",
          password: "***REDACTED***",
        }),
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
   * Gets access token (not supported in On-Prem).
   * @param {IdTokenResult} authnToken - Authentication token.
   * @returns {Promise} Throws error as not implemented.
   */
  async getAccessToken(authnToken) {
    let err = new Error(
      "Method is not supported in base or ldap authentication");
    err.status = ErrorCode.NOT_IMPLEMENT;
    err.authType = this.config.authType.toUpperCase();

    throw authErrorHandler(err);
  }

  /**
   * Reloads user details.
   * @param {object} user - The user object.
   * @returns {Promise<object>} Updated user details.
   */
  async reloadUser(user) {
    const access_token = await user.getIdTokenResult(true);
    return this.getUserDetails(access_token);
  }

  /**
   * Fetches user details.
   * @param {IdTokenResult} access_token - Access token.
   * @returns {Promise<object>} User data.
   */
  async getUserDetails(access_token) {
    //need to implement
    if (access_token == null) {
      Utils.baasTrace(this.#logLevel);
      let err = new Error("Null token!");
      err.status = ErrorCode.INVALID_USER_TOK;
      err.authType = this.config.authType.toUpperCase();

      throw authErrorHandler(err);
    }
    const data = Utils.parseJWT(access_token.token);

    const userData = {
      "displayName": data.user_displayname,
      "emails": [{ "value": data.sub }],
      "meta": {
        "created": data.creation_time,
        "lastSignIn": TimestampUtils.convertIatToTimestamp(data.iat)
      },
      "id": data.user_id,
      "idcsCreatedBy": data.iss,
      "schemas": null,
      "phoneNumbers": [{
        "value": typeof data.user_phonenumber != 'undefined' ? data.user_phonenumber : null
      }],
      "photos": [{
        "value": typeof data.photo_url != 'undefined' ? data.photo_url : null
      }],
      "emailVerified": data.email_verified,
      "ocid": null,
      "idp_name":data.idp_name,
      "idp_type":data.idp_type
    }
    return userData;
  }

  /**
   * Registers a new user.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<void>}
   */
  async registerUser(email, password, url) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.SELF_REGISTER_EP}` +
      `?apiKey=${this.config.appID}`;
    const params = {
      method: "POST",
      headers: {
      },
      body: JSON.stringify({
        "first_name": "-",
        "last_name": "-",
        "email": email,
        "password": password
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: params.headers,
        body: JSON.stringify({
          first_name: "-",
          last_name: "-",
          email: "***REDACTED***",
          password: "***REDACTED***",
        }),
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
   * @param {number} [length=128] - Length in bits.
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
  async  generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  /**
   * Gets redirect credentials.
   * @param {string} code - The code.
   * @returns {Promise<object>} Credentials.
   */
  async getRedirectCredentials(code, url) {

    let response = null;
    let result = null;
    const codeVerifier = localStorage.getItem("codeVerifier");
    const reqURL = `${this.config.domainURL}${ONPREMConfig.REDIRECT_RESULT_EP}?apiKey=${this.config.appID}`;

    const params = {
      method: "POST",
      body : JSON.stringify({
           "code_verifier" : codeVerifier,
           "code" : code
      })
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = response.json();
      Utils.baasLogger(this.#logLevel, "Fetched redirect credential response");
      return result;
    } catch (err) {
      Utils.baasLogger(this.#logLevel, "Error occurred in getting redirect credentials");
    } 
  }

  /**
   * Performs social login.
   * @param {string} url - The login URL.
   * @returns {Promise<object>} Tokens.
   */
  async socialLogin(url) {
    let popup = window.open("", "name", "width=800,height=600");
    popup.location.href = url;
    const data = await this.listenForAuthToken(popup);

    popup.close();

    const result = {
      authnToken: null,
      tokens: {
        access_token: new IdTokenResult(data.access_token),
        refresh_token: data.refresh_token
      }
    }

    return result;
  }

  /**
   * Listens for authentication token.
   * @param {Window} popupWindow - The popup window.
   * @returns {Promise<object>} Authentication data.
   */
  async listenForAuthToken(popupWindow) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      let providerAuthToken = (event) => {
        if (event.source != popupWindow)
          return;
        if (this.ordsHostOrigin && event.origin !== this.ordsHostOrigin)
          return;
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        Utils.baasLogger(this.#logLevel, "Received auth popup message");
        controller.abort(); //remove listener after getting response from Popup
        resolve(data);
      }
      window.addEventListener("message",
        providerAuthToken,
        { signal: controller.signal })
    });
  }

  /**
   * Performs sign out.
   * @param {string} refresh_token - Refresh token.
   * @returns {Promise<void>}
   */
  async performSignOut(refresh_token) {
    await this.revokeRefreshToken(refresh_token);
  }

  /**
   * Signs out from IDCS (not supported).
   * @returns {Promise<void>} Throws error.
   */
  async signOutFromIDCS() {
    let err = new Error("Method is not supported in base or ldap authentication");
    err.status = 501;
    throw authErrorHandler(err);
  }

  /**
   * Revokes refresh token.
   * @param {string} refresh_token - Refresh token.
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(refresh_token) {
    let response = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.REVOKE_REFRESH_TOKEN}` +
      `?apiKey=${this.config.appID}`;
    const params = {
      method: "PUT",
      headers: {
      },
      body: JSON.stringify({
        "token": refresh_token
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: params.headers,
        body: "<REFRESH TOKEN PAYLOAD REDACTED>",
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
   * Sends password reset email.
   * @param {string} email - User's email.
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmailHelper(email) {
    let response = null
    // let result = null
    const reqURL =
      `${this.config.domainURL}${ONPREMConfig.SEND_PASSWORD_RESET_EMAIL}` +
      `?apiKey=${this.config.appID}&email=${email}&requesttype=resetpwd`;

    const params = {
      method: "GET",
      headers: {
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

  /**
   * Verifies password reset code.
   * @param {string} code - Reset code.
   * @returns {Promise<object>} Verification result.
   */
  async verifyPasswordResetCodeHelper(code) {
    let response = null
    let result = null
    const reqURL =
      `${this.config.domainURL}${ONPREMConfig.VERIFY_PASSWORD_RESET_CODE}` +
      `?apiKey=${this.config.appID}&code=${code}&requesttype=resetpwd`;

    const params = {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result.username;
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
   * Confirms password reset.
   * @param {string} code - Reset code.
   * @param {string} newPassword - New password.
   * @returns {Promise<object>} Result.
   */
  async confirmPasswordResetHelper(code, newPassword) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.CONFIRM_PASSWORD_RESET}` +
      `?apiKey=${this.config.appID}&requesttype=resetpwd`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "code":code,
        "password": newPassword
      }),
    };

    try {
      response = await fusabaseFetch(this._app, reqURL, params);
      Utils.checkResponse(response);
      result = await response.json();
      return result;
    } catch (err) {
      const safeParams = {
        method: params.method,
        headers: params.headers,
        body: "<PASSWORD RESET PAYLOAD REDACTED>",
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
   * Signs in with credential.
   * @param {object} credential - The credential.
   * @returns {Promise<object>} Sign in result.
   */
  async signInWithCredentialHelper (credential) {
    let response = null;
    let result = null;
    const reqURL = `${this.config.domainURL}${ONPREMConfig.SIGN_IN_WITH_CREDENTIAL}` +
      `?apiKey=${this.config.appID}&method=${credential.providerId}&link=0`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "token": credential.idToken
      }),
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

}

/**
 * Internal helper class for SRP authentication with On-Prem.
 */
// export class ONPREMSRPAuthHelper extends ONPREMAuthHelper {

//   #logLevel;

//   /**
//    * Constructs an instance of ONPREMSRPAuthHelper.
//    * @param {object} config - Configuration data.
//    * @param {LogLevel} logLevel - The logging level.
//    */
//   constructor(config, logLevel) {
//     super(config, logLevel);
//     this.#logLevel = logLevel
//   }

//   /**
//    * Generates random big integer.
//    * @param {number} bits - Number of bits.
//    * @returns {BigInt} Random big integer.
//    */
//   generateRandomBigInteger(bits) {
//     const bytes = bits / 8; // Convert bits to bytes
//     const buffer = new Uint8Array(bytes);
//     crypto.getRandomValues(buffer);
//     return BigInt('0x' + Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join(''));
//   }

//   /**
//    * Generates salt.
//    * @returns {string} Salt as hex string.
//    */
//   generateSalt() {
//     const lengthInBytes = 128 / 8; // Convert bits to bytes
//     const array = new Uint8Array(lengthInBytes);
//     crypto.getRandomValues(array);
//     return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
//   }

//   /**
//    * Generates SHA-256 hash.
//    * @param {string} input - Input string.
//    * @returns {Promise<string>} Hex hash.
//    */
//   async generateHash(input) {
//     const encoder = new TextEncoder(); 
//     const data = encoder.encode(input);
//     const hash = await crypto.subtle.digest('SHA-256', data);
//     let hexString = '';
//     const hashArray = Array.from(new Uint8Array(hash));
//     hashArray.forEach(b => { const hex = b.toString(16).padStart(2, '0');
//       hexString += hex;
//       });
//     return hexString; 
//   }

//   /**
//    * Encodes text to BigInt via hash.
//    * @param {string} text - Input text.
//    * @returns {Promise<BigInt>} BigInt value.
//    */
//   async encodeToBigInt(text) {
//     const hex = await this.generateHash(text);
//     const bigInteger = BigInt('0x' + hex);
//     return bigInteger;
//   }

//   /**
//    * Gets shared key for SRP.
//    * @param {string} email - User's email.
//    * @returns {Promise<object>} Shared key data.
//    */
//   async getSharedKey(email) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.GET_SHARED_KEY}` +
//       `?apiKey=${this.config.appID}&email=${email}`;
//     const params = {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//       },
//     };

//     try {
//       response = await fetch(reqURL, params);
//       Utils.checkResponse(response);
//       result = await response.json();
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
//     return result;
//   }

//   /**
//    * Adds user using SRP.
//    * @param {object} body - Request body.
//    * @returns {Promise<object>} Tokens.
//    */
//   async addUserUsingSRP(body) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.SRP_ADD_USER}`
//       + `?apiKey=${this.config.appID}`;
//     const params = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: Utils.safeStringify(body),
//     };

//     try {
//       response = await fetch(reqURL, params);
//       Utils.checkResponse(response);
//       result = await response.json();
//       const tok_res = {
//         access_token: new IdTokenResult(result.access_token),
//         refresh_token: String(result.refresh_token)
//       }
//       return tok_res;
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
//    * Registers user using SRP.
//    * @param {string} email - User's email.
//    * @param {string} password - User's password.
//    * @returns {Promise<object>} User details and tokens.
//    */
//   async registerUser(email, password) {
//     const res = await this.getSharedKey(email);
//     const salt = this.generateSalt();
//     const credHash = await this.generateHash(`${email}${password}`)
//     const X = await this.encodeToBigInt(`${salt}${credHash}`);
//     const G = BigInt(res["G"]);
//     const N = BigInt(res["N"]);
//     const K = BigInt(res["K"]);
//     const V = ModUtils.modPow(G, X, N);   
//     const tokens = await this.addUserUsingSRP({
//       "n": N,
//       "g": G,
//       "k": K,
//       "v": V,
//       "s": salt,
//       "email": email,
//       "first_name": "-",
//       "last_name": "-"
//     });
//     const userDetails = await this.getUserDetails(
//       tokens.access_token
//     );
//     return {
//       userDetails: userDetails,
//       authnToken: null,
//       access_token: tokens.access_token,
//       refresh_token: tokens.refresh_token,
//     }
//   }

//   /**
//    * Performs key exchange for SRP.
//    * @param {BigInt} A - Value A.
//    * @param {string} email - User's email.
//    * @returns {Promise<object>} Key exchange result.
//    */
//   async keyExchangeSRP(A, email) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.SRP_AUTHENTICATE_USER}`
//       + `?apiKey=${this.config.appID}&reqtype=key_exchange`;
//     const params = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: Utils.safeStringify({
//         'A': A,
//         "email": email
//       }),
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
//    * Matches session for SRP.
//    * @param {BigInt} sharedkey - Shared key.
//    * @param {string} email - User's email.
//    * @returns {Promise<object>} Session match result.
//    */
//   async sessionMatchSRP(sharedkey, email) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.SRP_AUTHENTICATE_USER}`
//       + `?apiKey=${this.config.appID}&reqtype=session_match`;
//     const params = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: Utils.safeStringify({
//         'shared_key': sharedkey,
//         "email": email
//       }),
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
//    * Authenticates and gets details using SRP.
//    * @param {string} email - User's email.
//    * @param {string} password - User's password.
//    * @returns {Promise<object>} User details and tokens.
//    */
//   async authenticateAndGetDetails(email, password) {
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
//     const credHash = await this.generateHash(`${email}${password}`)
//     const X = await this.encodeToBigInt(`${salt}${credHash}`);
//     const gPowXmodN = ModUtils.modPow(G, X, N);          
//     const kTimesgPowXmodN = K * gPowXmodN;      
//     const subB = BigInt(B - kTimesgPowXmodN);
//     const subtractedValue = ModUtils.customMod(subB,N); 
//     const exponent = a + (U * X);                  
//     const S = ModUtils.modPow(subtractedValue, exponent, N);
//     const f_K = await this.encodeToBigInt(S);
//     const tokens = await this.sessionMatchSRP(f_K, email);
//     const userDetails = await this.getUserDetails(
//       tokens.access_token
//     );
//     return {
//       userDetails: userDetails,
//       authnToken: null,
//       access_token: tokens.access_token,
//       refresh_token: tokens.refresh_token,
//     }
//   }

//   /**
//    * Requests password reset.
//    * @param {object} body - Request body.
//    * @returns {Promise<object>} Reset result.
//    */
//   async resetPasswordRequest(body) {
//     let response = null;
//     let result = null;
//     const reqURL = `${this.config.domainURL}${ONPREMSRPConfig.SRP_RESET_PASSWORD}`
//       + `?apiKey=${this.config.appID}&reqtype=session_match`;
//     const params = {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: Utils.safeStringify(body),
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
//    * Confirms password reset using SRP.
//    * @param {string} code - Reset code.
//    * @param {string} newPassword - New password.
//    * @returns {Promise<void>}
//    */
//   async confirmPasswordResetHelper(code, newPassword) {
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
//     const result = await this.resetPasswordRequest({
//       "V": gPowXmodN,
//       "salt": salt,
//       "email": email,
//       "code":code
//     });
//     if (!(result["success"] && result["success"][0]==1)) {
//       let error = new Error("Password reset failed");
//       error.status = ErrorCode.UNKNOWN;
//       throw authErrorHandler(error);
//     }
//   }

// }
