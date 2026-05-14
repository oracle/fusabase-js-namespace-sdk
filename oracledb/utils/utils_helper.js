// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

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

import { escapeFieldName, identifyValueType, validateDenseVector, validateSparseEmbedding } from "./utils.js";
import { FieldValue } from "../field/value.js";
import { oracledbErrorHandler, errorMessages, formatMessage } from "../errors.js";
import { Timestamp } from "../types/timestamp.js";

/**
 * Used to create a array of tokens defining path.
 *
 * Used to divide individual path strings and make an array of individual 
 * tokens defining path.
 * @param {Array} arr - Array of varius path strings.
 * @returns {Array} Array of individual path tokens.
 */
function flattenArray(arr) {
  return arr.reduce((result, str) => {
    const parts = str.split('.');
    result.push(...parts);
    return result;
  }, []);
}

/**
 * Check if two json objects are equal.
 *
 * Does a deep equality check for two json objects.
 * @param {Object} a - First json object.
 * @param {Object} b - Second json object.
 * @returns {boolean} true if the two objects are equal otherwise false.
 */
function deepEqual(a, b) {
  // Check if both are strictly equal (covers NaN case)
  if (a === b) return true;

  // Check if both are not objects (also where a and b are null or undefined)
  if (typeof a !== 'object' || a === null ||
    typeof b !== 'object' || b === null) {
    return false;
  }

  // Check if both are arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    // Check if arrays have the same length
    if (a.length !== b.length) return false;
    // Check if elements in arrays are equal (using recursion)
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Check if both are objects
  if (!Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    // Check if objects have the same number of keys
    if (keysA.length !== keysB.length) return false;

    // Check if values for each key are equal (using recursion)
    for (let key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  // If one is an array and the other is not, they are not equal
  return false;
}

/**
 * Checks if FieldValue is present in the json object.
 *
 * Does a deep check if a FieldValue object is a part of key-value pair
 * in the given json object.
 * @param {Object} obj - Json object to check from.
 * @param {string} method - Method used for writing.
 * @returns {boolean} true if json object contains FieldValue otherwise false.
 * @throws {OracledbError} Throws error if method is 'set' and FieldValue is used.
 */
function checkForFieldValue(obj, method) {
  if (obj == null) {
    return false;
  }
  if (obj instanceof FieldValue) {
    if (obj.operation === "FieldValue:delete" && method === "set") {
      let error = new Error(formatMessage(errorMessages.deleteFieldNotAllowedInSet));
      error.status = 400;
      throw oracledbErrorHandler(error);
    }
    return true;
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (checkForFieldValue(obj[key], method)) {
          return true;
        }
      }
    }
  }
  return false;
}

function flattenUpdates(obj, prefix = "", result = {}) {
  let hasKeys = false;

  for (let key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    hasKeys = true;

    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof FieldValue) &&
      !(value instanceof Timestamp) &&
      !Array.isArray(value)
    ) {
      const beforeSize = Object.keys(result).length;
      flattenUpdates(value, path, result);

      // ✅ OBJECT WAS EMPTY → PRESERVE IT
      if (Object.keys(value).length === 0) {
        result[path] = {};
      }

    } else {
      // Primitive or FieldValue
      result[path] = value;
    }
  }

  // ✅ ROOT EMPTY OBJECT SUPPORT
  if (!hasKeys && prefix) {
    result[prefix] = {};
  }

  return result;
}


/**
 * Updates nested data in an object based on updates.
 *
 * @param {Object} oldData - The original data object.
 * @param {Object} updates - The updates to apply.
 * @returns {Object} The updated data object.
 */
function updateNestedData(query, oldData, updates) {
  let newData = JSON.parse(JSON.stringify(oldData));

  // Flatten nested updates first
  const flatUpdates = flattenUpdates(updates);

  for (let key in flatUpdates) {
    const value = flatUpdates[key];

    if (key.includes("$FieldPath$")) {
      key = key.substring(11);
      setNestedValue(query, newData, oldData, key.split("#FieldPath#"), value, true);
    } else {
      setNestedValue(query, newData, oldData, key.split("."), value, true);
    }
  }

  return newData;
}



/**
 * Sets whole data in an object based on updates.
 *
 * @param {Object} oldData - The original data object.
 * @param {Object} updates - The updates to apply.
 * @returns {Object} The updated data object.
 */
