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

import { Timestamp } from "../types/timestamp.js";

/**
 * Convert all Timestamp instances to timestamp strings.
 *
 * Takes a json object and convert all the Timestamp class instances to 
 * server recognised timestamp strings.
 * @param {Object} obj - Json object.
 * @returns {Object} Parsed json object.
 */
export function parseTimestamp(obj) {
  if (obj == null) {
    return null;
  }
  if (obj instanceof Timestamp) {
    return obj.toTimestampString();
  } else if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => parseTimestamp(item));
    } else {
      const newObj = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = parseTimestamp(obj[key]);
        }
      }
      return newObj;
    }
  } else {
    return obj;  // Return the value if it's not an object or array
  }
}

/**
 * Parse all timestamp strings.
 *
 * Takes a json object and convert all the server timestamp strings to 
 * Timestamp class instances.
 * @param {Object} obj - Json object to parse.
 * @returns {Object} Parsed json object.
 */
export function parseTimeInDocument(obj) {
  if (obj == null) {
    return null;
  }
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;
  const timestampPattern1 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  if (typeof obj === 'string' && (timestampPattern.test(obj) || timestampPattern1.test(obj))) {
    return obj = Timestamp.fromTimestampString(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      // Duplicate array
      return obj.map((item, index) => parseTimeInDocument(item));
    } else {
      // Duplicate object
      const newObj = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = parseTimeInDocument(obj[key]);
        }
      }
      return newObj;
    }
  } else {
    return obj;
  }
}

export function convertToDateObject (dateStr) {
    const truncatedDateStr = dateStr.slice(0, 23) + 'Z';
    return new Date(truncatedDateStr);
}