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

import { attachAppCheckHeader, shouldAttachAppCheckHeader, getAppCheckToken  } from './app-trust-header.js';
import { getToken } from '../app-trust/app-trust.js';

function includesAppCheckHint(text) {
  return String(text ?? '').toLowerCase().includes('appcheck');
}

/** @internal */
export async function fusabaseFetch(app, url, init) {
  const doFetch = (reqInit) => {
    return fetch(url, reqInit);
  }

  if (app && shouldAttachAppCheckHeader(url)) {
    const appCheckInstance = (app)?._appCheckInstance;
    const tok = getAppCheckToken(app);
    if (appCheckInstance && !tok) {
      try {
        await getToken(appCheckInstance, false);
      } catch {
      }
    }
  }


  if (app && shouldAttachAppCheckHeader(url)) {
    const appCheckInstance = (app)?._appCheckInstance;
    const tok = getAppCheckToken(app);
    if (appCheckInstance && !tok) {
      try {
        await getToken(appCheckInstance, false);
      } catch {
      }
    }
  }


  let reqInit = attachAppCheckHeader(app, url, init);
  let res = await doFetch(reqInit);

  if (!shouldAttachAppCheckHeader(url)) return res;
  if (res.status !== 401) return res;

  let bodyText = '';
  try {
    bodyText = await res.clone().text();
  } catch {
    // ignore
  }
  if (!bodyText || !includesAppCheckHint(bodyText)) return res;

  const appCheckInstance = app?._appCheckInstance;
  if (!appCheckInstance) return res;

  try {
    const { getToken } = await getToken(appCheckInstance, true);
  } catch {
    // If refresh fails, return original 403.
    return res;
  }

  reqInit = attachAppCheckHeader(app, url, init);
  res = await doFetch(reqInit);
  return res;
}
