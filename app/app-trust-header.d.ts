import type { App } from './app.js';

export declare const FUSABASE_APP_CHECK_HEADER = 'X-BAAS-AppCheck';
export declare const FUSABASE_INSTANCE_ID_HEADER = 'X-BAAS-InstanceId';


/** @internal */
export declare function shouldAttachAppCheckHeader(url: string): boolean;

/** @internal */
export declare function getAppCheckToken(app: App | undefined): string | undefined;

/** @internal */
export declare function getOrInitInstanceId(app: App | undefined): string | undefined;

/** @internal */
export declare function attachAppCheckHeader(app: App | undefined, url: string, init: RequestInit): RequestInit;
