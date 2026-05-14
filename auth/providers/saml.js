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

import { AuthProvider } from "../internal/auth_provider.js";
import { authErrorHandler } from "../errors.js";
import { SAMLAuthCredential } from "../types/credential.js";

/**
 * Represents a SAML authentication provider.
 * @extends AuthProvider
 */
export class SAMLAuthProvider extends AuthProvider {

  /**
   * Sign-in method for SAML.
   * @type {string}
   */
  static SAML_SIGN_IN_METHOD = "saml";

  /**
   * Creates a new SAMLAuthProvider.
   * @param {string} providerId - The provider ID.
   * @throws {Error} If invalid providerId.
   */
  constructor(providerId) {
    // Input Sanitation
    if (typeof providerId === "string" && providerId != "") {
      super(providerId);
      this.providerId = providerId;
    }
    else
      throw authErrorHandler(new Error("Invalid providerId provided to SAMLAuthProvider"));
  }

  /**
   * Gets the provider name.
   * @returns {string} The provider ID.
   */
  get providerName() {
    return this.providerId;
  }

   /**
   * Creates a SAMLAuthCredential.
   * @param {string} [idToken] - The ID token (will be null).
   * @param {string} accessToken - The access token.
   * @returns {SAMLAuthCredential} The created credential.
   * @throws {Error} If invalid credentials.
   */
  static credential (idToken, accessToken) {

    // Input Sanitisation
    // idToken will always be null
    if(typeof accessToken !== "string" )
      throw authErrorHandler(new Error("Invalid credentials provided to credential()"));

    
    let oauthCreds =new SAMLAuthCredential(this.providerId, this.SAML_SIGN_IN_METHOD);
    oauthCreds.accessToken = accessToken;
    oauthCreds.idToken = idToken;

    return oauthCreds;
  }

}
