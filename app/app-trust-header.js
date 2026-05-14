// Copyright (c) 2015, 2026, Oracle and/or its affiliates.
//
//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
//-----------------------------------------------------------------------------

import { getOrCreateBrowserInstanceId } from './instance-id.js';
import { getCachedAppCheckToken } from './app-check-token-cache.js';

export const FUSABASE_APP_CHECK_HEADER = 'X-BAAS-AppCheck';
export const FUSABASE_INSTANCE_ID_HEADER = 'X-BAAS-InstanceId';

function isAppCheckAttestEndpoint(url) {
  return typeof url === 'string' && /\/_\/baas-services\/appcheck\/[^/]+\/attest(\?|$)/.test(url);
}

/** @internal */
export function shouldAttachAppCheckHeader(url) {
  if (typeof url !== 'string' || !url.includes('/_/baas-services/')) return false;
  if (isAppCheckAttestEndpoint(url)) return false;
  return true;
}

/** @internal */
export function getAppCheckToken(app) {
  if (!app) return undefined;
  const optTok = app?.options?.appCheckToken;
  if (typeof optTok === 'string' && optTok) return optTok;
  const cachedTok = getCachedAppCheckToken(app);
  if (typeof cachedTok === 'string' && cachedTok) return cachedTok;
  return undefined;
}

/** @internal */
export function attachAppCheckHeader(app, url, init) {
  if (!shouldAttachAppCheckHeader(url)) return init;

  const tok = getAppCheckToken(app);
  const instanceId = app?._instanceId;
  if (!tok && !instanceId) return init;

  const existing = init?.headers ?? {};
  const headers = new Headers(existing);

  if (!headers.has(FUSABASE_APP_CHECK_HEADER)) {
    if (tok) headers.set(FUSABASE_APP_CHECK_HEADER, tok);
  }
  if (!headers.has(FUSABASE_INSTANCE_ID_HEADER)) {
    if (instanceId) {
      const platform = String(app?.options?.appType ?? 'web').toLowerCase();
      const appId = String(app?.options?.appID ?? '').trim();
      const sanitizedInstanceId = String(instanceId).replace(/-/g, '');
      headers.set(FUSABASE_INSTANCE_ID_HEADER, `${platform}|${appId}|${sanitizedInstanceId}`);
    }
  }

  return {
    ...init,
    headers,
  };
}