function setWholeData(query, oldData, updates, flag) {
  let newData = JSON.parse(JSON.stringify(oldData));

  const flatUpdates = flattenUpdates(updates);

  for (let key in flatUpdates) {
    const value = flatUpdates[key];

    if (key.includes("$FieldPath$")) {
      let key1 = key.split("$FieldPath$");
      let key2 = "";
      for (let k in key1) {
        key2 += key1[k];
      }
      setNestedValue(query, newData, oldData, key2.split("#FieldPath#"), value, flag);
    } else {
      setNestedValue(query, newData, oldData, key.split("."), value, flag);
    }
  }

  return newData;
}


/**
 * Sets a nested value in an object.
 *
 * @param {Object} obj - The object to update.
 * @param {Object} oldData - The original data.
 * @param {Array} pathArray - The path to the value.
 * @param {*} value - The value to set.
 */
function setNestedValue(query, obj, oldData, pathArray, value, flag) {
  let current = obj;
  let oldCurrent = oldData;

  for (let i = 0; i < pathArray.length - 1; i++) {
    const key = pathArray[i];

    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }

    if (!(key in oldCurrent) || typeof oldCurrent[key] !== "object") {
      oldCurrent[key] = {};
    }

    current = current[key];
    oldCurrent = oldCurrent[key];
  }

  const finalKey = pathArray[pathArray.length - 1];
  let existingValue = oldCurrent[finalKey];
  let sKey = finalKey;
  if (flag) {
    sKey = "";
    for (let i=0;i<pathArray.length-1;i++) {
      sKey += escapeFieldName(pathArray[i]);
      sKey += ".";
    }
    sKey += escapeFieldName(pathArray[pathArray.length-1]);
  }

  if (value instanceof FieldValue) {
    if (value.operation === "FieldValue:delete") {
      delete current[finalKey];
      return ;
    }
    if (flag && value.operation === "FieldValue:serverTimestamp") {
        query._serverTimestamp.push(sKey);
    } else {
        current[finalKey] = updateUsingFieldValue(finalKey, oldCurrent, value);
    }
    
  } else {
    current[finalKey] = value;
  }
}


/**
 * Gets the new value for FieldValue operation.
 *
 * Calculates the new value to be sent to server for some write using 
 * FieldValue.
 * @param {string} key - Json object to parse.
 * @param {Object} old_data - Current data before write.
 * @param {FieldValue} fieldvalue - FieldValue instance.
 * @returns {string|Array|null} Updated value.
 */
function updateUsingFieldValue(key, old_data, fieldvalue) {
  let new_value = null;
  let old_value = null;
  switch (fieldvalue.operation) {

    case "FieldValue:arrayRemove":
      if (!Array.isArray(old_data[key])) {
        return [];
      }
      new_value = [];
      old_value = old_data[key];
      try {
        for (let i = 0; i < old_value.length; i++) {
          if (!fieldvalue.value.includes(old_value[i])) {
            new_value.push(old_value[i]);
          }
        }
      } catch (e) {
        new_value = [];
      }

      break;

    case "FieldValue:arrayUnion":
      if (!Array.isArray(old_data[key] )) {
        new_value = fieldvalue.value;
        return new_value;
      }
      old_value = old_data[key];
      new_value = old_value;
      for (let i = 0; i < fieldvalue.value.length; i++) {
        if (!new_value.includes(fieldvalue.value[i])) {
          new_value.push(fieldvalue.value[i]);
        }
      }

      break;

    case "FieldValue:increment":
      if (!old_data[key] || !Number.isInteger(old_data[key])) {
        new_value = fieldvalue.value;
      } else {   
        new_value = old_data[key] + fieldvalue.value;
      }
      break;

    default:
      new_value = null;
  }
  return new_value;
}

function containsFieldValueDeep(obj) {
  if (obj instanceof FieldValue) return true;
  if (obj instanceof Timestamp) return false;
  if (Array.isArray(obj)) return false;
  if (obj === null || typeof obj !== "object") return false;

  for (const k of Object.keys(obj)) {
    if (containsFieldValueDeep(obj[k])) return true;
  }
  return false;
}

function isDenseEmbeddingObject(value) {
  return !!value && typeof value === "object" && value.type === "dense" && Array.isArray(value.values);
}

function isSparseEmbeddingObject(value) {
  return !!value && typeof value === "object" && value.type === "sparse";
}

