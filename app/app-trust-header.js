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

import { getOrCreateBrowserInstanceId } from './instance-id.js';
import { getCachedAppTrustToken } from './app-trust-token-cache.js';

/**
 * HTTP header used to send an App Trust token to eligible Fusabase endpoints.
 *
 * @type {string}
 * @example
 * headers.set(FUSABASE_APP_TRUST_HEADER, appTrustToken);
 */
export const FUSABASE_APP_TRUST_HEADER = 'X-BAAS-AppCheck';

/**
 * HTTP header used to identify the calling app installation to App Trust.
 *
 * @type {string}
 * @example
 * headers.set(FUSABASE_INSTANCE_ID_HEADER, 'web|my-app|installationid');
 */
export const FUSABASE_INSTANCE_ID_HEADER = 'X-BAAS-InstanceId';

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getPathSegmentsAfterConfiguredHost(app, url) {
  const configuredHost = String(app?.options?.ordsHost ?? '').trim();
  if (!configuredHost) return null;

  let parsed;
  let expected;
  try {
    parsed = new URL(url);
    expected = new URL(configuredHost);
  } catch {
    return null;
  }

  const expectedPath = expected.pathname.endsWith('/') ? expected.pathname : `${expected.pathname}/`;
  if (parsed.origin !== expected.origin || !parsed.pathname.startsWith(expectedPath)) {
    return null;
  }

  return {
    parsed,
    segments: parsed.pathname
      .slice(expectedPath.length)
      .split('/')
      .filter((segment) => segment.length > 0),
  };
}

function getProjectSegment(segments) {
  if (segments[2] === 'idm') return segments[4];
  if (segments[3] === 'par') return segments[4];
  return segments[3];
}

function hasMatchingProject(segments, projectId) {
  const projectSegment = getProjectSegment(segments);
  return typeof projectSegment === 'string' &&
    decodePathSegment(projectSegment) === projectId;
}

function hasMatchingAppId(parsed, appId) {
  return parsed.searchParams.get('apiKey') === appId ||
    parsed.searchParams.get('appID') === appId ||
    parsed.searchParams.get('app_id') === appId;
}

function isAppTrustAttestEndpoint(segments, projectId) {
  return segments.length >= 5 &&
    segments[0] === '_' &&
    segments[1] === 'baas-services' &&
    segments[2] === 'appcheck' &&
    decodePathSegment(segments[3]) === projectId &&
    segments[4] === 'attest';
}

/**
 * Returns whether an App Trust header may be attached to a request.
 * A request must target this app's configured ORDS host, project, and app ID;
 * attestation requests are deliberately excluded.
 *
 * @param {object|undefined} app - The owning app instance.
 * @param {string} url - Absolute request URL to inspect.
 * @returns {boolean} `true` when App Trust headers are allowed for `url`.
 *
 * @example
 * if (shouldAttachAppTrustHeader(appInstance, requestUrl)) {
 *   // The request is eligible for App Trust headers.
 * }
 * @internal
 */
export function shouldAttachAppTrustHeader(app, url) {
  if (typeof url !== 'string') return false;

  const projectId = String(app?.options?.projectID ?? '').trim();
  const appId = String(app?.options?.appID ?? '').trim();
  if (!projectId || !appId) return false;

  const pathInfo = getPathSegmentsAfterConfiguredHost(app, url);
  if (!pathInfo) return false;

  const { parsed, segments } = pathInfo;
  if (segments[0] !== '_' || segments[1] !== 'baas-services') return false;
  if (isAppTrustAttestEndpoint(segments, projectId)) return false;
  if (!hasMatchingProject(segments, projectId)) return false;
  if (!hasMatchingAppId(parsed, appId)) return false;
  return true;
}

/**
 * Returns the best available App Trust token for an app.
 *
 * @param {object|undefined} app - The app whose configured,
 * cached, legacy, or persisted token is read.
 * @returns {string|undefined} The token, or `undefined` when none is present.
 *
 * @example
 * const token = getAppTrustToken(appInstance);
 * if (token) headers.set(FUSABASE_APP_TRUST_HEADER, token);
 * @internal
 */
export function getAppTrustToken(app) {
  if (!app) return undefined;
  const optTok = app?.options?.appTrustToken;
  if (typeof optTok === 'string' && optTok) return optTok;
  const cachedTok = getCachedAppTrustToken(app);
  if (typeof cachedTok === 'string' && cachedTok) return cachedTok;
  const legacyTok = app?._appTrustToken;
  if (typeof legacyTok === 'string' && legacyTok) return legacyTok;
  const persistedTok = app?._appTrustTokenPersisted;
  if (typeof persistedTok === 'string' && persistedTok) return persistedTok;
  return undefined;
}

/**
 * Returns request options with App Trust headers attached when the URL is
 * eligible. Existing App Trust and instance-ID headers are replaced.
 *
 * @param {object|undefined} app - The owning app instance.
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} [init] - Existing Fetch request options.
 * @returns {RequestInit|undefined} The original options for ineligible URLs,
 * or a copy containing the appropriate headers.
 *
 * @example
 * const init = attachAppTrustHeader(appInstance, requestUrl, { method: 'GET' });
 * const response = await fetch(requestUrl, init);
 * @internal
 */
export function attachAppTrustHeader(app, url, init) {
  if (!shouldAttachAppTrustHeader(app, url)) return init;

  const tok = getAppTrustToken(app);
  const instanceId = app?._instanceId;

  const existing = init?.headers ?? {};
  const headers = new Headers(existing);

  headers.delete(FUSABASE_APP_TRUST_HEADER);
  headers.delete(FUSABASE_INSTANCE_ID_HEADER);

  if (tok) headers.set(FUSABASE_APP_TRUST_HEADER, tok);
  if (instanceId) {
    const platform = String(app?.options?.appType ?? 'web').toLowerCase();
    const appId = String(app?.options?.appID ?? '').trim();
    const sanitizedInstanceId = String(instanceId).replace(/-/g, '');
    headers.set(FUSABASE_INSTANCE_ID_HEADER, `${platform}|${appId}|${sanitizedInstanceId}`);
  }

  return {
    ...init,
    headers,
  };
}
