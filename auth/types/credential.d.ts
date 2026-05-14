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

/**
 * Class representing the Auth Credentials returned by
 * the Auth Providers (i.e. EmailAuthProviders, OAuthProvider,
 * GoogleAuthProvider, etc.).
 */
export class AuthCredential {
  providerId: string;
  signInMethod: string;

  /**
   * Constructs an instance of AuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId: string, signInMethod: string);

  /**
   * Method to convert the data member in a JSON format.
   * (Needs a lookup)
   * @returns {string} JSON string of the credential.
   */
  toJSON(): object;

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {AuthCredential} AuthCredential instance.
   */
  static fromJSON(authCredential: object | string): AuthCredential | null;
}

/**
 * Credential class for OAuthCredential.
 */
export class OAuthCredential extends AuthCredential {
  accessToken: string;
  idToken: string;

  /**
   * Constructs an instance of OAuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId: string, signInMethod: string);

  /**
   * Method to convert the data member in a JSON format.
   * @returns {string} JSON string of the credential.
   */
  toJSON(): object;

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {OAuthCredential} OAuthCredential instance.
   */
  static fromJSON(authCredential: object | string): OAuthCredential | null;
}

/**
 * Credential class for SAMLAuthCredential.
 */
export class SAMLAuthCredential extends AuthCredential {
  accessToken: string;
  idToken: string;

  /**
   * Constructs an instance of SAMLAuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId: string, signInMethod: string);

  /**
   * Method to convert the data member in a JSON format.
   * @returns {string} JSON string of the credential.
   */
  toJSON(): object;

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {SAMLAuthCredential} SAMLAuthCredential instance.
   */
  static fromJSON(authCredential: object | string): SAMLAuthCredential | null;
}
