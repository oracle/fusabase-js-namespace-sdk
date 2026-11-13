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


/**
 * Returns an encoded browser-storage namespace for one logical Fusabase app.
 *
 * The scope includes the app name and authentication context so same-origin
 * named apps cannot read each other's persisted SDK data.
 *
 * @param {object} app - Initialized Fusabase app.
 * @returns {string} A browser-storage-safe app namespace.
 * @internal
 */
export function getAppStorageScope(app) {
  const scope = {
    name: String(app?.name ?? "[DEFAULT]"),
    ordsHost: String(app?.options?.ordsHost ?? ""),
    projectID: String(app?.options?.projectID ?? ""),
    appID: String(app?.options?.appID ?? ""),
    authID: String(app?.options?.authID ?? ""),
    authType: String(app?.options?.authType ?? "")
  };
  return `__FUSABASE_${encodeURIComponent(JSON.stringify(scope))}`;
}

/**
 * Builds a namespaced browser-storage key for an initialized app.
 *
 * @param {object} app - Initialized Fusabase app.
 * @param {string} name - Storage item name within the app namespace.
 * @returns {string} Scoped storage key.
 * @internal
 */
export function getAppStorageKey(app, name) {
  return `${getAppStorageScope(app)}:${name}`;
}
