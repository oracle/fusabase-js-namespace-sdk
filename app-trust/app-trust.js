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

import { FusabaseAppTrustError } from './errors.js';
import { fusabaseFetch } from '../app/fusabase-fetch.js';
import { clearCachedAppTrustToken, setCachedAppTrustToken } from '../app/app-trust-token-cache.js';
import { idbGetAppTrustToken, idbRemoveAppTrustToken, idbSetAppTrustToken } from './internal/indexeddb.js';
import { HCaptchaProvider, ReCaptchaEnterpriseProvider } from './public-types.js';

class AppTrustImpl {
  constructor(app) {
    this.app = app;
  }
  /** @type {any} */
  app;
}

/** @type {WeakMap<any, AppTrustImpl>} */
const APP_TRUST_INSTANCE = new WeakMap();
/** @type {WeakMap<AppTrustImpl, any>} */
const APP_TRUST_STATE = new WeakMap();

function getState(appTrustInstance) {
  const impl = /** @type {AppTrustImpl} */ (appTrustInstance);
  return impl ? APP_TRUST_STATE.get(impl) : undefined;
}

function assertProvider(provider) {
  if (provider?._getAttestationToken instanceof Function) {
    return provider;
  }
  throw new FusabaseAppTrustError('Unsupported provider.', { code: 'app-trust/unsupported-provider', status: 400 });
}

function providerKeyForWeb(platform, appId) {
  const normalizedPlatform = String(platform ?? '').trim().toLowerCase();
  const normalized = String(appId ?? '').trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new FusabaseAppTrustError(
      'Invalid appID: expected 32 hex characters (servlet requires provider in format <platform>|<appId>)',
      { status: 400, code: 'app-trust/invalid-appID' }
    );
  }
  return `${normalizedPlatform}|${normalized}`;
}

function buildAttestUrl(app) {
  const projectId = app?.options?.projectID;
  const apiKey = app?.options?.appID;
  const ordsHost = app?.options?.ordsHost;
  if (!ordsHost) throw new FusabaseAppTrustError('Missing ordsHost in app options', { status: 400, code: 'app-trust/missing-ordsHost' });
  if (!projectId) throw new FusabaseAppTrustError('Missing projectID in app options', { status: 400, code: 'app-trust/missing-projectID' });
  if (!apiKey) throw new FusabaseAppTrustError('Missing appID (used as apiKey) in app options', { status: 400, code: 'app-trust/missing-appID' });
  const base = ordsHost.endsWith('/') ? ordsHost.slice(0, -1) : ordsHost;
  return `${base}/_/baas-services/appcheck/${encodeURIComponent(projectId)}/attest?apiKey=${encodeURIComponent(apiKey)}`;
}

function siteKeyForAttestationRequest(provider) {
  if (provider instanceof HCaptchaProvider || provider instanceof ReCaptchaEnterpriseProvider) {
    return provider.siteKey;
  }
  return undefined;
}

function parseExpiresAtToMillis(expiresAt) {
  if (expiresAt) {
    // Keep signature for backward compatibility but do not rely on expiresAt.
    // (OpenAPI does not define it; token TTL is currently treated as a short-lived cache.)
  }
  return Date.now() + 5 * 60 * 1000;
}

function emit(state, token) {
  for (const cb of state.listeners) {
    try {
      cb(token);
    } catch {
      // ignore listener errors
    }
  }
}

function appTrustStorageKey(app) {
  const projectId = String(app?.options?.projectID ?? '').trim();
  const appId = String(app?.options?.appID ?? '').trim();
  return `${projectId}:${appId}`;
}

async function loadPersistedTokenIntoState(state) {
  const key = appTrustStorageKey(state.app);
  const persisted = await idbGetAppTrustToken(key);
  if (!persisted?.token) return;

  if (!persisted.expireTimeMillis || persisted.expireTimeMillis <= Date.now() + 5000) {
    await idbRemoveAppTrustToken(key);
    return;
  }

  const tokenResult = {
    token: persisted.token,
    expireTimeMillis: persisted.expireTimeMillis,
  };

  state.cachedToken = tokenResult;
  setCachedAppTrustToken(state.app, tokenResult.token);
}

