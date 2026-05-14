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
// Type declarations for metadata types

/**
 * Settable metadata when uploading objects.
 * Only a limited subset of metadata is supported.
 * @public
 */
export type UploadMetadata = {
  /** MIME type of the object (e.g., "image/png"). */
  contentType?: string;
  /** Base64-encoded MD5 hash of the object contents. */
  md5Hash?: string;
};

/**
 * Complete metadata returned by storage operations such as getMetadata,
 * upload results, and task snapshots.
 * @public
 */
export type FullMetadata = {
  /** Storage bucket identifier containing the object. */
  bucket: string;
  /** Full path to the object within the bucket. */
  fullPath: string;
  /** Object name (last path segment). */
  name: string;
  /** Object size in bytes. */
  size: number;
  /** ISO 8601 UTC timestamp when the object was created. */
  timeCreated: string;
  /** ISO 8601 UTC timestamp when the object was last updated. */
  updated: string;
  /** MIME type of the object (e.g., "image/png"). */
  contentType?: string;
  /** Base64-encoded MD5 hash of the object contents. */
  md5Hash?: string;
};
