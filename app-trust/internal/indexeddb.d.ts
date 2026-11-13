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

/** Token record persisted locally by App Trust. @internal */
export type PersistedAppTrustToken = {
  /** Opaque App Trust token. */
  token: string;
  /** Cache expiry time in Unix milliseconds. */
  expireTimeMillis: number;
  /** Write time in Unix milliseconds. */
  updatedAtMillis: number;
};

/** @internal Reads a persisted token record. */
export declare function idbGetAppTrustToken(key: string): Promise<PersistedAppTrustToken | undefined>;
/** @internal Writes a persisted token record. */
export declare function idbSetAppTrustToken(key: string, value: PersistedAppTrustToken): Promise<void>;
/** @internal Deletes a persisted token record. */
export declare function idbRemoveAppTrustToken(key: string): Promise<void>;
