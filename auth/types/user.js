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

import { ONPREMUserHelper, IDCSUserHelper } from "../helpers/user_helper.js";
import { ONPREMAuthHelper, IDCSAuthHelper } from "../helpers/auth_helper.js";
import { AuthCredential } from "./credential.js";
import { ErrorCode, authErrorHandler, getErrorMessage } from "../errors.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { Utils } from "../utils/utils.js";
import { IdTokenResult } from "./idtoken.js";
import { GoogleAuthProvider } from "../providers/google.js";
import { FacebookAuthProvider } from "../providers/facebook.js";
import { GithubAuthProvider } from "../providers/github.js";
import { IDCSConfig } from "../helpers/config.js";

/**
 * Class representing the Users.
 */
export class User {
  displayName = null;
  email = null;
  phoneNumber = null;
  metadata = null;
  ocid = null;
  photoURL = null;
  refreshToken = null;
  providerId = null;
  providerData = [];
  tenantId = null;
  #userHelper = null;
  #config = null;
  #authHelper = null;
  //#schemas = null;
  #auth = null;
  uid = null; // Needs a lookup

  /**
   * Constructs the instance of a user.
   * @param {Object} user - User details.
   * @param {IdTokenResult} [authnToken=null] - Authentication token.
   * @param {IdTokenResult} acc_tok - Access token.
   * @param {string} refreshToken - Refresh token.
   * @param {Auth} auth - Auth instance.
   */
  constructor(user, authnToken = null, acc_tok, refreshToken, auth) {
    this.displayName = user.displayName;
    this.email = user.emails[0].value; // How shoud we deal with multiple emails -> Select Primary
    this.emailVerified = user.emailVerified;
    this.uid = user.id;
    this.ocid = user.ocid;
    this.isAnonymous = false;
    this.#config = auth.config;
    this.refreshToken = refreshToken;
    this.phoneNumber = user.phoneNumbers ? user.phoneNumbers[0].value : null;
    this.photoURL = user.photos ? user.photos[0].value : null;

    if (this.#config.authType === 'idcs') {
      this.#userHelper = new IDCSUserHelper(auth.config, authnToken, acc_tok, auth._getLogLevel);
    }
    // else if (this.#config.authType === 'base_s' || this.#config.authType === 'ldap_s') {
    //   this.#userHelper = new ONPREMSRPUserHelper(auth.config, authnToken, acc_tok, auth._getLogLevel);
    // }
    else {
      this.#userHelper = new ONPREMUserHelper(auth.config, authnToken, acc_tok, auth._getLogLevel);
    }
    this.#userHelper._setApp(auth.app);

    this.#auth = auth;
    //this.#schemas = user.schemas;
    this.providerId = user.idp_name;
    this.providerData.push({
      displayName: user.displayName,
      email: user.emails[0].value,
      phoneNumber: this.phoneNumber,
      photoURL: this.photoURL,
      uid: user.id,
      providerId: user.idp_name
    });
    this.metadata = { creationTime: user.meta.created, lastSignInTime: user.meta.lastSignIn };

    if (this.#config.authType === 'idcs') {
      this.#authHelper = new IDCSAuthHelper(
        auth.config,
        auth._getLogLevel,
        new URL(auth.app.options.ordsHost).origin
      );
    }
    // else if (this.#config.authType === 'base_s' || this.#config.authType === 'ldap_s') {
    //   this.#authHelper = new ONPREMSRPAuthHelper(auth.config, auth._getLogLevel);
    // }
    else {
      this.#authHelper = new ONPREMAuthHelper(
        auth.config,
        auth._getLogLevel,
        new URL(auth.app.options.ordsHost).origin
      );
    }
    this.#authHelper._setApp(auth.app);

  }

  /**
   * Converts user to JSON.
   * @returns {string} JSON string of the user.
   */
  toJSON() {
    const user = {
      displayName: this.displayName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      metadata: this.metadata,
      photoURL: this.photoURL,
      refreshToken: this.refreshToken,
      providerId: this.providerId,
      providerData: this.providerData,
      tenantId: this.tenantId,
      isAnonymous: this.isAnonymous,
      uid: this.uid
    }
    return JSON.stringify(user);
  }

  /**
   * Internal method to get access token.
   * @returns {IdTokenResult} Access token.
   */
  __getToken() {
    if (!this.#userHelper.validateFUSABASEAccessToken()) {
      let err = new Error(getErrorMessage('PLEASE_REAUTHENTICATE'));
      err.status = 400;
      throw authErrorHandler(err);
    }
    return this.#userHelper.fusabase_token.token;
  }

  /**
   * Method to get Id token for the authenticated user.
   * Optionally user can provide a param for force refreshing
   * the access token issued to the user.
   * Note: This function validates the access token first. If
   * it's about to expire then it refreshes it. In case the
   * refresh fails, which means that the refresh token has become
   * invalid the user is signed out immediately and the authentication
   * state changes. This can happen due to several factors such as
   * credential update, refresh Token expiration, etc.
   * The user has to then login again with credentials.
   * This behaviour can be attibuted to the fact
   * @async
   * @param {boolean} [forceRefresh=false] - Force refresh flag.
   * @returns {Promise<string>} JWT accessToken.
   */
  async getIdToken(forceRefresh = false) {
    argCheck(forceRefresh, "Invalid value", true, [typeStrings.BOOL]);
    if (forceRefresh || !this.#userHelper.validateAccessToken()) {
      try {
        Utils.baasLogger(this.#auth.app.logLevel,"before refresh");
        this.refreshToken = await this.#userHelper.refreshAccessToken(
          this.refreshToken
        );

        const tokens = {
          access_token: this.#userHelper.access_token,
          refresh_token: this.refreshToken,
        }
        Utils.baasLogger(this.#auth.app.logLevel,"after refresh");
        if (typeof window !== "undefined") {
          await this.#auth._setTokenDataOnStorage(this.#auth.TOKEN_KEY, tokens);
        }
        await this.#auth.__updateCurrentToken(this);
      } catch (err) {
        if (err.status === ErrorCode.INVALID_ARGS) {
          this.#auth.signOut();
        } else throw authErrorHandler(err);
      }
    }
    return this.#userHelper.access_token.token;
  }

  async getFUSABASEToken(forceRefresh = false) {
    argCheck(forceRefresh, "Invalid value", true, [typeStrings.BOOL]);
    if (forceRefresh || !this.#userHelper.validateFUSABASEAccessToken()) {
      try {
        await this.getIdToken();
        Utils.baasLogger(this.#auth.app.logLevel,"before refresh");
      } catch (err) {
        if (err.status === ErrorCode.INVALID_ARGS) {
          await this.#auth.signOut();
          return ;
        } else throw authErrorHandler(err);
      }
      try {
        this.#userHelper.fusabase_token = new IdTokenResult(await this.#userHelper.fetchFusabaseToken(`${this.#auth.app.options.ordsHost}_/baas-services/idm/idcs/${this.#config.projectID}/${IDCSConfig.FETCH_FUSABASE_TOKEN}?apiKey=${this.#config.appID}`));
      } catch (e) {
        Utils.baasLogger(this.#auth.app.logLevel,"could not fetch token");
      }
    }
    if (!this.#userHelper.fusabase_token) {
      return null;
    }
    return this.#userHelper.fusabase_token.token;
  }

  /**
   * Method to get the parsed IdTokenResult.
   * @async
   * @param {boolean} [forceRefresh=false] - Force refresh flag.
   * @returns {Promise<IdTokenResult>} Parsed IdTokenResult.
   */
  async getIdTokenResult(forceRefresh = false) {
    argCheck(forceRefresh, "Invalid value", true, [typeStrings.BOOL]);
    await this.getIdToken(forceRefresh);
    return new IdTokenResult(this.#userHelper.access_token.token);
  }

  //discuss
  /**
   * Method to update the profile of the User.
   * @async
   * @param {{displayName: string, phoneNumber: string}} userProfile - User profile updates.
   * @returns {Promise<void>}
   */
  async updateProfile(userProfile) {
    argCheck(userProfile, "Invalid profile object", true, [typeStrings.OBJECT]);
    this.#userHelper.user = this;
    await this.#userHelper.updateProfile(
      userProfile);
    await this.reload();
  }

  /**
   * Method to delete the current signed in user and signOut the user.
   * @async
   * @returns {Promise<void>}
   */
  async delete() {
    let err = new Error(getErrorMessage('METHOD_NOT_IMPLEMENTED'));
    err.status = ErrorCode.NOT_IMPLEMENT;
    throw authErrorHandler(err);
  }

  /**
   * Sends email verification.
   * @async
   * @param {Object} settings - Settings.
   * @returns {Promise<void>}
   */
  async sendEmailVerification(settings) {
    await this.getIdToken();
    await this.#userHelper.sendEmailVerificationHelper(this.email, this.uid);
  }

  /**
   * Refreshes the current user, if signed in.
   * @async
   * @returns {Promise<void>}
   */
  async reload() {
    try {
      if (!this.#userHelper || !this.#userHelper.access_token) {
        let error = new Error(getErrorMessage('USER_REAUTHENTICATE'));
        error.status = ErrorCode.INVALID_USER_TOK;
        Utils.baasTrace(this.#auth._getLogLevel);
        throw authErrorHandler(error);
      }
      const userDetails = await this.#authHelper.reloadUser(this);

      const user = new User(
        userDetails,
        this.#userHelper.authnToken,
        this.#userHelper.access_token,
        this.refreshToken,
        this.#auth
      );
      await user.getFUSABASEToken();
      await this.#auth.updateCurrentUser(user);
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Updates the user's password.
   * @async
   * @param {string} oldPassword - Old password.
   * @param {string} newPassword - New password.
   * @returns {Promise<void>}
   */
  async updatePassword(oldPassword, newPassword) {
    argCheck(oldPassword, "Invalid old password", true, [typeStrings.STRING]);
    argCheck(newPassword, "Invalid new password", true, [typeStrings.STRING]);
    try {
      await this.getIdToken();

      await this.#userHelper.updatePasswordHelper(
        this.email, newPassword, oldPassword);
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
 * Links the provided credential to the current user account.
 * @async
 * @param {AuthCredential} credential - The auth credential to link with.
 * @returns {Promise<UserCredential>} A promise that resolves with the user credential.
 */
async linkWithCredential(credential) {
    this.#userHelper.user = this;
    await this.#userHelper.linkWithCredentialHelper(credential);
    await this.reload();
    return this.#auth.userCredential;
  }

/**
 * Links the user account with the given provider using a popup window.
 * @async
 * @param {Object} provider - The auth provider instance (e.g., GoogleAuthProvider).
 * @returns {Promise<UserCredential>} A promise that resolves with the user credential or null.
 */
async linkWithPopup(provider) {

    if (this.#auth.app.options.authType === "idcs") {
      let err = new Error(getErrorMessage('METHOD_NOT_IMPLEMENTED'));
      err.status = ErrorCode.NOT_IMPLEMENT;
      throw authErrorHandler(err);
    }

    try {
      const method = provider.providerName;
      const baseUrl = this.#auth.app.options.authType === "idcs"
        ? `${this.#auth.app.options.ordsHost}_/baas-services/idm/idcs/${this.#auth.config.projectID}/socialLink`
        : `${this.#auth.app.options.ordsHost}_/baas-services/idm/onprem/${this.#auth.config.projectID}/socialidp`;
      const popupUrl = new URL(baseUrl);
      popupUrl.searchParams.set('method', method);
      popupUrl.searchParams.set('apiKey', this.#auth.app.options.appID);
      popupUrl.searchParams.set(
        'context_uri',
        `${window.location.origin}${window.location.pathname}`
      );
      if (this.#auth.app.options.authType !== "idcs") {
        popupUrl.searchParams.set('device', 'web');
        popupUrl.searchParams.set('link', '1');
      }

      const tokensObj = await this.#userHelper.socialLink(popupUrl.toString());

      if (this.#auth.app.options.authType === "idcs") {
        if (tokensObj && tokensObj.success == 1) {
          await this.reload();
          return this.#auth.userCredential;
        }
        return null;
      }

      const idToken = tokensObj.idToken;
      const providerMap = {
          google: GoogleAuthProvider,
          facebook: FacebookAuthProvider,
          github: GithubAuthProvider
        };

      const P = providerMap[method];

      return await this.linkWithCredential(P.credential(idToken));
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
 * Links the user account with the given provider using a redirect.
 * @async
 * @param {Object} provider - The auth provider instance (e.g., GoogleAuthProvider).
 * @returns {Promise<void>}
 */
async linkWithRedirect(provider) {

    if (this.#auth.config.authType === "idcs") {
      let err = new Error(getErrorMessage('METHOD_NOT_IMPLEMENTED'));
      err.status = ErrorCode.NOT_IMPLEMENT;
      throw authErrorHandler(err);
    }

    if (
      !(provider instanceof GoogleAuthProvider ||
        provider instanceof FacebookAuthProvider ||
        provider instanceof GithubAuthProvider ||
        provider instanceof SAMLAuthProvider ||
        provider instanceof OAuthProvider
      )) {
      let error = new Error(getErrorMessage('INVALID_PROVIDER'));
      error.status = 400;
      throw authErrorHandler(error);
    }

    try {

      const codeVerifier = this.#userHelper.generateCodeVerifier();
      const codeChallenge = await this.#userHelper.generateCodeChallenge(codeVerifier);

      localStorage.setItem("redirectState", "LoginInitiated");
      localStorage.setItem("codeVerifier", codeVerifier);
      localStorage.setItem("providerId", provider.providerName);

      // Build base URL safely
      const baseUrl = `${this.#auth.app.options.ordsHost}_/baas-services/idm/onprem/${this.#auth.config.projectID}/socialidp`;

      // Create URL object (prevents string-based injection)
      const redirectUrl = new URL(baseUrl);

      // Explicit allow-listed parameters only
      redirectUrl.searchParams.set('method', provider.providerName);
      redirectUrl.searchParams.set('device', 'web');
      redirectUrl.searchParams.set('apiKey', this.#auth.app.options.appID);
      redirectUrl.searchParams.set('code_challenge', codeChallenge);
      redirectUrl.searchParams.set('code_challenge_method', 'S256');
      redirectUrl.searchParams.set(
        'context_uri',
        `${window.location.origin}${window.location.pathname}` // 🔐 no tainted query
      );
      redirectUrl.searchParams.set('link', '1');

      // Safe redirect sink (Fortify-recognized)
      window.location.assign(redirectUrl.toString());
      return new Promise<never>(() => {});
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
 * Unlinks a provider from the user's account.
 * @async
 * @param {string} providerId - The ID of the provider to unlink.
 * @returns {Promise<User>} The updated user object.
 */
async unlink(providerId) {
    this.#userHelper.user = this;
    await this.#userHelper.unlinkHelper(providerId);
    await this.reload();
    return this;
  }

}

/**
 * Class representing the User along with the Auth Credential.
 */
export class UserCredential {
  /**
   * Constructor to create an instance of the class.
   * @param {User} user - User instance.
   * @param {AuthCredential} credential - Auth credential.
   */
  constructor(user, credential) {
    this.user = user;
    this.credential = credential;
    this.providerId = credential.providerId;
  }
}
