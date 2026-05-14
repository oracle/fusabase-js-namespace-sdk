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
