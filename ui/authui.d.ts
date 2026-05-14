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
//

import { App } from "../app/app.js";
import { Auth } from "../auth/types/auth.js";

/**
 * Configuration options for AuthUI.
 */
interface AuthUIConfig {
  /**
   * Array of sign-in provider IDs.
   */
  signInOptions?: string[];
  /**
   * URL to redirect to after successful sign-in.
   */
  signInSuccessUrl?: string;
  /**
   * Callbacks for sign-in events.
   */
  callbacks?: {
    /**
     * Callback for successful sign-in.
     */
    signInSuccessWithAuthResult?: (result: any, redirectUrl?: string) => boolean;
  };
}

/**
 * AuthUI class for handling authentication UI.
 */
declare class AuthUI {
  /**
   * Creates a new AuthUI instance.
   * @param appOrConfig - App instance, Auth instance, or configuration object.
   */
  constructor(appOrConfig: App | Auth | any);

  /**
   * Starts the AuthUI in the specified container.
   * @param containerId - Container element or ID.
   * @param config - Configuration options.
   */
  start(containerId: string | HTMLElement, config?: AuthUIConfig): void;
}

declare const authUI: {
  AuthUI: typeof AuthUI;
};

export { authUI };