function isEmbeddingInput(value) {
  return isDenseEmbeddingObject(value) || isSparseEmbeddingObject(value);
}

function extractEmbeddingOps(input) {
  const setMap = {};
  const deleteKeys = [];

  for (const key of Object.keys(input || {})) {
    const value = input[key];
    if (value instanceof FieldValue && value.operation === "FieldValue:deleteVector") {
      deleteKeys.push(key);
      continue;
    }
    if (isEmbeddingInput(value)) {
      if (isDenseEmbeddingObject(value)) {
        validateDenseVector(value.values, `Embedding '${key}.values' must be a numeric array.`);
      } else if (isSparseEmbeddingObject(value)) {
        validateSparseEmbedding(value);
      }
      setMap[key] = value;
    }
  }

  return { setMap, deleteKeys };
}

function extractEmbeddingsMapForCreate(input) {
  const { setMap, deleteKeys } = extractEmbeddingOps(input || {});
  if (deleteKeys.length > 0) {
    const error = new Error("deleteVector() is not supported in addDoc/set create payload. Use update/set merge contexts.");
    error.status = 400;
    throw oracledbErrorHandler(error);
  }
  return setMap;
}
/**
 * Creates payload for update version 2 new.
 *
 * @param {Object} input - The input data.
 * @param {string} [parentKey=''] - The parent key.
 * @returns {Array} The created payload.
 */
function createPayloadForUpdateVersion2New(
  query,
  input,
  merge,
  parentKey = ""
) {
  const result = [];
  if (parentKey === '') {
    const { setMap, deleteKeys } = extractEmbeddingOps(input || {});
    if (Object.keys(setMap).length > 0) {
      result.push({ field: "$embeddings", value: setMap, op: "set", valueType: "mapValue" });
    }
    if (deleteKeys.length > 0) {
      result.push({ field: "$embeddings", value: deleteKeys, op: "delete", valueType: "arrayValue" });
    }
    input = Object.fromEntries(
      Object.entries(input || {}).filter(([k, v]) => !(k in setMap) && !(v instanceof FieldValue && v.operation === "FieldValue:deleteVector"))
    );
  }
  const seenParents = new Set();

  function walk(obj, prefix) {
    for (const key1 of Object.keys(obj)) {
      let key = key1;
      const value = obj[key];

      let containFieldPath = key.includes("$FieldPath$");
      key = key.replace("$FieldPath$", "");

      const xx = key.split("#FieldPath#");
      let fullKey = "";

      for (let i = 0; i < xx.length - 1; i++) {
        fullKey += escapeFieldName(xx[i]) + ".";
      }

      fullKey += containFieldPath
        ? escapeFieldName(xx[xx.length - 1])
        : xx[xx.length - 1];

      fullKey = prefix ? `${prefix}.${fullKey}` : fullKey;
      const wrappedKey = fullKey;

      const isFirstLevel = prefix === parentKey;

      // --------------------------------------------------
      // CASE 1: Object (map)
      // --------------------------------------------------
      if (
        typeof value === "object" &&
        value !== null &&
        !(value instanceof FieldValue) &&
        !(value instanceof Timestamp) &&
        !Array.isArray(value)
      ) {
        const hasFieldValue = containsFieldValueDeep(value);

        // ✅ FIRST LEVEL + NO FIELDVALUE → PUSH WHOLE OBJECT
        if (isFirstLevel && !hasFieldValue) {
          result.push({
            field: wrappedKey,
            value,
            op: "set",
            valueType: "mapValue",
          });
          continue;
        }

        // ✅ FIRST LEVEL + HAS FIELDVALUE → EMPTY MAP ONCE
        if (isFirstLevel && hasFieldValue && !seenParents.has(fullKey)) {
          seenParents.add(fullKey);
          result.push({
            field: wrappedKey,
            value: {},
            op: "set",
            valueType: "mapValue",
          });
        }

        // Only recurse if FieldValue exists
        if (hasFieldValue) {
          walk(value, fullKey);
        }

        continue;
      }

      // --------------------------------------------------
      // CASE 2: FieldValue (separate)
      // --------------------------------------------------
      if (value instanceof FieldValue) {
        let op = value.operation.replace("FieldValue:", "").trim();
        let val = value.value;

        if (op === "serverTimestamp") op = "servertimestamp";

        if (op === "servertimestamp" && merge) {
          query._serverTimestamp.push(fullKey);
          continue;
        }

        if (op === "arrayUnion" || op === "arrayRemove") {
          if (!Array.isArray(val)) val = [val];
        }

        if (op === "delete") val = null;

        result.push({
          field: wrappedKey,
          value: val,
          op,
          valueType: identifyValueType(val),
        });

        continue;
      }

      // --------------------------------------------------
      // CASE 3: Primitive / Array
      // --------------------------------------------------
      result.push({
        field: wrappedKey,
        value,
        op: "set",
        valueType: identifyValueType(value),
      });
    }
  }

  walk(input, parentKey);
  return result;
}


