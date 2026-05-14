// Type declarations for taskstate.js

/**
 * TaskState - Enum representing the possible states of an upload task.
 * @enum {string}
 * @readonly
 *
 * @description
 * TaskState Changes:
 * - PAUSED -> RUNNING: ref.put() or uploadTask.resume()
 * - PAUSED -> CANCELED: uploadTask.cancel()
 * - PAUSED -> ERROR: Already went fetch() can return with ERROR
 * - PAUSED -> SUCCESS: Already went fetch() for final Chunk can return with SUCCESS
 * - RUNNING -> CANCELED: uploadTask.cancel()
 * - RUNNING -> ERROR: a fetch() can return ERROR
 * - RUNNING -> SUCCESS: final chunk returned SUCCESS
 * - RUNNING -> PAUSED: uploadTask.pause()
 * - CANCELED -> X: No Operation Allowed
 * - SUCCESS -> X: No Operation Allowed
 * - ERROR -> (handle different errors)
 */
export const TaskState: {
  /** The task has been canceled. */
  readonly CANCELED: 'canceled';
  /** The task encountered an error. */
  readonly ERROR: 'error';
  /** The task is paused. */
  readonly PAUSED: 'paused';
  /** The task is currently running. */
  readonly RUNNING: 'running';
  /** The task completed successfully. */
  readonly SUCCESS: 'success';
};

/**
 * TaskEvent - Enum representing task event names.
 * @enum {string}
 * @readonly
 */
export const TaskEvent: {
  /** Fired when the state of the task changes. */
  readonly STATE_CHANGED: 'state_changed';
};
