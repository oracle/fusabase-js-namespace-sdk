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

import { attachAppTrustHeader, shouldAttachAppTrustHeader, getAppTrustToken } from './app-trust-header.js';
import { getToken } from '../app-trust/app-trust.js';

function includesAppTrustHint(text) {
  return String(text ?? '').toLowerCase().includes('appcheck');
}

/** @internal */
export async function fusabaseFetch(app, url, init) {
  const doFetch = (reqInit) => {
    return fetch(url, reqInit);
  }
  const shouldAttachHeaders = shouldAttachAppTrustHeader(app, url);

  if (app && shouldAttachHeaders) {
    const appTrustInstance = (app)?._appTrustInstance;
    const tok = getAppTrustToken(app);
    if (appTrustInstance && !tok) {
      try {
        await getToken(appTrustInstance, false);
      } catch {
      }
    }
  }

  let reqInit = attachAppTrustHeader(app, url, init);
  let res = await doFetch(reqInit);

  if (!shouldAttachHeaders) return res;
  if (res.status !== 401) return res;

  let bodyText = '';
  try {
    bodyText = await res.clone().text();
  } catch {
    // ignore
  }
  if (!bodyText || !includesAppTrustHint(bodyText)) return res;

  const appTrustInstance = app?._appTrustInstance;
  if (!appTrustInstance) return res;

  try {
    await getToken(appTrustInstance, true);
  } catch {
    // If refresh fails, return original 403.
    return res;
  }

  reqInit = attachAppTrustHeader(app, url, init);
  res = await doFetch(reqInit);
  return res;
}
