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

import { argCheck, typeStrings } from "../utils/typecheck.js";

/**
 * Class representing the Auth Credentials returned by
 * the Auth Providers (i.e. EmailAuthProviders, OAuthProvider,
 * GoogleAuthProvider, etc.).
 */
export class AuthCredential {

  // Researching about the exact purpose of this class from the derived
  // SDK.

  /**
   * Constructs an instance of AuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId, signInMethod) {
    this.providerId = providerId;
    this.signInMethod = signInMethod;
  }

  /**
   * Method to convert the data member in a JSON format.
   * (Needs a lookup)
   * @returns {string} JSON string of the credential.
   */
  toJSON() {
    const cred = {
      providerId: this.providerId,
      signInMethod: this.signInMethod,
    };
    return JSON.stringify(cred);
  }

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {AuthCredential} AuthCredential instance.
   */
  static fromJSON(authCredential) {
    argCheck(authCredential, "Invalid object", true, [typeStrings.OBJECT]);
    const res = JSON.parse(authCredential);
    return new AuthCredential(res.providerId, res.signInMethod);
  }
}

/**
 * Credential class for email authentication.
 * 
 * @class
 * @extends AuthCredential
 */
export class EmailAuthCredential extends AuthCredential {
  #credentials;

  /**
   * Constructs an instance of EmailAuthCredential.
   * 
   * @constructor
   * @param {string} providerId - Provider ID. Example: 'password'
   * @param {string} signInMethod - Sign-in method. Example: 'password'
   * @param {string} email - User's email. Example: 'user@example.com'
   * @param {string|null} password - User's password (may be null after creation). Example: 'strongPass123'
   */
  constructor(providerId, signInMethod, email, password, emailLink) {
    super(providerId, signInMethod);
    this.#credentials = { email: email, password: password, emailLink:emailLink}
  }
  // Potential password leak to XSS attacks, if getter is given
  // Should we even allow credentials to be stored in pvt. variables.
  // How will signInWithCredentials work?

  /**
   * Getter for email.
   * 
   * @return {string} Email address.
   */
  get email () {
    return this.#credentials.email;
  }

  /**
   * Getter for password.
   * 
   * @return {string} Password.
   */
  get password () {
    return this.#credentials.password;
  }

  /**
   * Getter for email link.
   * 
   * @return {string} Email link.
   */
  get emailLink () {
    return this.#credentials.emailLink;
  }

  /**
   * Converts to JSON.
   * 
   * @return {string} JSON string.
   */
  toJSON() {
    const cred = {
      email:this.#credentials.email,
      providerId: this.providerId,
      signInMethod: this.signInMethod
    };
    return JSON.stringify(cred);
  }

  /**
   * Creates instance from JSON.
   * 
   * @param {string|Object} authCredential - JSON of credential. Example: '{"email": "user@example.com", "providerId": "password"}'
   * @return {EmailAuthCredential|null} EmailAuthCredential instance or null.
   */
  static fromJSON(authCredential) {
    if (authCredential == null) {
      return null;
    }
    const res = JSON.parse(authCredential);
    const emailCred = new EmailAuthCredential(res.providerId, res.signInMethod,
       res.email, res.password, res.emailLink);
    return emailCred;
  }

}

/**
 * Credential class for OAuthCredential.
 */
export class OAuthCredential extends AuthCredential {
  accessToken = "";
  idToken = "";
  /**
   * Constructs an instance of OAuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId, signInMethod) {
    super(providerId, signInMethod);
  }

  /**
   * Method to convert the data member in a JSON format.
   * @returns {string} JSON string of the credential.
   */
  toJSON() {
    const cred = {
      providerId: this.providerId,
      signInMethod: this.signInMethod,
      accessToken: this.accessToken,
      idToken: this.idToken
    };
    return JSON.stringify(cred);
  }

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {OAuthCredential} OAuthCredential instance.
   */
  static fromJSON(authCredential) {
    argCheck(authCredential, "Invalid object", true, [typeStrings.OBJECT]);
    const res = JSON.parse(authCredential);
    const oauth = new OAuthCredential(res.providerId, res.signInMethod);
    oauth.accessToken = res.accessToken;
    oauth.idToken = res.idToken;
  }
}

/**
 * Credential class for SAMLAuthCredential.
 */
export class SAMLAuthCredential extends AuthCredential {
  accessToken = "";
  idToken = "";   // Will be null always
  /**
   * Constructs an instance of SAMLAuthCredential.
   * @param {string} providerId - Provider ID.
   * @param {string} signInMethod - Sign in method.
   */
  constructor(providerId, signInMethod) {
    super(providerId, signInMethod);
  }

  /**
   * Method to convert the data member in a JSON format.
   * @returns {string} JSON string of the credential.
   */
  toJSON() {
    const cred = {
      providerId: this.providerId,
      signInMethod: this.signInMethod,
      accessToken: this.accessToken,
      idToken: this.idToken
    };
    return JSON.stringify(cred);
  }

  /**
   * Method to convert the data in JSON format to data members.
   * (Needs a lookup)
   * @param {string} authCredential - JSON string.
   * @returns {SAMLAuthCredential} SAMLAuthCredential instance.
   */
  static fromJSON(authCredential) {
    argCheck(authCredential, "Invalid object", true, [typeStrings.OBJECT]);
    const res = JSON.parse(authCredential);
    const oauth = new SAMLAuthCredential(res.providerId, res.signInMethod);
    oauth.accessToken = res.accessToken;
    oauth.idToken = res.idToken;
  }
}
