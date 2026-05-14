// Type declarations for errors.js

/**
 * StorageErrorCode - Enum-like object containing storage error codes.
 * @enum {string}
 */
export const StorageErrorCode: {
  readonly INVALID_ARGUMENT: 'invalid-argument';
  readonly UNAUTHENTICATED: 'unauthenticated';
  readonly UNAUTHORIZED: 'permission-denied';
  readonly INTERNAL_ERROR: 'internal';
  readonly CANCELED: 'aborted';
  readonly NOT_IMPLEMENTED: 'not-implemented';
  readonly OBJECT_NOT_FOUND: 'not-found';
  readonly DOWNLOAD_SIZE_EXCEEDED: 'download-size-exceeded';
  readonly NETWORK_ISSUE: 'network-error';
  readonly UNKNOWN: 'unknown';
};

/**
 * StorageError - Class representing errors thrown by Fusabase Storage Service.
 * @extends Error
 */
export class StorageError extends Error {
  /**
   * Creates a new StorageError.
   * @param {string} code - The error code (without the 'storage/' prefix).
   * @param {string} message - The error message.
   * @param {string} [stack] - The stack trace.
   */
  constructor(code: string, message: string, stack?: string);
  readonly code: string;
  readonly customData: { serverResponse: string };
}
