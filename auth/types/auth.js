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

import { PersistenceUserManager } from "../internal/persistence.js";
import { persistenceType } from "../internal/storage/storage_types.js";
import BrowserLocalPersistence from "../internal/storage/local_storage.js";
import BrowserSessionPersistence from "../internal/storage/session_storage.js";
import { Utils } from "../utils/utils.js";
import { IdTokenResult } from "./idtoken.js";
import { getConfig } from "../helpers/config.js";
import { IDCSAuthHelper, ONPREMAuthHelper } from "../helpers/auth_helper.js";
import { authErrorHandler, ErrorCode, getErrorMessage } from "../errors.js";
import { nullCheck, argCheck, typeStrings } from "../utils/typecheck.js";
import { GoogleAuthProvider } from "../providers/google.js";
import { FacebookAuthProvider } from "../providers/facebook.js"; 
import { GithubAuthProvider } from "../providers/github.js";
import { OAuthProvider } from "../providers/oauth.js";
import { SAMLAuthProvider } from "../providers/saml.js";
import { IDCSAuthProvider } from "../providers/idcs.js";
import { EmailAuthProvider } from "../providers/email.js";
import { OAuthCredential } from "./credential.js";
import { User, UserCredential } from "./user.js";
import { IDCSUserHelper, ONPREMUserHelper } from "../helpers/user_helper.js";
import { getAppStorageKey, getAppStorageScope } from "../../app/storage-scope.js";


/**
 * Authentication service for an initialized Fusabase application.
 *
 * @example
 * const auth = appInstance.auth();
 * const credential = await auth.signInWithEmailAndPassword('user@example.com', 'password');
 */
export class Auth {
  #authHelper = null;
  #userCredential = null;
  #eventListener = null;
  #persistenceUserManager = null;
  // Retained for the IDCS form-post logout handoff.
  #idTokenHint = null;
  persistenceListener = null;
  static Persistence = persistenceType;