export function initializeAppTrust(app, options) {
  if (!app) throw new FusabaseAppTrustError('App is required', { status: 400, code: 'app-trust/no-app' });
  if (APP_TRUST_INSTANCE.has(app)) {
    throw new FusabaseAppTrustError('App Trust already initialized for this app', {
      status: 400,
      code: 'app-trust/already-initialized',
    });
  }

  const instance = new AppTrustImpl(app);
  const provider = assertProvider(options?.provider);
  APP_TRUST_STATE.set(instance, {
    app,
    provider,
    listeners: new Set(),
  });
  APP_TRUST_INSTANCE.set(app, instance);
  clearCachedAppTrustToken(app);
  try {
    delete app._appTrustToken;
    delete app._appTrustTokenPersisted;
  } catch {
    // ignore
  }

  try {
    app._appTrustInstance = instance;
  } catch {
    // ignore
  }

  void loadPersistedTokenIntoState(getState(instance));
  return instance;
}

export async function getToken(appTrustInstance, forceRefresh = false) {
  const state = getState(appTrustInstance);
  if (!state) {
    throw new FusabaseAppTrustError('Invalid App Trust instance', { status: 400, code: 'app-trust/invalid-instance' });
  }

  if (!state.cachedToken) {
    await loadPersistedTokenIntoState(state);
  }

  if (!forceRefresh && state.cachedToken && state.cachedToken.expireTimeMillis > Date.now() + 5000) {
    return state.cachedToken;
  }

  if (state.inFlight) return state.inFlight;

  state.inFlight = (async () => {
    const action = 'attest';
    const attestationToken = await state.provider._getAttestationToken(action);

    const platform = String(state.app?.options?.appType ?? 'web').toLowerCase();
    const deviceInfo = {
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    const attestRequest = {
      provider: providerKeyForWeb(platform, state.app?.options?.appID ?? ''),
      attestationToken,
      action,
      deviceInfo,
    };
    const siteKey = siteKeyForAttestationRequest(state.provider);
    if (siteKey) {
      attestRequest.siteKey = siteKey;
    }
    const attestUrl = buildAttestUrl(state.app);
    const res = await fusabaseFetch(state.app, attestUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(attestRequest),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new FusabaseAppTrustError(`Attestation exchange failed (${res.status})`, {
        status: res.status,
        code: 'app-trust/attestation-exchange-failed',
        cause: text,
      });
    }

    const json = await res.json();
    if (!json?.attestToken) {
      throw new FusabaseAppTrustError('Attestation response missing attestToken', {
        status: 500,
        code: 'app-trust/invalid-attestation-response',
      });
    }

    const result = {
      token: json.attestToken,
      expireTimeMillis: parseExpiresAtToMillis(undefined),
    };

    state.cachedToken = result;
    setCachedAppTrustToken(state.app, result.token);

    try {
      const key = appTrustStorageKey(state.app);
      await idbSetAppTrustToken(key, {
        token: result.token,
        expireTimeMillis: result.expireTimeMillis,
        updatedAtMillis: Date.now(),
      });
    } catch {
      // ignore
    }

    emit(state, result);
    return result;
  })().finally(() => {
    state.inFlight = undefined;
  });

  return state.inFlight;
}

export function onTokenChanged(appTrustInstance, a, b, c) {
  const state = getState(appTrustInstance);
  if (!state) {
    throw new FusabaseAppTrustError('Invalid App Trust instance', { status: 400, code: 'app-trust/invalid-instance' });
  }

  const next = typeof a === 'function' ? a : a?.next;
  const error = typeof a === 'function' ? b : a?.error;
  const complete = typeof a === 'function' ? c : a?.complete;
  if (complete) {
    // unused
  }

  const listener = (t) => {
    try {
      next?.(t);
    } catch (e) {
      error?.(/** @type {Error} */ (e));
    }
  };
  state.listeners.add(listener);
  if (state.cachedToken) queueMicrotask(() => listener(state.cachedToken));
  return () => state.listeners.delete(listener);
}
