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
 * Retrieves the configuration for authentication based on the application settings.
 * @param {Object} app - The application object containing configuration options.
 * @returns {Config} An instance of a Config subclass based on the authType.
 * @throws {Error} If the authType is not supported.
 */
export function getConfig(app) {
  let projectConfig = app.options;
  if (projectConfig.authType === 'base' ||
    projectConfig.authType === 'ldap') {
    return new ONPREMConfig(
      `${projectConfig.ordsHost}_/baas-services/idm/onprem/${projectConfig.projectID}/`,
      projectConfig.appID,
      projectConfig.authID,
      projectConfig.authType,
      projectConfig.projectID
    )
  } else if (projectConfig.authType === 'idcs') {
    return new IDCSConfig(
      projectConfig.ordsHost + "_/baas-services/idm/idcs/" + projectConfig.projectID + "/",
      projectConfig.appID,
      projectConfig.authID,
      projectConfig.authType,
      projectConfig.projectID,
      projectConfig.idcsDomainURL || ""
    )
  }
  // else if (projectConfig.authType === 'base_s'
  //   || projectConfig.authType === 'ldap_s') {
  //   return new ONPREMSRPConfig(
  //     `${projectConfig.ordsHost}_/baas-services/idm/onprem/${projectConfig.projectID}/`,
  //     projectConfig.appID,
  //     projectConfig.authID,
  //     projectConfig.authType,
  //     projectConfig.projectID
  //   )
  // } 
  else {
    throw new Error(`Unsupported authType: ${projectConfig.authType}`);
  }
}

/**
 * Base class for configuration, specifying the type of identity provider.
 */
export class Config {
  /**
   * Creates a new Config instance.
   * @param {string} authType - The type of authentication provider (e.g., 'base', 'ldap', 'idcs').
   */
  constructor(authType) {
    this.authType = authType
  }
}

/**
 * Configuration class for on-premises authentication.
 */
export class ONPREMConfig extends Config {

  /**
   * Endpoint for authentication.
   * @type {string}
   */
  static AUTHENTICATE_REST_EP = "authenticate";

  /**
   * Endpoint for self-registration.
   * @type {string}
   */
  static SELF_REGISTER_EP = "useradd";

  /**
   * Endpoint for updating password.
   * @type {string}
   */
  static UPDATE_PASSWORD_HELPER = "changePassword";

  /**
   * Endpoint for updating profile.
   * @type {string}
   */
  static UPDATE_PROFILE_HELPER = "profile";

  /**
   * Endpoint for revoking refresh token.
   * @type {string}
   */
  static REVOKE_REFRESH_TOKEN = "rf/revoke";

  /**
   * Endpoint for sending email verification.
   * @type {string}
   */
  static SEND_EMAIL_VERIFICATION = "sendemail";

  /**
   * Endpoint for sending password reset email.
   * @type {string}
   */
  static SEND_PASSWORD_RESET_EMAIL = "sendemail";

  /**
   * Endpoint for confirming password reset.
   * @type {string}
   */
  static CONFIRM_PASSWORD_RESET = "resetpwd";

  /**
   * Endpoint for verifying password reset code.
   * @type {string}
   */
  static VERIFY_PASSWORD_RESET_CODE = "verifycode";

  /**
   * Endpoint for signing in with credential.
   * @type {string}
   */
  static SIGN_IN_WITH_CREDENTIAL = 'getcredential';

  /**
   * Endpoint for fetching redirect result.
   * @type {string}
   */
  static REDIRECT_RESULT_EP = 'redirectResult';

  /**
   * Creates a new ONPREMConfig instance.
   * @param {string} domainURL - The base URL for the domain.
   * @param {string} appID - The application ID.
   * @param {string} authID - The authentication ID.
   * @param {string} authType - The type of authentication.
   * @param {string} projectID - The project ID.
   */
  constructor(domainURL, appID, authID, authType, projectID) {
    super(authType);

    this.authID = authID;
    this.appID = appID;
    this.domainURL = domainURL;
    this.projectID = projectID;
  }
}

/**
 * Configuration class for IDCS authentication.
 */
export class IDCSConfig extends ONPREMConfig {
  static LOGOUT_REST_EP = "/oauth2/v1/userlogout";

  constructor(domainURL, appID, authID, authType, projectID, idcsDomainURL = "") {
    super(domainURL, appID, authID, authType, projectID);
    this.idcsDomainURL = idcsDomainURL.replace(/\/+$/, "");
  }
}
