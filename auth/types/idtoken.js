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

import { authErrorHandler } from "../errors.js";
import { Utils } from "../utils/utils.js";

/**
 * Class representing the token objects.
 */
export class IdTokenResult {
  #token = "";
  issuedAtTime = null;
  expirationTime = null;
  authTime = null;
  parsedJwt = null;

  /**
   * Constructs the token.
   * @param {string} token - The token string.
   * @param {string} [provider='password'] - The sign-in provider.
   */
  constructor(token, provider = 'password') {
    if (token.length === 0) {
      let error = new Error(`Empty token provided`);
      error.status = 400;
      throw authErrorHandler(error);
    }
    this.#token = token;
    this.parsedJwt = Utils.parseJWT(token);
    this.issuedAtTime = this.parsedJwt.iat;
    this.expirationTime = this.parsedJwt.exp;
    this.signInProvider = provider;
    this.authTime = this.parsedJwt.iat;
    this.claims = {
      auth_time: this.parsedJwt.iat,
      exp: this.parsedJwt.exp,
      iat: this.parsedJwt.iat,
      sub: this.parsedJwt.user_id
    };
  }

  /**
   * Internal method to check validity of the access token.
   * @returns {boolean} True if valid, false otherwise.
   */
  #validateAccessToken() {
    let exp = 0;
    if (this.expirationTime) {
      exp = this.expirationTime;
    }
    if (
      exp <
      Math.round(new Date().getTime() / 1000)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Getter for the token.
   * @returns {string} The token if valid, empty string otherwise.
   */
  get token() {
    // check expiration time
    this.#token = (this.#validateAccessToken() ? this.#token : "")
    return this.#token
  }

  /**
   * Internal method to stringify the token object.
   * @returns {string} Stringified token object.
   */
  stringify() {
    return JSON.stringify({
      ['token']: this.#token,
      ['issuedAtTime']: this.issuedAtTime,
      ['expirationTime']: this.expirationTime,
      ['authTime']: this.authTime,
      ['parsedJwt']: this.parsedJwt,
    })
  }
}
