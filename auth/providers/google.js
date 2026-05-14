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

import { AuthProvider } from "../internal/auth_provider.js";
import { argCheck, typeStrings } from "../utils/typecheck.js";
import { OAuthCredential } from "../types/credential.js";
import { UserCredential } from "../types/user.js";
import { authErrorHandler, ErrorCode } from "../errors.js";

/**
 * Represents a Google authentication provider.
 * @extends AuthProvider
 */
export class GoogleAuthProvider extends AuthProvider {
  /**
   * Internal provider type.
   * @type {string}
   * @private
   */
  _providerType = "";

  /**
   * Sign-in method for Google.
   * @type {string}
   */
  static GOOGLE_SIGN_IN_METHOD = "google";

  /**
   * Provider ID for Google authentication.
   * @type {string}
   */
  static PROVIDER_ID = 'google';

  /**
   * Creates a new GoogleAuthProvider.
   */
  constructor() {
    super(GoogleAuthProvider.PROVIDER_ID);
  }

  /**
   * Gets the provider name.
   * @returns {string} The provider name.
   */
  get providerName() {
    return GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD;
  }

  /**
   * Gets the provider type.
   * @returns {string} The provider type.
   */
  get providerType() {
    return this._providerType;
  }

  /**
   * Sets the provider type.
   * @param {string} type - The type to set.
   */
  set providerType(type) {
    argCheck(type, "Invalid type", true, [typeStrings.STRING]);
    this._providerType = type;
  }

  /**
   * Creates an OAuthCredential for Google.
   * @param {string} [idToken] - The ID token.
   * @param {string} [accessToken] - The access token.
   * @returns {OAuthCredential} The created credential.
   * @throws {Error} If no token is provided or invalid arguments.
   */
  static credential(idToken, accessToken) {
    if (!accessToken && !idToken) {
      let err = new Error("No Token provided");
      err.status = ErrorCode.INVALID_USER_TOK;
      throw authErrorHandler(err);
    }
    argCheck(idToken, "Invalid id token", false, [typeStrings.STRING]);
    argCheck(accessToken, "Invalid access token", false, [typeStrings.STRING]);

    let oauthCreds = new OAuthCredential(GoogleAuthProvider.PROVIDER_ID,
      GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD);
    oauthCreds.accessToken = accessToken;
    oauthCreds.idToken = idToken;
    return oauthCreds;
  }

  /**
   * Extracts credential from a UserCredential result.
   * @param {UserCredential} userCredential - The user credential.
   * @returns {OAuthCredential} The extracted credential.
   * @throws {Error} If invalid credential.
   */
  static credentialFromResult(userCredential) {
    if (!(userCredential instanceof UserCredential)) {
      let error = new Error(`Invalid credentials`);
      error.status = 400;
      throw authErrorHandler(error);
    }
    return userCredential.credential;
  }

  /**
   * Creates credential from an error (not implemented).
   * @param {Error} err - The error.
   * @returns {null} Always returns null.
   */
  static credentialFromError(err) {
    return null;
  }
}
