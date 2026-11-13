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
// 

import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";

/**
 * Metadata describing whether a snapshot came from cache and whether it
 * includes pending local writes.
 *
 * @example
 * if (snapshot.metadata.fromCache) console.log('Showing cached data');
 */
export class SnapshotMetadata {
  /**
   * Creates snapshot metadata.
   *
   * @param {boolean} frCache - Whether the snapshot was read from cache.
   * @param {boolean} pendingWrites - Whether local writes are pending.
   * @returns {SnapshotMetadata} The constructed metadata.
   * @example
   * const metadata = new SnapshotMetadata(true, false);
   */
  constructor(frCache, pendingWrites) {
    this.fromCache = frCache;
    this.hasPendingWrites = pendingWrites;
  }

  /**
   * Compares this metadata with another metadata instance.
   *
   * @param {SnapshotMetadata} other - Metadata to compare.
   * @returns {boolean} `true` when both flags match.
   * @throws {OracledbError} When `other` is not snapshot metadata.
   * @example
   * metadata.isEqual(new SnapshotMetadata(true, false));
   */
  isEqual(other) {
    if (!(other instanceof SnapshotMetadata)) {
      let error = new Error(formatMessage(errorMessages.notSnapshotMetadataInstance));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.fromCache === other.fromCache &&
      this.hasPendingWrites === other.hasPendingWrites;
  }
}
