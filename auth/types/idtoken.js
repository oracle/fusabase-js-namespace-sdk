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

import { authErrorHandler } from "../errors.js";
import { Utils } from "../utils/utils.js";

/**
 * Parsed authentication token with standard JWT claims.
 *
 * @example
 * const tokenResult = new IdTokenResult(accessToken);
 * console.log(tokenResult.claims.sub);
 */
export class IdTokenResult {
  #token = "";
  issuedAtTime = null;
  expirationTime = null;
  authTime = null;
  parsedJwt = null;

  /**
   * Creates a parsed token result.
   *
   * @param {string} token - Non-empty JWT access token.
   * @param {string} [provider='password'] - Sign-in provider identifier.
   * @returns {IdTokenResult} The parsed token result.
   * @throws {AuthError} When `token` is empty.
   *
   * @example
   * const tokenResult = new IdTokenResult(accessToken, 'google');
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
   * Gets the token if it has not expired.
   *
   * @returns {string} The token, or an empty string after expiry.
   *
   * @example
   * const token = tokenResult.token;
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
