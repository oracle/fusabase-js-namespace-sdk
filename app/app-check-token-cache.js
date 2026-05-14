// Copyright (c) 2015, 2026, Oracle and/or its affiliates.
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 and Apache License 2.0.

const APP_CHECK_TOKEN_CACHE = new WeakMap();

/** @internal */
export function getCachedAppCheckToken(app) {
  return app ? APP_CHECK_TOKEN_CACHE.get(app) : undefined;
}

/** @internal */
export function setCachedAppCheckToken(app, token) {
  if (!app || typeof token !== "string" || !token) return;
  APP_CHECK_TOKEN_CACHE.set(app, token);
}

/** @internal */
export function clearCachedAppCheckToken(app) {
  if (!app) return;
  APP_CHECK_TOKEN_CACHE.delete(app);
}
