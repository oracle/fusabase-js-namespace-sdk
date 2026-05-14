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

/** The token returned from an App Check provider. */
export interface AppCheckToken {
  token: string;
  expireTimeMillis: number;
}

/** Result returned by getToken(). */
export interface AppCheckTokenResult extends AppCheckToken {}

/** A listener that is called whenever the App Check token changes. */
export type AppCheckTokenListener = (token: AppCheckTokenResult) => void;

export type Unsubscribe = () => void;

export interface AppCheckOptions {
  provider: ReCaptchaV3Provider | ReCaptchaEnterpriseProvider | TurnstileProvider | HCaptchaProvider;
  isTokenAutoRefreshEnabled?: boolean;
  /** Optional action passed to the attestation provider. Defaults to `baas-attest`. */
  attestationAction?: string;
}

/** The App Check service interface. */
export interface AppCheck {
  readonly app: App;
}

/** Minimal app-like type accepted by this module. */
export type FusabaseApp = App;

export declare class ReCaptchaV3Provider {
  readonly siteKey: string;
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

export declare class ReCaptchaEnterpriseProvider {
  readonly siteKey: string;
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

export declare class TurnstileProvider {
  readonly siteKey: string;
  readonly options?: { action?: string; cData?: string };
  constructor(siteKey: string, options?: { action?: string; cData?: string });
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

/** @deprecated Use {@link TurnstileProvider}. */
export declare class CloudflareTurnstileProvider extends TurnstileProvider {}

export declare class HCaptchaProvider {
  readonly siteKey: string;
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}
