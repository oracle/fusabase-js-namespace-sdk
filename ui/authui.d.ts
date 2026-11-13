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
//

import { App } from "../app/app.js";
import { Auth } from "../auth/types/auth.js";
import { UserCredential } from "../auth/types/user.js";

/**
 * Options that control the provider controls and post-sign-in flow of an
 * `AuthUI` instance.
 */
export interface AuthUIConfig {
  /**
   * Provider IDs whose controls are displayed. Supported values are
   * `EmailAuthProvider.PROVIDER_ID`, `GoogleAuthProvider.PROVIDER_ID`,
   * `FacebookAuthProvider.PROVIDER_ID`, and `GithubAuthProvider.PROVIDER_ID`.
   *
   * When omitted or empty, no sign-in provider controls are shown.
   */
  signInOptions?: string[];
  /**
   * Browser URL to open after a successful sign-in. A `false` return from
   * `signInSuccessWithAuthResult` suppresses this redirect.
   */
  signInSuccessUrl?: string;
  /**
   * Callbacks invoked for authentication events.
   */
  callbacks?: {
    /**
     * Runs after a successful email/password or supported popup sign-in.
     * Return `false` to prevent the configured success redirect.
     *
     * @param result - Credentials for the authenticated user.
     * @param redirectUrl - The configured `signInSuccessUrl`, if any.
     * @returns Whether the UI may perform the configured redirect.
     */
    signInSuccessWithAuthResult?: (result: UserCredential, redirectUrl?: string) => boolean;
  };
}

/**
 * A browser-only, prebuilt authentication interface.
 *
 * Construct it with an initialized {@link App} or {@link Auth} service, then
 * call {@link AuthUI.start} to mount it. The UI supports email/password,
 * Google, Facebook, and GitHub authentication.
 *
 * @example
 * const ui = new authUI.AuthUI(app);
 * ui.start("#auth-container", {
 *   signInOptions: [auth.EmailAuthProvider.PROVIDER_ID]
 * });
 */
declare class AuthUI {
  /**
   * Creates an authentication UI bound to an initialized app or service.
   *
   * @param appOrConfig - The app or the authentication service it owns.
   */
  constructor(appOrConfig: App | Auth);

  /**
   * Mounts the UI in a CSS-selected container or an `HTMLElement`.
   *
   * An existing container contents are replaced. If configured, successful
   * sign-in invokes the callback before navigating to `signInSuccessUrl`.
   *
   * @param containerId - A CSS selector or container element.
   * @param config - Provider, callback, and redirect options.
   * @returns Nothing.
   * @throws {Error} If no matching container exists.
   *
   * @example
   * ui.start(document.querySelector("#auth-container")!, {
   *   signInOptions: [auth.GoogleAuthProvider.PROVIDER_ID],
   *   signInSuccessUrl: "/dashboard"
   * });
   */
  start(containerId: string | HTMLElement, config?: AuthUIConfig): void;
}

/**
 * Namespace containing optional Fusabase authentication UI components.
 */
declare const authUI: {
  AuthUI: typeof AuthUI;
};

export { authUI };
