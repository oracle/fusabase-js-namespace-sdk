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

const APP_TRUST_TOKEN_CACHE = new WeakMap();

/**
 * Gets the in-memory App Trust token cached for an app instance.
 *
 * @param {object|undefined} app - The app used as the cache key.
 * @returns {string|undefined} The cached token, or `undefined` when absent.
 *
 * @example
 * const token = getCachedAppTrustToken(appInstance);
 * @internal
 */
export function getCachedAppTrustToken(app) {
  return app ? APP_TRUST_TOKEN_CACHE.get(app) : undefined;
}

/**
 * Caches a non-empty App Trust token for an app instance.
 *
 * @param {object|undefined} app - The app used as the cache key.
 * @param {string} token - The non-empty token to cache.
 * @returns {void} This function does not return a value.
 *
 * @example
 * setCachedAppTrustToken(appInstance, token);
 * @internal
 */
export function setCachedAppTrustToken(app, token) {
  if (!app || typeof token !== "string" || !token) return;
  APP_TRUST_TOKEN_CACHE.set(app, token);
}

/**
 * Removes the in-memory App Trust token for an app instance.
 *
 * @param {object|undefined} app - The app whose cached token is removed.
 * @returns {void} This function does not return a value.
 *
 * @example
 * clearCachedAppTrustToken(appInstance);
 * @internal
 */
export function clearCachedAppTrustToken(app) {
  if (!app) return;
  APP_TRUST_TOKEN_CACHE.delete(app);
}
