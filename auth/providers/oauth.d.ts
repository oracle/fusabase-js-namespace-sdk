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

import { AuthProvider } from "../internal/auth_provider";
import { OAuthCredential } from "../types/credential";

/**
 * Represents an OAuth authentication provider.
 * @extends AuthProvider
 */
export class OAuthProvider extends AuthProvider {
  /**
   * Sign-in method for OAuth (OIDC).
   * @type {string}
   */
  static OAUTH_SIGN_IN_METHOD: string;

  /**
   * Creates a new OAuthProvider.
   * @param {string} providerId - The provider ID.
   * @throws {Error} If invalid providerId.
   */
  constructor(providerId: string);

  /**
   * Gets the provider name.
   * @returns {string} The provider ID.
   */
  providerName: string;

  /**
   * Creates an OAuthCredential.
   * @param {string} [idToken] - The ID token.
   * @param {string} [accessToken] - The access token.
   * @returns {OAuthCredential} The created credential.
   * @throws {Error} If invalid credentials.
   */
  static credential(idToken?: string | null, accessToken?: string | null): OAuthCredential;
}