  /**
   * Creates the authentication service for an app. Applications normally
   * create this service automatically; call `app.auth()` instead.
   *
   * @param {App} app - Initialized Fusabase app.
   * @returns {Auth} The configured authentication service.
   */
  constructor(app) {
    this.config = getConfig(app);
    this.app = app;
    this.name = app.name;
    const persistenceScope = getAppStorageScope(app);
    this.TOKEN_KEY = getAppStorageKey(app, "TOKENS");
    this.tenantId = null; // Find a way to get this (Best from config)
    this.currentUser = null;
    if (this.config.authType === 'idcs') {
      this.#authHelper = new IDCSAuthHelper(
        this.config,
        app.logLevel,
        new URL(this.app.options.ordsHost).origin
      );
    }
    else {
      this.#authHelper = new ONPREMAuthHelper(
        this.config,
        app.logLevel,
        new URL(this.app.options.ordsHost).origin
      );
    }

    this.#authHelper._setApp(app);
    this.#eventListener = new EventTarget();

    if (typeof window !== "undefined") {
      this.persistenceListener = new window.BroadcastChannel(`${persistenceScope}:auth_event`);

      this.#persistenceUserManager =
        new PersistenceUserManager(this.persistenceListener, this.TOKEN_KEY);

      /**
       * Internal function to handle a local-persistence login notification.
       * BroadcastChannel data is untrusted: tokens must be read from this
       * app's scoped persistence rather than accepted from the message.
       */
      const handleLocalLogin = async () => {
        const localPersistence = new BrowserLocalPersistence();
        const serializedTokens = await localPersistence._get(this.TOKEN_KEY);
        if (!serializedTokens) {
          return;
        }
        let tokens;
        try {
          tokens = this.#tokensParse(serializedTokens);
        } catch {
          Utils.baasLogger(this.app.logLevel, "Ignoring invalid persisted auth tokens");
          return;
        }

        if (this.#persistenceUserManager.persistence.type === persistenceType.SESSION) {
          await this.#persistenceUserManager.persistence._remove(this.TOKEN_KEY);
        }
        if (this.currentUser) {
          await this.#signOutWithoutTrigger();
        }
        this.#persistenceUserManager.persistence = localPersistence;
        await this.#signInWithoutTrigger(tokens);
      }

      /**
       * Internal function to handle the login event with session persistence.
       */
      const handleSessionNoneLogin = async event => {
        if (this.#persistenceUserManager.persistence.type === persistenceType.LOCAL) {
          await this.#persistenceUserManager.persistence._remove(this.TOKEN_KEY);
        }
        if (this.currentUser) {
          await this.#signOutWithoutTrigger();
        }
      }

      /**
       * Internal function to handle the logout event with local persistence.
       */
      const handleLocalLogout = async event => {
        if (this.currentUser) {
          await this.#signOutWithoutTrigger();
        }
      }

      //find the tokens
      this.#persistenceUserManager.persistence = new BrowserLocalPersistence();
      var tokens = window.localStorage.getItem(this.TOKEN_KEY);
      if (!tokens) {
        this.#persistenceUserManager.persistence = new BrowserSessionPersistence();
        tokens = window.sessionStorage.getItem(this.TOKEN_KEY);
      }

      if (tokens) {
        tokens = this.#tokensParse(tokens);
        if (this.#persistenceUserManager.persistence._isAvailable()) {
          this.#initialSignIn(tokens);
        }
        else {
          this.#persistenceUserManager =
            new PersistenceUserManager(this.persistenceListener, this.TOKEN_KEY);
          this.#initialSignIn(tokens);
        }
      } else {
        //no tokens found
        this.#persistenceUserManager =
          new PersistenceUserManager(this.persistenceListener, this.TOKEN_KEY);
      }

      this.persistenceListener.onmessage = async event => {
        Utils.baasLogger(this.app.logLevel, {
          title: "auth persistence event",
          name: event.data ? event.data.name : undefined,
        });
        if (event.data?.name === `login_local`) {
          handleLocalLogin();
        }
        else if (event.data?.name === `login_session_none` &&
          this.#persistenceUserManager.persistence.type === persistenceType.LOCAL) {
          handleSessionNoneLogin(event);
        }
        else if (event.data?.name === `logout_local` &&
          this.#persistenceUserManager.persistence.type === persistenceType.LOCAL) {
          handleLocalLogout(event);
        }
      };
    }
  }

  /**
   * Internal function to parse the strifified tokens object from storage.
   * @param {string} tokens - Stringified tokens.
   * @returns {Object} Parsed tokens object.
   */
  #tokensParse(tokens) {
    tokens = JSON.parse(tokens);
    tokens.access_token = JSON.parse(tokens.access_token)
    return tokens;
  }

  #setIdTokenHint(tokens) {
    this.#idTokenHint = this.config.authType === "idcs" &&
      typeof tokens?.id_token === "string" && tokens.id_token.length > 0
      ? tokens.id_token
      : null;
  }

  /**
   * Internal method to set data on storage and post events.
   * @param {string} key - Storage key.
   * @param {Object} value - Value to store.
   * @returns {Promise<Object>} Stored value.
   */
  _setTokenDataOnStorage = async (key, value) => {
    if (this.config.authType === "idcs" &&
        (typeof value.id_token !== "string" || value.id_token.length === 0) &&
        this.#persistenceUserManager) {
      const persistedValue = await this.#persistenceUserManager.persistence._get(key);
      let persistedTokens = null;
      try {
        persistedTokens = typeof persistedValue === "string"
          ? JSON.parse(persistedValue)
          : persistedValue;
      } catch {
        persistedTokens = null;
      }
      if (typeof persistedTokens?.id_token === "string" && persistedTokens.id_token.length > 0) {
        value = { ...value, id_token: persistedTokens.id_token };
      }
    }
    value.access_token = new IdTokenResult(value.access_token.token);
    await this.#persistenceUserManager.persistence._set(key, value).then(res => {
      if (this.#persistenceUserManager.persistence.type === persistenceType.LOCAL) {
        this.persistenceListener.postMessage({
          name: `login_local`,
        });
      }
      else {
        this.persistenceListener.postMessage({
          name: `login_session_none`,
        });
      }
      return value;
    }).catch(err => {
      throw authErrorHandler(err);
    });
    this.#setIdTokenHint(value);
    return value;
  }

  /**
   * Internal method to get the log level of the app.
   * @returns {string} Log level.
   */
  _getLogLevel() {
    return this.app.logLevel;
  }

  /**
   * Async Method to create user with email and password in IDCS.
   * Returns the newly created User Credentials and signs in
   * the user in IDCS as well. Throws exception in case the process
   * fails with error code and status.
   * @async
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<UserCredential>} Created user's credentials.
   *
   * @example
   * const result = await auth.createUserWithEmailAndPassword('user@example.com', 'password');
   */
  async createUserWithEmailAndPassword(email, password) {
    argCheck(email, "Invalid email", true, [typeStrings.STRING]);
    argCheck(password, "Invalid password", true, [typeStrings.STRING]);
    let response = null;
    try {
      await this.#authHelper.registerUser(email, password, "");

      response = await this.signInWithEmailAndPassword(email, password);
    }
    catch (err) {
      throw authErrorHandler(err);
    }

    return response;
  }

  /**
   * Internal Method to sync the login activity across tabs.
   * @param {Object} tokens - Tokens to sync.
   */
  async #syncLoginPersistence(tokens) {
    if (this.persistenceListener == null || !(typeof window !== "undefined")) {
      return;
    }
    this._setTokenDataOnStorage(this.TOKEN_KEY, tokens).then((res) => {
    }).catch(err => {
      throw authErrorHandler(err);
    });
  }

  /**
   * Async Method to sign in a user with email and password.
   * Throws exception in case the process fails with error
   * code and status.
   * @async
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<UserCredential>} User's Credential.
   *
   * @example
   * const result = await auth.signInWithEmailAndPassword('user@example.com', 'password');
   */
  async signInWithEmailAndPassword(email, password) {
    argCheck(email, "Invalid email", true, [typeStrings.STRING]);
    argCheck(password, "Invalid password", true, [typeStrings.STRING]);
    var userData;
    try {
      userData = await this.#authHelper.authenticateAndGetDetails(email, password);
    }
    catch (err) {
      throw authErrorHandler(err);
    }

    return this.#createCredentials(userData);
  }

  /**
   * Creates user credentials.
   * @async
   * @param {Object} userData - User data.
   * @returns {Promise<UserCredential>} User credential.
   *
   * @example
   * const result = await auth.signInWithPopup(new GoogleAuthProvider());
   */
  async #createCredentials(userData) {
    const user = new User(
      userData.userDetails,
      userData.authnToken,
      userData.access_token,
      userData.refresh_token,
      this
    );
    await user.getFUSABASEToken();
    const credential = EmailAuthProvider.credential();

    const userCred = new UserCredential(user, credential);
    this.#userCredential = userCred;
    await this.#syncLoginPersistence({
      access_token: userData.access_token,
      refresh_token: userData.refresh_token
    });
    await this.updateCurrentUser(user);
    return userCred;
  }

  /**
   * Internal Method to sign in without triggering events.
   * @async
   * @param {Object} tokens - Tokens for sign in.
   * @returns {Promise<UserCredential>} User credential.
   */
  async #signInWithoutTrigger(tokens) {
    if (!tokens) {
      let error = new Error(getErrorMessage('INVALID_TOKENS'));
      error.status = ErrorCode.INVALID_ARGS;
      Utils.baasTrace(this.app.logLevel);
      throw authErrorHandler(error);
    }
    this.#setIdTokenHint(tokens);
    const userDetails = await this.#authHelper.getUserDetails(
      tokens.access_token
    );
    const user = new User(
      userDetails,
      null,
      tokens.access_token,
      tokens.refresh_token,
      this
    );
    await user.getFUSABASEToken();
    let credential;
    if (userDetails["idp_name"] === "UserNamePassword") {
      credential = EmailAuthProvider.credential(user.email, null);
    } else {
     if (userDetails["idp_name"].startsWith("google")) {
      credential = GoogleAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("github")) {
      credential = GithubAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("facebook")) {
      credential = FacebookAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("oidc_")) {
      credential = OAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("saml_")) {
      credential = SAMLAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("idcs")) {
       credential = IDCSAuthProvider.credential(tokens.id_token, tokens.access_token.token);
     }
    }
    //const credential = EmailAuthProvider.credential();
    const userCred = new UserCredential(user, credential);
    this.#userCredential = userCred;
    await this.updateCurrentUser(user);
    return userCred;
  }

  /**
   * Internal Method to sign in on auth initialization.
   * @async
   * @param {Object} tokens - Initial tokens.
   * @returns {Promise<UserCredential|null>} User credential or null.
   */
  async #initialSignIn(tokens) {
    if (!tokens) {
      return null;
    }
    if (!tokens.access_token) {
      return null;
    }
    if (!tokens.access_token.token) {
      return null;
    }
    this.#setIdTokenHint(tokens);
    tokens.access_token = new IdTokenResult(tokens.access_token.token);
    var _userHelper = null;
    if (this.config.authType === 'idcs') {
      _userHelper = new IDCSUserHelper(this.config, null, tokens.access_token, this.app.logLevel);
    }
    else {
      _userHelper = new ONPREMUserHelper(this.config, null, tokens.access_token, this.app.logLevel);
    }
    var forcerefresh = false;
    if (!_userHelper.validateAccessToken()) {
      forcerefresh = true;
      try {
        const temp_token =
          await _userHelper.refreshAccessToken(
            tokens.refresh_token);
        tokens.refresh_token = temp_token;
        tokens.access_token = _userHelper.access_token;
      }
      catch (e) {
        Utils.baasLogger(this.app.logLevel, "Unable to refresh stored auth tokens");
        return null;
      }
    }
    let userDetails = null;
    try {
      userDetails = await this.#authHelper.getUserDetails(
        tokens.access_token
      );
    } catch (e) {
      Utils.baasLogger(this.app.logLevel, "Unable to fetch stored auth user details");
      return null;
    }
    if (userDetails == null) {
      return null;
    }
    const user = new User(
      userDetails,
      null,
      tokens.access_token,
      tokens.refresh_token,
      this
    );
    await user.getFUSABASEToken();
    let credential;
    if (userDetails["idp_name"] === "UserNamePassword") {
      credential = EmailAuthProvider.credential(user.email, null);
    } else {
     if (userDetails["idp_name"].startsWith("google")) {
      credential = GoogleAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("github")) {
      credential = GithubAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("facebook")) {
      credential = FacebookAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("oidc_")) {
      credential = OAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("saml_")) {
      credential = SAMLAuthProvider.credential(null, tokens.access_token.token);
     } else if (userDetails["idp_name"].startsWith("idcs")) {
       credential = IDCSAuthProvider.credential(tokens.id_token, tokens.access_token.token);
     }
    }
    const userCred = new UserCredential(user, credential);
    this.#userCredential = userCred;
    if (forcerefresh) {
      try {
        await this.#syncLoginPersistence({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          id_token: tokens.id_token
        });
      } catch (e) {
        Utils.baasLogger(this.app.logLevel, "Unable to sync refreshed auth persistence");
        return null;
      }
    }
    await this.updateCurrentUser(user);
    return userCred;
  }

  /**
   * Async method to sign in using popup.
   * @async
   * @param {object} provider - Auth provider.
   * @returns {Promise<UserCredential>} User credential.
   */
  async signInWithPopup(provider) {

    if (this.config.authType != 'idcs' &&
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
      const baseUrl = this.config.authType === 'idcs'
        ? `${this.app.options.ordsHost}_/baas-services/idm/idcs/${this.config.projectID}/social`
        : `${this.app.options.ordsHost}_/baas-services/idm/onprem/${this.config.projectID}/socialidp`;
      const popupUrl = new URL(baseUrl);
      popupUrl.searchParams.set('device', 'web');
      popupUrl.searchParams.set('apiKey', this.app.options.appID);
      popupUrl.searchParams.set(
        'context_uri',
        `${window.location.origin}${window.location.pathname}`
      );
      if (this.config.authType !== 'idcs') {
        popupUrl.searchParams.set('method', provider.providerName);
        popupUrl.searchParams.set('link', '0');
      }

      const tokensObj = await this.#authHelper.socialLogin(popupUrl.toString());

      const tokens = tokensObj.tokens;
      const authnToken = tokensObj.authnToken;
      const idToken = this.config.authType === "idcs" ? tokensObj.id_token : undefined;

      const userDetails = await this.#authHelper.getUserDetails(
        tokens.access_token
      );

      const user = new User(
        userDetails,
        authnToken,
        tokens.access_token,
        tokens.refresh_token,
        this.app.auth()
      );
      await user.getFUSABASEToken();
      const credential = provider instanceof IDCSAuthProvider
        ? IDCSAuthProvider.credential(idToken, tokens.access_token.token)
        : provider.constructor.credential(
            authnToken == null ? null : authnToken.token,
            tokens.access_token.token
          );
      const userCred = new UserCredential(user, credential);
      Utils.baasLogger(this.app.logLevel, { title: "usercreds", providerId: userCred.providerId });
      this.#userCredential = userCred;
      await this.#syncLoginPersistence({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: idToken
      });

      await this.updateCurrentUser(user);
      return userCred;
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Async method to sign in with credential.
   * @async
   * @param {OAuthCredential} credential - OAuth credential.
   * @returns {Promise<UserCredential>} User credential.
   *
   * @example
   * const credential = GoogleAuthProvider.credential(idToken, accessToken);
   * const result = await auth.signInWithCredential(credential);
   */
  async signInWithCredential(credential) {
    nullCheck(credential, "Invalid credential.");
    let authnToken = null;
    if (!(credential instanceof OAuthCredential)) {
      let error = new Error(getErrorMessage('INVALID_CREDENTIAL'));
      error.status = 400;
      throw authErrorHandler(error);
    }
    try {
      const tokens = await this.#authHelper.signInWithCredentialHelper(credential);
      tokens["access_token"] = new IdTokenResult(tokens["access_token"]);
      const userDetails = await this.#authHelper.getUserDetails(
        tokens.access_token
      );

      const user = new User(
        userDetails,
        credential.idToken,
        tokens.access_token,
        tokens.refresh_token,
        this.app.auth()
      );
      await user.getFUSABASEToken();
      let newCreds;
      if (credential.providerId === GoogleAuthProvider.PROVIDER_ID) {
        newCreds = GoogleAuthProvider.credential(
        authnToken == null ? null : authnToken.token,
        tokens.access_token.token
      );
      }
      if (credential.providerId === FacebookAuthProvider.PROVIDER_ID) {
        newCreds = FacebookAuthProvider.credential(
        authnToken == null ? null : authnToken.token,
        tokens.access_token.token
      );
      }
      if (credential.providerId === GithubAuthProvider.PROVIDER_ID) {
        newCreds = GithubAuthProvider.credential(
        authnToken == null ? null : authnToken.token,
        tokens.access_token.token
      );
      }
      if (credential.providerId === IDCSAuthProvider.PROVIDER_ID) {
        newCreds = IDCSAuthProvider.credential(credential.idToken, tokens.access_token.token);
      }
      const userCred = new UserCredential(user, newCreds);
      Utils.baasLogger(this.app.logLevel, { title: "usercreds", providerId: userCred.providerId });
      this.#userCredential = userCred;
      await this.#syncLoginPersistence({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: credential.providerId === IDCSAuthProvider.PROVIDER_ID ? credential.idToken : undefined
      });

      await this.updateCurrentUser(user);
      return userCred;
      }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Starts a browser redirect sign-in flow. This method does not resolve until
   * the browser navigates away; call `getRedirectResult()` after it returns.
   * @async
   * @param {object} provider - Auth provider.
   * @returns {Promise<void>} A promise for the redirect initiation.
   *
   * @example
   * await auth.signInWithRedirect(new GoogleAuthProvider());
   */
  async signInWithRedirect(provider) {

    if (this.config.authType === 'idcs' &&
      !(provider instanceof IDCSAuthProvider)) {
      let error = new Error(`Invalid provider specified`);
      error.status = 400;
      throw authErrorHandler(error);
    }

    if (this.config.authType != 'idcs' &&
      !(provider instanceof GoogleAuthProvider ||
        provider instanceof FacebookAuthProvider ||
        provider instanceof GithubAuthProvider ||
        provider instanceof SAMLAuthProvider ||
        provider instanceof OAuthProvider
      )) {
      let error = new Error(`Invalid provider specified`);
      error.status = 400;
      throw authErrorHandler(error);
    }

    try {

      const codeVerifier = this.#authHelper.generateCodeVerifier();
      const codeChallenge = await this.#authHelper.generateCodeChallenge(codeVerifier);

      localStorage.setItem(getAppStorageKey(this.app, "redirectState"), "LoginInitiated");
      localStorage.setItem(getAppStorageKey(this.app, "codeVerifier"), codeVerifier);
      localStorage.setItem(getAppStorageKey(this.app, "providerId"), provider.providerName);

      // Build base URL safely
      const baseUrl =
        this.config.authType === 'idcs'
          ? `${this.app.options.ordsHost}_/baas-services/idm/idcs/${this.config.projectID}/social`
          : `${this.app.options.ordsHost}_/baas-services/idm/onprem/${this.config.projectID}/socialidp`;

      // Create URL object (Fortify-safe)
      const redirectUrl = new URL(baseUrl);

      // Allow-listed query parameters only
      redirectUrl.searchParams.set('device', 'web');
      redirectUrl.searchParams.set('apiKey', this.app.options.appID);
      redirectUrl.searchParams.set('code_challenge', codeChallenge);
      redirectUrl.searchParams.set('code_challenge_method', 'S256');
      redirectUrl.searchParams.set(
        'context_uri',
        `${window.location.origin}${window.location.pathname}` // 🔐 no user-controlled query
      );
      redirectUrl.searchParams.set('link', '0');

      // Only add method for on-prem
      if (this.config.authType !== 'idcs') {
        redirectUrl.searchParams.set('method', provider.providerName);
      }

      // Final redirect (validated sink)
      window.location.assign(redirectUrl.toString());

    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Gets the provider from local storage.
   * @returns {object} Auth provider.
   */
  getProvider() {
    const providerId = localStorage.getItem(getAppStorageKey(this.app, "providerId"));

    if (providerId == "google") {
      return new GoogleAuthProvider();
    }
    else if (providerId == "github") {
      return new GithubAuthProvider();
    }
    else if (providerId == "facebook") {
      return new FacebookAuthProvider();
    }
    else if (providerId.startsWith("saml_")) {
      return new SAMLAuthProvider(providerId);
    }
    else if (providerId.startsWith("oidc_")) {
      return new OAuthProvider(providerId);
    } 
    else if (providerId == 'idcs') {
      return new IDCSAuthProvider();
    } 
    else {
      throw new Error(getErrorMessage('UNKNOWN_PROVIDER_ID'));
    }

  }

  /**
   * Completes a pending redirect sign-in flow and clears redirect state.
   * @async
   * @param {Auth} [auth] - Reserved for compatibility; this instance is used.
   * @returns {Promise<UserCredential|null>} Redirect result.
   *
   * @example
   * const result = await auth.getRedirectResult();
   */
  async getRedirectResult(auth) {

    const status = localStorage.getItem(getAppStorageKey(this.app, "redirectState"));

    if (status == null || status != "LoginInitiated")
      return null;

    try {
      const provider = this.getProvider();

      const parsedUrl = new URL(window.location.href);
      const params = parsedUrl.searchParams;

      const code = params.get("code");

      const data = await this.#authHelper.getRedirectCredentials(code, "");

      if (data && data.id_token && !data.access_token) {
        if (!this.currentUser) {
          return null;
        }
        return await this.currentUser.linkWithCredential(provider.constructor.credential(data.id_token));
      }

      const tokensObj = {
        authnToken: null,
        tokens: {
          access_token: new IdTokenResult(data.access_token),
          refresh_token: data.refresh_token,
          id_token: this.config.authType === "idcs" ? data.id_token : undefined
        }
      }
      const tokens = tokensObj.tokens;
      const authnToken = tokensObj.authnToken;

      const userDetails = await this.#authHelper.getUserDetails(
        tokens.access_token
      );
      const user = new User(
        userDetails,
        authnToken,
        tokens.access_token,
        tokens.refresh_token,
        this.app.auth()
      );
      await user.getFUSABASEToken();
      const credential = provider instanceof IDCSAuthProvider
        ? IDCSAuthProvider.credential(tokens.id_token, tokens.access_token.token)
        : provider.constructor.credential(
            authnToken == null ? null : authnToken.token,
            tokens.access_token.token
          );
      const userCred = new UserCredential(user, credential);
      Utils.baasLogger(this.app.logLevel, { title: "usercreds", providerId: userCred.providerId });
      this.#userCredential = userCred;
      await this.#syncLoginPersistence({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token
      });

      localStorage.setItem(getAppStorageKey(this.app, "redirectState"), "ResultProcessed");

      await this.updateCurrentUser(user);
      return userCred;
    } catch (err) {

      localStorage.setItem(getAppStorageKey(this.app, "redirectState"), "ErrorEncountered");
      throw authErrorHandler(err);
    }
    finally {

      // Clear local storage in case of successful/failed login
      localStorage.removeItem(getAppStorageKey(this.app, "redirectKey"));
      localStorage.removeItem(getAppStorageKey(this.app, "codeVerifier"));
      localStorage.removeItem(getAppStorageKey(this.app, "providerId"));

      // Clean the URL
      const url = new URL(window.location);
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname + url.search);

    }
  }


  // check this (not implemented)
  /**
   * Attempts anonymous sign-in.
   *
   * @returns {Promise<string>} This method always rejects because anonymous
   * sign-in is not implemented.
   * @throws {AuthError} Always throws `auth/not-implemented`.
   */
  signInAnonymously() {
    let err = new Error(getErrorMessage('METHOD_NOT_IMPLEMENTED'));
    err.status = ErrorCode.NOT_IMPLEMENT;
    throw authErrorHandler(err);
  }

  /**
   * Method to detect a change in authentication state.
   * Detects the change in auth state and fires the provided
   * callback by passing the current user as a param.
   * Returns a function to unsubscribe from listening the state.
   * @param {(user: User|null) => void} observer - Callback receiving the
   * current user immediately and on later sign-in/sign-out changes.
   * @returns {() => void} Function that removes the observer.
   *
   * @example
   * const unsubscribe = auth.onAuthStateChanged((user) => console.log(user?.uid));
   * unsubscribe();
   */
  onAuthStateChanged(observer) {
    argCheck(observer, "Invalid callback", true, [typeStrings.FUNCTION]);
    const listener = () => {
      observer(this.currentUser);
    };
    this.#eventListener.addEventListener("StateChange", listener);
    // this.updateCurrentUser(this.currentUser);
    observer(this.currentUser);

    const unsubscribe = () => {
      this.#eventListener.removeEventListener("StateChange", listener);
    };
    return unsubscribe;
  }


  /**
   * Adds an observer for changes to the signed-in user's ID token, 
   * which includes sign-in, sign-out, and token refresh events. 
   * Returns a function to unsubscribe from listening the state.
   * @param {(user: User|null) => void} observer - Callback receiving the
   * current user immediately and whenever its ID token changes.
   * @returns {() => void} Function that removes the observer.
   *
   * @example
   * const unsubscribe = auth.onIdTokenChanged((user) => console.log(user?.uid));
   * unsubscribe();
   */
  onIdTokenChanged(observer) {
    argCheck(observer, "Invalid callback", true, [typeStrings.FUNCTION]);
    // Adding Listener
    const listener = () => {
      observer(this.currentUser);
    };
    this.#eventListener.addEventListener("IdTokenChange", listener);

    // this.updateCurrentUser(this.currentUser);
    observer(this.currentUser);
    // Function to unsubscribe
    const unsubscribe = () => {
      this.#eventListener.removeEventListener("IdTokenChange", listener);
    };
    return unsubscribe;
  }

  /**
   * Internal Method to sync logout activity across tabs.
   */
  async #syncLogoutPersistence() {
    if (this.persistenceListener == null || !(typeof window !== "undefined")) {
      return;
    }
    try {
      await this.#persistenceUserManager.persistence._remove(this.TOKEN_KEY);
      if (this.#persistenceUserManager.persistence.type === persistenceType.LOCAL) {
        this.persistenceListener.postMessage({
          name: `logout_local`,
        });
      }
    } catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Signs out the current user, clears local persistence and authenticated
   * realtime state, and, for IDCS, submits the required browser logout handoff
   * when an ID-token hint exists.
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * await auth.signOut();
   */
  async signOut() {
    const idTokenHint = this.#idTokenHint;
    const refreshToken = this.currentUser?.refreshToken ?? null;
    const shouldSubmitIdcsLogout = this.config.authType === "idcs" &&
      typeof window !== "undefined" && idTokenHint != null;

    if (refreshToken && this.#authHelper) {
      try {
        await this.#authHelper.performSignOut(refreshToken);
      } catch (err) {
        if (!this.#isAlreadyInvalidRefreshTokenError(err)) {
          throw authErrorHandler(err);
        }
      }
    }
    try {
      await this.#syncLogoutPersistence();
      await this.updateCurrentUser(null);
      this.#idTokenHint = null;
      if (shouldSubmitIdcsLogout) {
        this.#submitIdcsLogoutForm(idTokenHint);
      }
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  #isAlreadyInvalidRefreshTokenError(error) {
    if (!error) return false;
    if (error.status === ErrorCode.INVALID_USER_TOK) return true;
    return typeof error.message === "string" &&
      /\b(?:invalid[_ -]?token|token[_ -]?expired|expired[_ -]?token|already[_ -]?(?:revoked|invalid))\b/i.test(error.message);
  }

  #submitIdcsLogoutForm(idTokenHint) {
    const logoutUrl = new URL("logout", this.config.domainURL);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = logoutUrl.toString();
    form.style.display = "none";
    const fields = {
      apiKey: this.app.options.appID,
      context_uri: `${window.location.origin}${window.location.pathname}`,
      id_token_hint: idTokenHint,
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  /**
   * Internal Method to sign out a logged in user without triggering the sync events of persistence.
   * @async
   */
  async #signOutWithoutTrigger() {
    try {
      await this.updateCurrentUser(null);
      this.#idTokenHint = null;
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Clears realtime state owned by this app, if its OracleDB service exists.
   * @returns {Promise<void>}
   * @private
   */
  async #clearRealtimeState() {
    const oracledb = this.app?.oracledb?.();
    if (oracledb?.__clearRealtimeState) {
      await oracledb.__clearRealtimeState();
    }
  }

  /**
   * Clears credential and user token data retained by this Auth instance after
   * sign-out. The credential object is cleared before its Auth-held reference
   * is removed so callers that retained the returned UserCredential observe
   * empty OAuth or SAML token fields.
   *
   * @param {User|null} previousUser - The user being signed out.
   * @returns {void}
   * @private
   */
  #clearSignedOutCredential(previousUser) {
    const userCredential = this.#userCredential;
    const credential = userCredential?.credential;

    if (credential != null) {
      if (Object.prototype.hasOwnProperty.call(credential, "accessToken")) {
        credential.accessToken = "";
      }
      if (Object.prototype.hasOwnProperty.call(credential, "idToken")) {
        credential.idToken = "";
      }
    }

    previousUser?.__clearTokenData?.();
    if (userCredential != null) {
      userCredential.user = null;
    }
    this.#userCredential = null;
  }

  /**
   * Async method to update the current user with the provided user.
   * Also triggers a change in state. If the principal changes, active
   * realtime listeners and their authenticated socket are cleared before the
   * new user is made current.
   * @async
   * @param {User|null} user - User to make current, or `null` to sign out.
   * @returns {Promise<User|null>} Updated current user.
   *
   * @example
   * await auth.updateCurrentUser(null);
   */
  async updateCurrentUser(user) {
    if (user && !(user instanceof User)) {
      let error = new Error(getErrorMessage('INVALID_USER_INSTANCE'));
      error.status = 400;
      throw authErrorHandler(error);
    }
    const previousUser = this.currentUser;
    if (previousUser?.uid !== user?.uid) {
      await this.#clearRealtimeState();
    }
    this.currentUser = user;
    if (this.#userCredential != null) {
      this.#userCredential.user = user;
    }
    if (user == null) {
      this.#clearSignedOutCredential(previousUser);
    }
    setTimeout(() => {
      this.#eventListener.dispatchEvent(
        new Event("StateChange"),
      )
      this.#eventListener.dispatchEvent(
        new Event("IdTokenChange"),
      )
    }
    );
    return this.currentUser;
  }

  /**
   * Internal method to update current token.
   * @async
   * @param {User} user - User.
   * @returns {Promise<User>} Updated user.
   */
  async __updateCurrentToken(user) {
    if (this.currentUser?.uid !== user?.uid || this.#userCredential == null) {
      return this.currentUser;
    }
    this.currentUser = user;
    this.#userCredential.user = user;
    setTimeout(() => {
      this.#eventListener.dispatchEvent(
        new Event("IdTokenChange"),
      )
    }
    );
    return this.currentUser;
  }

  /**
   * Async method to send password reset email.
   * @async
   * @param {string} email - Email address.
   * @param {Object} [actionCodeSettings] - Reserved action-code settings.
   * @returns {Promise<void>}
   *
   * @example
   * await auth.sendPasswordResetEmail('user@example.com');
   */
  async sendPasswordResetEmail(email, actionCodeSettings) {
    argCheck(email, "Invalid email", true, [typeStrings.STRING]);
    await this.#authHelper.sendPasswordResetEmailHelper(email);
  }

  /**
   * Verifies the password reset code sent on email.
   * @async
   * @param {string} code - Reset code.
   * @returns {Promise<string>} Username.
   *
   * @example
   * const username = await auth.verifyPasswordResetCode(resetCode);
   */
  async verifyPasswordResetCode(code) {
    argCheck(code, "Invalid code", true, [typeStrings.STRING]);
    let response = null;
    try {
      response = await this.#authHelper.verifyPasswordResetCodeHelper(code);
      if (response) {
        return response;
      } else {
        let error = new Error(getErrorMessage('REQUEST_FAILED'));
        error.status = ErrorCode.SERVER_ERROR;
        error.authType = this.config.authType;
        Utils.baasTrace(this.app.logLevel);
        throw authErrorHandler(error);
      }
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }

  /**
   * Completes the password reset process.
   * @async
   * @param {string} code - Reset code.
   * @param {string} newPassword - New password.
   * @returns {Promise<void>}
   *
   * @example
   * await auth.confirmPasswordReset(resetCode, 'new-password');
   */
  async confirmPasswordReset(code, newPassword) {
    argCheck(code, "Invalid code", true, [typeStrings.STRING]);
    argCheck(newPassword, "Invalid newPassword", true, [typeStrings.STRING]);
    try {
      await this.#authHelper.confirmPasswordResetHelper(code, newPassword);
    }
    catch (err) {
      throw authErrorHandler(err);
    }
  }


  /**
   * Getter for user credential.
   * @returns {UserCredential|null} Most recent user credential, or `null`
   * before sign-in and after sign-out.
   */
  get userCredential() {
    return this.#userCredential;
  }

  /**
   * Changes the persistence state.
   * @async
   * @param {'LOCAL'|'SESSION'|'NONE'} persistence - Persistence mode from
   * `Auth.Persistence`.
   * @returns {Promise<void>}
   *
   * @example
   * await auth.setPersistence(Auth.Persistence.LOCAL);
   */
  async setPersistence(persistence) {
    if (!(persistence == persistenceType.LOCAL ||
      persistence == persistenceType.SESSION ||
      persistence == persistenceType.NONE
    )) {
      let error = new Error(getErrorMessage('INVALID_PERSISTENCE'));
      error.status = 400;
      throw authErrorHandler(error);
    }
    await this.#persistenceUserManager.setPersistence(persistence);
  }

}
