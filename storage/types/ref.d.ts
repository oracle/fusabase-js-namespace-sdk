// Type declarations for ref.js

import { ListResult } from './list';
import { UploadTask } from './upload';
import { UploadMetadata, FullMetadata } from './metadata';

/**
 * Reference - Class representing a reference to a storage object.
 */
export class Reference {
  /**
   * Creates a new `Reference` instance.
   *
   * @param {Object} storage - The storage instance.
   * @param {string} path - The path for the reference.
   * @param {Reference} [parent=null] - The parent reference.
   * @throws {StorageError} Throws an error if path is invalid.
   */
  constructor(storage: any, path: string, parent?: Reference | null);

  /**
   * Returns the bucket name.
   *
   * @returns {string} Bucket name.
   */
  readonly bucket: string;

  /**
   * Returns the full path for the Reference.
   *
   * @returns {string} Full path.
   */
  readonly fullPath: string;

  /**
   * The name of the reference.
   */
  readonly name: string;

  /**
   * The parent reference.
   */
  readonly parent: Reference | null;

  /**
   * The root reference.
   */
  readonly root: Reference;

  /**
   * Returns reference of a child of this reference.
   *
   * @param {string} path - The child path.
   * @returns {Reference} The child reference.
   * @throws {StorageError} Throws an error if path is invalid.
   */
  child(path: string): Reference;

  /**
   * Deletes the object at this reference.
   *
   * @returns {Promise<void>}
   * @throws {StorageError} Throws an error if deletion fails.
   */
  delete(): Promise<void>;

  /**
   * Lists all the files as reference in this with recurse as false.
   *
   * @param {Object} [options] - The list options.
   * @returns {Promise<ListResult>}
   * @throws {StorageError} Throws an error if listing fails or invalid options.
   */
  list(options?: { maxResults?: number; pageToken?: string }): Promise<ListResult>;

  /**
   * Lists all the files as reference in this with recurse as true.
   *
   * @returns {Promise<ListResult>}
   * @throws {StorageError} Throws an error if listing fails.
   */
  listAll(): Promise<ListResult>;

  /**
   * Returns Upload task object for the upload task.
   *
   * @param {Blob|ArrayBuffer|Uint8Array} data - The data to upload.
   * @param {UploadMetadata} [metadata] - The metadata.
   * @returns {UploadTask} Upload task instance.
   * @throws {StorageError} Throws an error if invalid data or metadata.
   */
  put(data: Blob | ArrayBuffer | Uint8Array, metadata?: UploadMetadata): UploadTask;

  /**
   * Gets download URL for this reference.
   *
   * @returns {Promise<string>} Download URL.
   * @throws {StorageError} Throws an error if fetching URL fails.
   */
  getDownloadURL(): Promise<string>;

  /**
   * Gets metadata for this reference.
   *
   * @returns {Promise<FullMetadata>} Metadata object.
   * @throws {StorageError} Throws an error if fetching metadata fails.
   */
  getMetadata(): Promise<FullMetadata>;
}
