import type { App } from './app.js';

/** @internal */
export declare function fusabaseFetch(app: App | undefined, url: string, init: RequestInit): Promise<Response>;
