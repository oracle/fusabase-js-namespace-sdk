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
 * Internal Error Codes being used to generate AuthError
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
 * Error code messages corresponding to ErrorCode values
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
 * Map of error message templates
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
 * Function to get formatted error message from template
 * @param {string} key - The key in errorMessageTemplates
 * @param {...string} args - Arguments to replace %s placeholders
 * @returns {string} Formatted message
 */
export function getErrorMessage(key, ...args) {
  let template = errorMessageTemplates[key];
  if (!template) {
    throw new Error(`Unknown error key: ${key}`);
  }
  return template.replace(/%s/g, () => args.shift() || '');
}

/**
 * Custom error class for authentication-related errors.
 * @class
 * @extends Error
 */
export class AuthError extends Error {
  /**
   * Creates an instance of AuthError.
   * @param {string} code - The error code prefixed with 'auth/'.
   * @param {Error} error - The original error object.
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
 * Handles and transforms errors into AuthError instances based on status codes.
 * @param {Error|Object} err - The error object to handle, expected to have a status property.
 * @returns {AuthError} An AuthError instance with the appropriate code.
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
