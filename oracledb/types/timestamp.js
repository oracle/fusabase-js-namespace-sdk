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

import { argCheck, typeStrings } from "../utils/typecheck.js";
import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";

/**
 * Represents a point in time with seconds and nanoseconds precision.
 */
export class Timestamp {

  /**
  * @property 
  * (Private) Gets the seconds part of the timestamp.
  */
  #seconds;

  /**
  * @property 
  * (Private) Gets the nanoseconds part of the timestamp.
  */
  #nanoseconds;

  /**
   * Creates a new `Timestamp` instance.
   *
   * @param {number} seconds - The number of seconds since the Unix epoch.
   * Must be between -62135596800 and 253402300799 (0001-01-01T00:00:00Z 
   * to 9999-12-31T23:59:59Z inclusive).
   * @param {number} nanoseconds - Number of nanoseconds 
   * (between 0 and 999,999,999).
   * @throws {OracledbError} Throws an error if the provided seconds or 
   * nanoseconds are out of range.
   */
  constructor(seconds, nanoseconds) {

    argCheck(seconds, "Invalid seconds passed", true, [typeStrings.INT]);
    argCheck(nanoseconds, "Invalid nanoseconds passed", true,
      [typeStrings.INT]);

    if (seconds < -62135596800 || seconds > 253402300799) {
      let error = new Error(formatMessage(errorMessages.invalidSecondsRange));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    if (nanoseconds < 0 || nanoseconds >= 1e9) {
      let error = new Error(formatMessage(errorMessages.invalidNanosecondsRange));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }

    this.#seconds = seconds;
    this.#nanoseconds = nanoseconds;
  }

  /**
   * @property seconds
   * Gets the seconds part of the timestamp.
   *
   * @returns {number} The number of seconds since the Unix epoch.
   */
  get seconds() {
    return this.#seconds;
  }

  /**
   * @property nanoseconds
   * Gets the nanoseconds part of the timestamp.
   *
   * @returns {number} The number of nanoseconds.
   */
  get nanoseconds() {
    return this.#nanoseconds;
  }

  /**
   * @property {Function} toDate
   * Converts the timestamp to a JavaScript `Date` object.
   *
   * @returns {Date} JavaScript `Date` object representing the same time.
   */
  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }

  /**
   * @property {Function} isEqual
   * Compares this `Timestamp` with another `Timestamp` instance.
   *
   * @param {Timestamp} other - Another `Timestamp` instance to compare.
   * @returns {boolean} `true` if both timestamps are equal, `false` otherwise.
   * @throws {OracledbError} Throws an error if the provided object is not an instance 
   * of `Timestamp`.
   */
  isEqual(other) {
    if (!(other instanceof Timestamp)) {
      let error =
        new Error(formatMessage(errorMessages.notTimestampInstance));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return this.seconds === other.seconds &&
      this.nanoseconds === other.nanoseconds;
  }

  /**
   * @property {Function} toMillis
   * Converts the `Timestamp` to milliseconds.
   *
   * @returns {number} The timestamp in milliseconds.
   */
  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  /**
   * @property {Function} valueOf
   * Returns a string representation of the timestamp value.
   *
   * @returns {string} A string representation of the timestamp in the 
   * format `seconds.nanoseconds`.
   */
  valueOf() {
    const secondsString = this.seconds.toString().padStart(11, '0');
    const nanosecondsString = this.nanoseconds.toString().padStart(9, '0');
    return `${secondsString}.${nanosecondsString}`;
  }

  /**
   * @static
   * @property {Function} fromDate
   * Creates a `Timestamp` from a JavaScript `Date` object.
   *
   * @param {Date} date - A valid JavaScript `Date` object.
   * @returns {Timestamp} A new `Timestamp` instance representing the same 
   * time as the `Date` object.
   * @throws {OracledbError} Throws an error if an invalid date is provided.
   */
  // static fromDate(date) {
  //   argCheck(date, "Invalid date passed", true, [typeStrings.DATE]);
  //   const milliseconds = Date.UTC(
  //       date.getFullYear(), 
  //       date.getMonth(), 
  //       date.getDate(), 
  //       date.getHours(), 
  //       date.getMinutes(), 
  //       date.getSeconds(), 
  //       date.getMilliseconds()
  //   );
  //     const seconds = Math.floor(milliseconds / 1000);
  //     const nanoseconds = (milliseconds % 1000) * 1e6;
  //     return new Timestamp(seconds, nanoseconds);
  // }
  static fromDate(date) {
    argCheck(date, "Invalid date passed", true, [typeStrings.DATE]);
    const milliseconds = date.getTime(); // UTC milliseconds since epoch
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds % 1000) * 1e6;
    return new Timestamp(seconds, nanoseconds);
  }

