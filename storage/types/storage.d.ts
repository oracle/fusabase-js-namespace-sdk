import { App } from "../../app/app.js";
import { Reference } from "./ref.js";

/**
 * Storage - Represents the Storage service.
 */
export class Storage {
  /**
   * Maximum operation retry time in milliseconds.
   */
  maxOperationRetryTime: number;

  /**
   * Maximum upload retry time in milliseconds.
   */
  maxUploadRetryTime: number;

  /**
   * Maximum upload size in bytes.
   */
  maxUploadBytes: number;

  /**
   * Creates a new `Storage` instance.
   *
   * @param {App} app - ObaaS App instance.
   */
  constructor(app: App);

  /**
   * Returns the Fusabase App instance.
   *
   * @returns {App} Fusabase App.
   */
  get app(): App;

  /**
   * Sets the maximum operation retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxOperationRetryTime(t: number): void;

  /**
   * Sets the maximum upload retry time.
   *
   * @param {number} t - Time in milliseconds.
   */
  setMaxUploadRetryTime(t: number): void;

  /**
   * Returns a reference for a path.
   *
   * @param {string} [path=""] - Path.
   * @returns {Reference} Reference instance.
   */
  ref(path?: string): Reference;

  /**
   * Returns a reference for a URL.
   *
   * @param {string} url - URL.
   * @returns {Reference} Reference instance.
   */
  refFromURL(url: string): Reference;
}
