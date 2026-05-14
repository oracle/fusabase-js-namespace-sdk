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

import { User, UserCredential } from "./user";
import { OAuthCredential } from "./credential";
import { persistenceType } from "../internal/storage/storage_types";
import { App } from "../../app/app";
import { GoogleAuthProvider } from "../providers/google";
import { FacebookAuthProvider } from "../providers/facebook";
import { GithubAuthProvider } from "../providers/github";
import { IDCSAuthProvider } from "../providers/idcs";
import { SAMLAuthProvider } from "../providers/saml";
import { OAuthProvider } from "../providers/oauth";

/**
 * Auth Class for providing authentication
 * capabilities to the user.
 */
export class Auth {
  readonly name: string;
  currentUser: User | null;
  tenantId: string | null;
  static Persistence: typeof persistenceType;

  /**
   * Constructs the Auth instance.
   * @param {App} app OBaaS App
   */
  constructor(app: App);

  /**
   * Async Method to create user with email and password in IDCS.
   * Returns the newly created User Credentials and signs in
   * the user in IDCS as well. Throws exception in case the process
   * fails with error code and status.
   * @async
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<UserCredential>} Created user's credentials.
   */
  createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;

  /**
   * Async Method to sign in a user with email and password.
   * Throws exception in case the process fails with error
   * code and status.
   * @async
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<UserCredential>} User's Credential.
   */
  signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;

  /**
   * Async method to sign in using popup.
   * @async
   * @param {object} provider - Auth provider.
   * @returns {Promise<UserCredential>} User credential.
   */
  signInWithPopup(provider: GoogleAuthProvider | FacebookAuthProvider | GithubAuthProvider | OAuthProvider | SAMLAuthProvider | IDCSAuthProvider): Promise<UserCredential>;

  /**
   * Async method to sign in via redirect.
   * @async
   * @param {object} provider - Auth provider.
   */
  signInWithRedirect(provider: GoogleAuthProvider | FacebookAuthProvider | GithubAuthProvider | OAuthProvider | SAMLAuthProvider | IDCSAuthProvider): Promise<void>;

  /**
   * Gets the redirect result.
   * @async
   * @param {Auth} auth - Auth instance.
   * @returns {Promise<UserCredential|null>} Redirect result.
   */
  getRedirectResult(): Promise<UserCredential | null>;

  /**
   * Async method to sign in with credential.
   * @async
   * @param {OAuthCredential} credential - OAuth credential.
   * @returns {Promise<UserCredential>} User credential.
   */
  signInWithCredential(credential: OAuthCredential): Promise<UserCredential>;

  /**
   * Method to detect a change in authentication state.
   * Detects the change in auth state and fires the provided
   * callback by passing the current user as a param.
   * Returns a function to unsubscribe from listening the state.
   * @param {CallableFunction} observer - Observer function.
   * @returns {CallableFunction} Unsubscribe function.
   */
  onAuthStateChanged(observer: (user: User | null) => void): () => void;

  /**
   * Adds an observer for changes to the signed-in user's ID token, 
   * which includes sign-in, sign-out, and token refresh events. 
   * Returns a function to unsubscribe from listening the state.
   * @param {CallableFunction} observer - Observer function.
   * @returns {CallableFunction} Unsubscribe function.
   */
  onIdTokenChanged(observer: (user: User | null) => void): () => void;

  /**
   * Async Method to sign out a logged in user.
   * Throw exception if the calls to IDCS fails along
   * with error status and code.
   * @async
   * @returns {Promise<void>}
   */
  signOut(): Promise<void>;

  /**
   * Async method to update the current user with the provided user.
   * Also, triggers a change in state. Responsibility of the user to
   * provide a valid User.
   * @async
   * @param {User} user - User to update.
   * @returns {Promise<User>} Updated current user.
   */
  updateCurrentUser(user: User | null): Promise<void>;

  /**
   * Async method to send password reset email.
   * @async
   * @param {string} email - Email address.
   * @param {Object} actionCodeSettings - Settings.
   * @returns {Promise<void>}
   */
  sendPasswordResetEmail(email: string, actionCodeSettings?: any): Promise<void>;

  /**
   * Verifies the password reset code sent on email.
   * @async
   * @param {string} code - Reset code.
   * @returns {Promise<string>} Username.
   */
  verifyPasswordResetCode(code: string): Promise<string>;

  /**
   * Completes the password reset process.
   * @async
   * @param {string} code - Reset code.
   * @param {string} newPassword - New password.
   * @returns {Promise<void>}
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /**
   * Changes the persistence state.
   * @async
   * @param {string} persistence - Persistence type.
   * @returns {Promise<void>}
   */
  setPersistence(persistence: string): Promise<void>;
}
