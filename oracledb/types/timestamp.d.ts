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

/**
 * Represents a point in time with seconds and nanoseconds precision.
 */
export class Timestamp {
  /**
   * Creates a new `Timestamp` instance.
   *
   * @param {number} seconds - The number of seconds since the Unix epoch.
   * Must be between -62135596800 and 253402300799 (0001-01-01T00:00:00Z 
   * to 9999-12-31T23:59:59Z inclusive).
   * @param {number} nanoseconds - Number of nanoseconds 
   * (between 0 and 999,999,999).
   */
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
  constructor(seconds: number, nanoseconds: number);

  /**
   * Gets the seconds part of the timestamp.
   *
   * @returns {number} The number of seconds since the Unix epoch.
   */
  /**
   * Gets the seconds part of the timestamp.
   *
   * @returns {number} The number of seconds since the Unix epoch.
   */
  readonly seconds: number;

  /**
   * Gets the nanoseconds part of the timestamp.
   *
   * @returns {number} The number of nanoseconds.
   */
  /**
   * Gets the nanoseconds part of the timestamp.
   *
   * @returns {number} The number of nanoseconds.
   */
  readonly nanoseconds: number;

  /**
   * Converts the timestamp to a JavaScript `Date` object.
   *
   * @returns {Date} JavaScript `Date` object representing the same time.
   */
  /**
   * Converts the timestamp to a JavaScript `Date` object.
   *
   * @returns {Date} JavaScript `Date` object representing the same time.
   */
  toDate(): Date;

  /**
   * Compares this `Timestamp` with another `Timestamp` instance.
   *
   * @param {Timestamp} other - Another `Timestamp` instance to compare.
   * @returns {boolean} `true` if both timestamps are equal, `false` otherwise.
   */
  /**
   * Compares this `Timestamp` with another `Timestamp` instance.
   *
   * @param {Timestamp} other - Another `Timestamp` instance to compare.
   * @returns {boolean} `true` if both timestamps are equal, `false` otherwise.
   * @throws {OracledbError} Throws an error if the provided object is not an instance 
   * of `Timestamp`.
   */
  isEqual(other: Timestamp): boolean;

  /**
   * Converts the `Timestamp` to milliseconds.
   *
   * @returns {number} The timestamp in milliseconds.
   */
  /**
   * Converts the `Timestamp` to milliseconds.
   *
   * @returns {number} The timestamp in milliseconds.
   */
  toMillis(): number;

  /**
   * Returns a string representation of the timestamp value.
   *
   * @returns {string} A string representation of the timestamp in the 
   * format `seconds.nanoseconds`.
   */
  /**
   * Returns a string representation of the timestamp value.
   *
   * @returns {string} A string representation of the timestamp in the 
   * format `seconds.nanoseconds`.
   */
  valueOf(): string;

  /**
   * Converts the `Timestamp` to an ISO 8601 string with microseconds precision.
   *
   * @returns {string} An ISO 8601 string representation of the `Timestamp` 
   * with microseconds precision.
   */
  toTimestampString(): string;

  /**
   * Returns a string representation of the `Timestamp`.
   *
   * @returns {string} A string representation of the `Timestamp`, formatted as
   *  an ISO 8601 string with microseconds.
   */
  toString(): string;

  toJSON(): string;

  /**
   * Creates a `Timestamp` from a JavaScript `Date` object.
   *
   * @param {Date} date - A valid JavaScript `Date` object.
   * @returns {Timestamp} A new `Timestamp` instance representing the same 
   * time as the `Date` object.
   */
  /**
   * Creates a `Timestamp` from a JavaScript `Date` object.
   *
   * @param {Date} date - A valid JavaScript `Date` object.
   * @returns {Timestamp} A new `Timestamp` instance representing the same 
   * time as the `Date` object.
   * @throws {OracledbError} Throws an error if an invalid date is provided.
   */
  static fromDate(date: Date): Timestamp;

  /**
   * Creates a `Timestamp` from milliseconds since the Unix epoch.
   *
   * @param {number} milliseconds - Milliseconds since the Unix epoch.
   * @returns {Timestamp} `Timestamp` instance representing the given input.
   */
  /**
   * Creates a `Timestamp` from milliseconds since the Unix epoch.
   *
   * @param {number} milliseconds - Milliseconds since the Unix epoch.
   * @returns {Timestamp} `Timestamp` instance representing the given input.
   * @throws {OracledbError} Throws an error if an invalid value is provided.
   */
  static fromMillis(milliseconds: number): Timestamp;

  /**
   * Returns the current time as a `Timestamp`.
   *
   * @returns {Timestamp} A `Timestamp` representing the current time.
   */
  /**
   * Returns the current time as a `Timestamp`.
   *
   * @returns {Timestamp} A `Timestamp` representing the current time.
   */
  static now(): Timestamp;

  /**
   * Parses an ISO 8601 string and converts it to a `Timestamp` instance.
   *
   * @param {string} timestampString - A valid ISO 8601 formatted string.
   * @returns {Timestamp} A `Timestamp` instance representing the time specified
   * by the string.
   * @throws {OracledbError} Throws an error if an invalid timestamp string is provided.
   */
  static fromTimestampString(str: string): Timestamp;
}
