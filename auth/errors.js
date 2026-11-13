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

/**
 * Numeric status codes used internally when creating authentication errors.
 *
 * @type {Readonly<Record<string, number>>}
 * @example
 * if (error.status === ErrorCode.INVALID_USER_TOK) await auth.signOut();
 */
export const ErrorCode = Object.freeze({
  INVALID_ARGS: 400,
  INVALID_USER_TOK: 401,
  NOT_FOUND: 404,
  WRONG_PASS: 403,
  POPUP_BLOCKED: 498,
  SERVER_ERROR: 500,
  NOT_IMPLEMENT: 501,
  UNAVAILABLE: 502,
  OPR_NOT_ALLOWED: 599,
  NETWORK_ISSUE: 408,
});

/**
 * SDK error-code suffixes corresponding to authentication failures.
 *
 * @type {Readonly<Record<string, string>>}
 * @example
 * console.log(`auth/${ErrorCodeMessage.INVALID_ARGS}`);
 */
export const ErrorCodeMessage = Object.freeze({
  INVALID_ARGS: 'argument-error',
  INVALID_USER_TOK: 'invalid-user-token',
  NOT_FOUND: 'user-not-found',
  WRONG_PASS: 'wrong creds',
  POPUP_BLOCKED: 'popup-blocked',
  SERVER_ERROR: 'internal',
  NOT_IMPLEMENT: 'not-implemented',
  UNAVAILABLE: 'unavailable',
  OPR_NOT_ALLOWED: 'operation-not-allowed',
  UNKNOWN: 'unknown',
  NETWORK_ISSUE: 'network-error',
});

/**
 * Message templates used to create authentication errors.
 *
 * @type {Readonly<Record<string, string>>}
 * @example
 * const message = getErrorMessage('INVALID_PARAM', 'email');
 */
export const errorMessageTemplates = Object.freeze({
  INVALID_NULL: 'Invalid %s: value cannot be null or undefined',
  INVALID_TYPE_PARAM: 'Invalid %s: expected one of %s but got %s',
  INVALID_PARAM: 'Invalid %s',
  NETWORK_ISSUE: 'Network issue.',
  PLEASE_REAUTHENTICATE: 'Please reauthenticate!',
  METHOD_NOT_IMPLEMENTED: 'Method not implemented!',
  USER_REAUTHENTICATE: 'User needs to reauthenticate!',
  EMPTY_TOKEN: 'Empty token provided',
  INVALID_TOKENS: 'Invalid tokens!',
  INVALID_PROVIDER: 'Invalid provider specified',
  INVALID_CREDENTIAL: 'Invalid credential',
  UNKNOWN_PROVIDER_ID: 'Unknown providerId encountered after redirect',
  INVALID_USER_INSTANCE: 'Invalid user instance passed',
  REQUEST_FAILED: 'Request failed',
  INVALID_PERSISTENCE: 'Invalid persistence passed',
  INVALID_PROVIDER_ID_SAML: 'Invalid providerId provided to SAMLAuthProvider',
  INVALID_CREDENTIALS: 'Invalid credentials provided to credential()',
  NO_TOKEN: 'No Token provided',
  INVALID_CREDENTIALS_SIMPLE: 'Invalid credentials',
  METHOD_NOT_SUPPORTED_IDCS: 'Method is not supported in IDCS authentication',
  METHOD_NOT_SUPPORTED_ONPREM: 'This method is not supported in onprem',
  METHOD_NOT_SUPPORTED_BASE_LDAP: 'Method is not supported in base or ldap authentication',
  NULL_TOKEN: 'Null token!',
  PASSWORD_RESET_FAILED: 'Password reset failed',
  UNSUPPORTED_AUTHTYPE: 'Unsupported authType: %s',
  DOMAIN_URL_NOT_PROVIDED: 'Domain URL is not provided',
  CLIENT_ID_NOT_PROVIDED: 'Client ID is not provided',
  CLIENT_SECRET_NOT_PROVIDED: 'Client Secret is not provided',
  NO_OPERATION: 'No operation to perform',
  PASSWORD_UPDATE_FAILED: 'Password update failed'
});

/**
 * Formats a message template with the supplied replacement values.
 *
 * @param {string} key - Key from `errorMessageTemplates`.
 * @param {...string} args - Values substituted into `%s` placeholders.
 * @returns {string} The formatted message.
 * @throws {Error} When `key` is not a known template.
 *
 * @example
 * getErrorMessage('INVALID_PARAM', 'email'); // "Invalid email"
 */
export function getErrorMessage(key, ...args) {
  let template = errorMessageTemplates[key];
  if (!template) {
    throw new Error(`Unknown error key: ${key}`);
  }
  return template.replace(/%s/g, () => args.shift() || '');
}

/**
 * Error raised by an authentication API after normalizing an underlying error.
 *
 * @extends Error
 * @example
 * try {
 *   await auth.signInWithEmailAndPassword('user@example.com', 'bad-password');
 * } catch (error) {
 *   if (error instanceof AuthError) console.log(error.code);
 * }
 */
export class AuthError extends Error {
  /**
   * Creates an authentication error.
   *
   * @param {string} code - SDK error-code suffix; the constructor adds `auth/`.
   * @param {Error} error - The underlying error.
   * @returns {AuthError} The constructed error.
   *
   * @example
   * const error = new AuthError('network-error', new Error('Request failed'));
   */
  constructor(code, error) {
    super(error.message);
    this.authType = error.authType;
    this.stack = error.stack;

    this.code = 'auth/' + code;
    this.name = 'AuthError';
  }
}

/**
 * Converts an SDK or transport error to an `AuthError` using its status code.
 *
 * @param {Error|Object} err - Error-like object that may contain `status` and
 * `authType` properties.
 * @returns {AuthError} The normalized authentication error.
 *
 * @example
 * throw authErrorHandler(Object.assign(new Error('Timed out'), { status: 408 }));
 */
export function authErrorHandler(err) {
  if (err instanceof AuthError) {
    return err;
  }
  let code = null;

  if (err.status === ErrorCode.INVALID_ARGS)
    code = ErrorCodeMessage.INVALID_ARGS;
  else if (err.status === ErrorCode.INVALID_USER_TOK)
    code = ErrorCodeMessage.INVALID_USER_TOK;
  else if (err.status === ErrorCode.NOT_FOUND)
    code = ErrorCodeMessage.NOT_FOUND;
  else if (err.status === ErrorCode.WRONG_PASS)
    code = ErrorCodeMessage.WRONG_PASS;
  else if (err.status === ErrorCode.POPUP_BLOCKED)
    code = ErrorCodeMessage.POPUP_BLOCKED;
  else if (err.status === ErrorCode.SERVER_ERROR)
    code = ErrorCodeMessage.SERVER_ERROR;
  else if (err.status === ErrorCode.NOT_IMPLEMENT)
    code = ErrorCodeMessage.NOT_IMPLEMENT;
  else if (err.status === ErrorCode.UNAVAILABLE)
    code = ErrorCodeMessage.UNAVAILABLE;
  else if (err.status === ErrorCode.OPR_NOT_ALLOWED)
    code = ErrorCodeMessage.OPR_NOT_ALLOWED;
  else if (err.status === ErrorCode.NETWORK_ISSUE)
    code = ErrorCodeMessage.NETWORK_ISSUE;
  else
    code = ErrorCodeMessage.UNKNOWN;

  let error = new AuthError(code, err);

  return error;
}
