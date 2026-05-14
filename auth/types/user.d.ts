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

import { Auth } from "./auth";
import { AuthCredential } from "./credential";
import { IdTokenResult } from "./idtoken";

/**
 * @interface
 */
export interface UserMetadata {
  creationTime?: string;
  lastSignInTime?: string;
}

/**
 * @interface
 */
export interface UserInfo {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerId: string;
  uid: string;
}

/**
 * Class representing the Users.
 */
export class User {
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: UserMetadata;
  phoneNumber: string | null;
  photoURL: string | null;
  providerData: UserInfo[];
  providerId: string;
  refreshToken: string;
  tenantId: string | null;
  uid: string;

  /**
   * Constructs the instance of a user.
   * @param {Object} user - User details.
   * @param {IdTokenResult} [authnToken=null] - Authentication token.
   * @param {IdTokenResult} access_token - Access token.
   * @param {string} refreshToken - Refresh token.
   * @param {Auth} auth - Auth instance.
   */
  constructor(userDetails: any, authnToken: IdTokenResult | null, acc_tok: IdTokenResult, refreshToken: string, auth: Auth);

  /**
   * Method to delete the current signed in user and signOut the user.
   * @async
   * @returns {Promise<void>}
   */
  delete(): Promise<void>;

  /**
   * Method to get Id token for the authenticated user.
   * Optionally user can provide a param for force refreshing
   * the access token issued to the user.
   * Note: This function validates the access token first. If
   * it's about to expire then it refreshes it. In case the
   * refresh fails, which means that the refresh token has become
   * invalid the user is signed out immediately and the authentication
   * state changes. This can happen due to several factors such as
   * credential update, refresh Token expiration, etc.
   * The user has to then login again with credentials.
   * This behaviour can be attibuted to the fact
   * @async
   * @param {boolean} [forceRefresh=false] - Force refresh flag.
   * @returns {Promise<string>} JWT accessToken.
   */
  getIdToken(forceRefresh?: boolean): Promise<string>;

  /**
   * Method to get the parsed IdTokenResult.
   * @async
   * @param {boolean} [forceRefresh=false] - Force refresh flag.
   * @returns {Promise<IdTokenResult>} Parsed IdTokenResult.
   */
  getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult>;

  /**
   * Refreshes the current user, if signed in.
   * @async
   * @returns {Promise<void>}
   */
  reload(): Promise<void>;

  /**
   * Sends email verification.
   * @async
   * @param {Object} settings - Settings.
   * @returns {Promise<void>}
   */
  sendEmailVerification(actionCodeSettings?: any): Promise<void>;

  /**
   * Converts user to JSON.
   * @returns {string} JSON string of the user.
   */
  toJSON(): object;

  /**
   * Updates the user's password.
   * @async
   * @param {string} oldPassword - Old password.
   * @param {string} newPassword - New password.
   * @returns {Promise<void>}
   */
  updatePassword(oldPassword: string, newPassword: string): Promise<void>;

  /**
   * Method to update the profile of the User.
   * @async
   * @param {{displayName: string, phoneNumber: string}} userProfile - User profile updates.
   * @returns {Promise<void>}
   */
  updateProfile(profile: { displayName?: string | null; phoneNumber?: string | null }): Promise<void>;

  /**
   * Links the provided credential to the current user account.
   * @async
   * @param {AuthCredential} credential - The auth credential to link with.
   * @returns {Promise<UserCredential>} A promise that resolves with the user credential.
   */
  linkWithCredential(credential: AuthCredential): Promise<UserCredential>;

  /**
   * Links the user account with the given provider using a popup window.
   * @async
   * @param {any} provider - The auth provider instance (e.g., GoogleAuthProvider).
   * @returns {Promise<UserCredential | null>} A promise that resolves with the user credential or null.
   */
  linkWithPopup(provider: any): Promise<UserCredential | null>;

  /**
   * Links the user account with the given provider using a redirect.
   * @async
   * @param {any} provider - The auth provider instance (e.g., GoogleAuthProvider).
   * @returns {Promise<void>}
   */
  linkWithRedirect(provider: any): Promise<void>;

  /**
   * Unlinks a provider from the user's account.
   * @async
   * @param {string} providerId - The ID of the provider to unlink.
   * @returns {Promise<User>} The updated user object.
   */
  unlink(providerId: string): Promise<User>;
}

/**
 * Class representing the User along with the Auth Credential.
 */
export class UserCredential {
  credential: AuthCredential | null;
  providerId: string | null;
  user: User | null;

  /**
   * Constructor to create an instance of the class.
   * @param {User} user - User instance.
   * @param {AuthCredential} credential - Auth credential.
   */
  constructor(user: User, credential: AuthCredential);
}
