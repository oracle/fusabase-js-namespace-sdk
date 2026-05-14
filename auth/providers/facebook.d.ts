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

import { AuthProvider } from "../internal/auth_provider";
import { OAuthCredential } from "../types/credential";
import { UserCredential } from "../types/user";

/**
 * Represents a Facebook authentication provider.
 * @extends AuthProvider
 */
export class FacebookAuthProvider extends AuthProvider {
  /**
   * Provider ID for Facebook authentication.
   * @type {string}
   */
  static PROVIDER_ID: string;

  /**
   * Sign-in method for Facebook.
   * @type {string}
   */
  static FACEBOOK_SIGN_IN_METHOD: string;

  /**
   * Creates a new FacebookAuthProvider.
   */
  constructor();

  /**
   * Gets the provider name.
   * @returns {string} The provider name.
   */
  providerName: string;

  /**
   * Gets the provider type.
   * @returns {string} The provider type.
   */
  get providerType(): string;

  /**
   * Sets the provider type.
   * @param {string} type - The type to set.
   */
  set providerType(type: string);

  /**
   * Creates an OAuthCredential for Facebook.
   * @param {string} [idToken] - The ID token.
   * @param {string} [accessToken] - The access token.
   * @returns {OAuthCredential} The created credential.
   * @throws {Error} If no token is provided or invalid arguments.
   */
  static credential(idToken?: string | null, accessToken?: string | null): OAuthCredential;

  /**
   * Extracts credential from a UserCredential result.
   * @param {UserCredential} userCredential - The user credential.
   * @returns {OAuthCredential} The extracted credential.
   * @throws {Error} If invalid credential.
   */
  static credentialFromResult(userCredential: UserCredential): OAuthCredential;

  /**
   * Creates credential from an error (not implemented).
   * @param {Error} err - The error.
   * @returns {null} Always returns null.
   */
  static credentialFromError(err: Error): null;
}
