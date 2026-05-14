import type { App } from '../app/app.js';
import type {
  AppCheck,
  AppCheckOptions,
  AppCheckTokenResult,
  AppCheckTokenListener,
  Unsubscribe,
} from './public-types.js';

export declare function initializeAppTrust(app: App | undefined, options: AppCheckOptions): AppCheck;

export declare function getToken(appCheckInstance: AppCheck, forceRefresh?: boolean): Promise<AppCheckTokenResult>;

export declare function onTokenChanged(appCheckInstance: AppCheck, observer: { next?: (value: AppCheckTokenResult) => void; error?: (err: Error) => void; complete?: () => void }): Unsubscribe;
export declare function onTokenChanged(
  appCheckInstance: AppCheck,
  onNext: (tokenResult: AppCheckTokenResult) => void,
  onError?: (error: Error) => void,
  onCompletion?: () => void
): Unsubscribe;

// Internal: listener type is exported from public-types for convenience
export type { AppCheckTokenListener };