  /**
   * @static
   * @property {Function} fromMillis
   * Creates a `Timestamp` from milliseconds since the Unix epoch.
   *
   * @param {number} milliseconds - Milliseconds since the Unix epoch.
   * @returns {Timestamp} `Timestamp` instance representing the given input.
   * @throws {OracledbError} Throws an error if an invalid value is provided.
   */
  static fromMillis(milliseconds) {
    argCheck(milliseconds, "Invalid milliseconds passed", true,
       [typeStrings.INT]);
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds % 1000) * 1e6;
    return new Timestamp(seconds, nanoseconds);
  }

  /**
   * @static
   * @property {Function} now
   * Returns the current time as a `Timestamp`.
   *
   * @returns {Timestamp} A `Timestamp` representing the current time.
   */
  static now() {
    const milliseconds = Date.now();
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds % 1000) * 1e6;
    return new Timestamp(seconds, nanoseconds);
  }

  /**
   * @property {Function} toTimestampString
   * Converts the `Timestamp` to an ISO 8601 string with microseconds precision.
   *
   * @returns {string} An ISO 8601 string representation of the `Timestamp` 
   * with microseconds precision.
   */
  toTimestampString() {
    const date = new Date(this.#seconds * 1000);
    const milliseconds = Math.floor(this.#nanoseconds / 1e6);
    const microseconds = Math.floor((this.#nanoseconds % 1e6) / 1e3);
    const dateString = date.toISOString().replace('Z', '');
    return `${dateString}${microseconds.toString().padStart(3, '0')}`;
  }

  /**
   * @static
   * @property {Function} fromTimestampString
   * Parses an ISO 8601 string and converts it to a `Timestamp` instance.
   *
   * @param {string} timestampString - A valid ISO 8601 formatted string.
   * @returns {Timestamp} A `Timestamp` instance representing the time specified
   * by the string.
   * @throws {OracledbError} Throws an error if an invalid timestamp string is provided.
   */
  static fromTimestampString(str) {
    argCheck(str, "Invalid timestamp string passed", true,
       [typeStrings.STRING]);
    // const date = new Date(str);
    // const seconds = Math.floor(date.getTime() / 1000);
    // const nanoseconds = (date.getTime() % 1000) * 1e6;
    // return new Timestamp(seconds, nanoseconds);
    const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/;
    const match = str.match(regex);
    if (!match) throw new Error(formatMessage(errorMessages.invalidTimestampString, str));

    const base = match[1];      // "2025-01-01T00:00:00"
    let fraction = match[2] || "0"; // e.g. "000000" (microseconds) or undefined

    // Pad to 6 digits (microseconds precision)
    fraction = fraction.padEnd(6, "0");

    // First 3 → ms, next 3 → extra µs
    const millis = parseInt(fraction.slice(0, 3), 10);
    const micros = parseInt(fraction.slice(3, 6), 10);

    // Build a Date in UTC using only milliseconds
    const date = new Date(base + "." + millis.toString().padStart(3, "0") + "Z");

    const seconds = Math.floor(date.getTime() / 1000);
    const nanoseconds = millis * 1e6 + micros * 1e3;

    return new Timestamp(seconds, nanoseconds);
  }

  /**
   * @property {Function} toString
   * Returns a string representation of the `Timestamp`.
   *
   * @returns {string} A string representation of the `Timestamp`, formatted as
   *  an ISO 8601 string with microseconds.
   */
  toString() {
    return this.toTimestampString();
  }

  toJSON() {
    return this.toString();
  }


}
