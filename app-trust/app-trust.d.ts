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
import type { App } from '../app/app.js';
import type {
  AppTrust,
  AppTrustOptions,
  AppTrustTokenResult,
  AppTrustTokenListener,
  Unsubscribe,
} from './public-types.js';

export declare function initializeAppTrust(app: App | undefined, options: AppTrustOptions): AppTrust;

export declare function getToken(appTrustInstance: AppTrust, forceRefresh?: boolean): Promise<AppTrustTokenResult>;

export declare function onTokenChanged(appTrustInstance: AppTrust, observer: { next?: (value: AppTrustTokenResult) => void; error?: (err: Error) => void; complete?: () => void }): Unsubscribe;
export declare function onTokenChanged(
  appTrustInstance: AppTrust,
  onNext: (tokenResult: AppTrustTokenResult) => void,
  onError?: (error: Error) => void,
  onCompletion?: () => void
): Unsubscribe;

// Internal: listener type is exported from public-types for convenience
export type { AppTrustTokenListener };
