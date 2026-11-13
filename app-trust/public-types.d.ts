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

/**
 * App Trust token data returned by an attestation exchange.
 *
 * @example
 * const { token, expireTimeMillis } = await getToken(appTrust);
 */
export interface AppTrustToken {
  /** Opaque token sent to eligible Fusabase endpoints. */
  token: string;
  /** Time after which the SDK refreshes the cached token, in Unix milliseconds. */
  expireTimeMillis: number;
}

/** Result returned by {@link getToken}. */
export interface AppTrustTokenResult extends AppTrustToken {}

/** A listener called whenever App Trust obtains a new token. */
export type AppTrustTokenListener = (token: AppTrustTokenResult) => void;

/** Removes a registered listener and returns whether it was removed. */
export type Unsubscribe = () => boolean;

/** Options used to initialize App Trust. */
export interface AppTrustOptions {
  /** Provider used to obtain an attestation token in the browser. */
  provider: ReCaptchaV3Provider | ReCaptchaEnterpriseProvider | TurnstileProvider | HCaptchaProvider;
  /** Reserved for compatibility; automatic refresh is not scheduled by this SDK. */
  isTokenAutoRefreshEnabled?: boolean;
  /** Reserved for compatibility; the current attestation action is always `attest`. */
  attestationAction?: string;
}

/** App Trust instance returned by {@link initializeAppTrust}. */
export interface AppTrust {
  /** Fusabase app that owns this instance. */
  readonly app: App;
}

/** Fusabase app type accepted by App Trust APIs. */
export type FusabaseApp = App;

/** Browser-only provider backed by Google reCAPTCHA v3. */
export declare class ReCaptchaV3Provider {
  /** reCAPTCHA v3 site key. */
  readonly siteKey: string;
  /** @param siteKey reCAPTCHA v3 site key. */
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

/** Browser-only provider backed by Google reCAPTCHA Enterprise. */
export declare class ReCaptchaEnterpriseProvider {
  /** reCAPTCHA Enterprise site key. */
  readonly siteKey: string;
  /** @param siteKey reCAPTCHA Enterprise site key. */
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

/** Browser-only provider backed by Cloudflare Turnstile. */
export declare class TurnstileProvider {
  /** Turnstile site key. */
  readonly siteKey: string;
  /** Optional Turnstile action and customer data. */
  readonly options?: { action?: string; cData?: string };
  /** @param siteKey Turnstile site key. @param options Optional provider options. */
  constructor(siteKey: string, options?: { action?: string; cData?: string });
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}

/** Backward-compatible alias. @deprecated Use {@link TurnstileProvider}. */
export declare class CloudflareTurnstileProvider extends TurnstileProvider {}

/** Browser-only provider backed by hCaptcha. */
export declare class HCaptchaProvider {
  /** hCaptcha site key. */
  readonly siteKey: string;
  /** @param siteKey hCaptcha site key. */
  constructor(siteKey: string);
  /** @internal */
  _getAttestationToken(action: string): Promise<string>;
}