function serializeVersion2(query, input, merge, parentKey = '') {
  const result = [];
  if (parentKey === '') {
    const { setMap, deleteKeys } = extractEmbeddingOps(input || {});
    if (Object.keys(setMap).length > 0) {
      result.push({ field: "$embeddings", value: setMap, op: "set", valueType: "mapValue" });
    }
    if (deleteKeys.length > 0) {
      result.push({ field: "$embeddings", value: deleteKeys, op: "delete", valueType: "arrayValue" });
    }
    input = Object.fromEntries(
      Object.entries(input || {}).filter(([k, v]) => !(k in setMap) && !(v instanceof FieldValue && v.operation === "FieldValue:deleteVector"))
    );
  }

  for (const key in input) {
    const value = input[key];
    let fullKey = parentKey ? `${parentKey}.${key}` : key;

    let containFieldPath = fullKey.includes("$FieldPath$");
    fullKey = fullKey.replace("$FieldPath$", "");
    let xx = fullKey.split("#FieldPath#");
    fullKey = "";
    for (let i = 0; i < xx.length - 1; i++) {
      fullKey += escapeFieldName(xx[i]) + ".";
    }
    if (containFieldPath) {
      fullKey += escapeFieldName(xx[xx.length - 1]);
    } else {
      fullKey += xx[xx.length - 1];
    }

    if (value === null) {
      result.push({
        field: fullKey,
        value: null,
        op: 'set',
        valueType: 'null'
      });
      continue;
    }

    if (value instanceof FieldValue) {
      let op = value.operation.replace('FieldValue:', '');
      if (op === "serverTimestamp") op = "servertimestamp";
      let val = value.value;
      if (op === "servertimestamp" && !merge) {
        query._serverTimestamp.push(fullKey);
      } else {
        if (op === 'arrayUnion' || op === 'arrayRemove') {
          if (!Array.isArray(val)) val = [val];
        }
        if (op === 'servertimestamp' || op === 'delete') val = null;

        result.push({
          field: fullKey,
          value: val,
          op,
          valueType: identifyValueType(val)
        });
      }

    } else if (value instanceof Timestamp) {
      let timestamp = value.toTimestampString();
      result.push({
        field: fullKey,
        value: timestamp,
        op: 'set',
        valueType: identifyValueType(timestamp)
      });
    } else if (typeof value === 'object' && !Array.isArray(value)) {
  
      if (Object.keys(value).length === 0) {
        result.push({
          field: fullKey,
          value: {},
          op: 'set',
          valueType: 'object'
        });
        continue;
      }

      const normalFields = {};
      const specialFields = [];

      for (const innerKey in value) {
        const innerValue = value[innerKey];
        if (innerValue instanceof FieldValue) {
          let op = innerValue.operation.replace('FieldValue:', '');
          let val = innerValue.value;

          if (op === 'arrayUnion' || op === 'arrayRemove') {
            if (!Array.isArray(val)) val = [val];
          }
          if (op === 'servertimestamp' || op === 'delete') val = null;

          specialFields.push({
            field: `${fullKey}.${innerKey}`,
            value: val,
            op,
            valueType: identifyValueType(val)
          });
        } else {
          normalFields[innerKey] = innerValue;
        }
      }

      if (Object.keys(normalFields).length > 0) {
        result.push({
          field: fullKey,
          value: normalFields,
          op: 'set',
          valueType: identifyValueType(normalFields)
        });
      }

      result.push(...specialFields);

    } else {
      result.push({
        field: fullKey,
        value,
        op: 'set',
        valueType: identifyValueType(value)
      });
    }
  }

  return result;
}



export {
  deepEqual,
  updateNestedData,
  setWholeData,
  createPayloadForUpdateVersion2New,
  serializeVersion2,
  extractEmbeddingsMapForCreate
}
