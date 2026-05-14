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
import { EmailAuthCredential } from "../types/credential.js";
import { AuthCredential } from "../types/credential.js";

/**
 * Represents an email authentication provider.
 * @extends AuthProvider
 */
export class EmailAuthProvider extends AuthProvider {
  /**
   * Sign-in method for email link.
   * @type {string}
   */
  static EMAIL_LINK_SIGN_IN_METHOD = "emailLink";

  /**
   * Sign-in method for email and password.
   * @type {string}
   */
  static EMAIL_PASSWORD_SIGN_IN_METHOD = "password";

  /**
   * Provider ID for email authentication.
   * @type {string}
   */
  static PROVIDER_ID = 'password';

  /**
   * Creates a new EmailAuthProvider.
   */
  constructor() {
    super('password')
  }

  /**
   * Creates an AuthCredential for email and password.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {AuthCredential} The created credential.
   */
  static credential(email, password) {
    const credential = new EmailAuthCredential(EmailAuthProvider.PROVIDER_ID,
      EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD, email, password, null);
    return credential;
  }

  /**
   * Creates an AuthCredential for email link sign-in.
   * @param {string} email - The user's email.
   * @param {string} emailLink - The email link for sign-in.
   * @returns {AuthCredential} The created credential.
   */
  static credentialWithLink(email, emailLink) {
    const credential = new EmailAuthCredential(EmailAuthProvider.PROVIDER_ID,
      EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD, email, null, emailLink);
    return credential;
  }

}
