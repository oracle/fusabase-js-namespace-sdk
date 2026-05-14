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

export const FUSABASE_INSTANCE_ID_STORAGE_KEY = 'fusabase_instance_id';

/** @internal */
export function generateInstanceId() {
  try {
    const c = globalThis.crypto;
    if (c?.randomUUID) return String(c.randomUUID());
  } catch {
    // ignore
  }

  return `fusabase_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** @internal */
export function getOrCreateBrowserInstanceId() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const existing = ls.getItem(FUSABASE_INSTANCE_ID_STORAGE_KEY);
      if (existing) return existing;
      const created = generateInstanceId();
      ls.setItem(FUSABASE_INSTANCE_ID_STORAGE_KEY, created);
      return created;
    }
  } catch {
    // ignore
  }

  return generateInstanceId();
}
