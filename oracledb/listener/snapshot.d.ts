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
 * Metadata about a snapshot, describing the state of the snapshot.
 */
export class SnapshotMetadata {
  /**
   * Creates a new SnapshotMetadata instance.
   *
   * @param fromCache True if the snapshot was created from cached data.
   * @param hasPendingWrites True if the snapshot includes local writes.
   */
  constructor(fromCache: boolean, hasPendingWrites: boolean);

  /** True if the snapshot contains the result of local writes that have not yet been committed to the backend. */
  readonly hasPendingWrites: boolean;

  /** True if the snapshot was created from cached data rather than guaranteed up-to-date server data. */
  readonly fromCache: boolean;

/**
 * Returns true if this `SnapshotMetadata` is equal to the provided one.
 *
 * @param other The `SnapshotMetadata` to compare against.
 * @return true if this `SnapshotMetadata` is equal to the provided one.
 * @throws {OracledbError} Throws an error if other is not a SnapshotMetadata instance.
 */
isEqual(other: SnapshotMetadata): boolean;
}
