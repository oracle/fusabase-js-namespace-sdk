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
