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
 * OracledbErrorCode - Enum-like object containing oracledb error codes.
 * @enum {string}
 */
export const OracledbErrorCode = Object.freeze({
  INVALID_ARGUMENT: 'invalid-argument',
  UNAUTHENTICATED: 'unauthenticated',
  UNAUTHORIZED: 'permission-denied',
  INTERNAL_ERROR: 'internal',
  OBJECT_NOT_FOUND: 'not-found',
  NETWORK_ISSUE: 'network-error',
  UNKNOWN: 'unknown'
});

/**
 * Handles errors and converts them to OracledbError instances.
 * @param {Error} err - The error to handle.
 * @returns {OracledbError} A OracledbError instance representing the handled error.
 */
export function oracledbErrorHandler(err) {
  if (err instanceof OracledbError) {
    return err;
  }
  let code = null;
  if (err.status === 400)
    code = OracledbErrorCode.INVALID_ARGUMENT;
  else if (err.status === 401)
    code = OracledbErrorCode.UNAUTHENTICATED;
  else if (err.status === 404)
    code = OracledbErrorCode.OBJECT_NOT_FOUND;
  else if (err.status === 403)
    code = OracledbErrorCode.UNAUTHORIZED;
  else if (err.status === 500)
    code = OracledbErrorCode.INTERNAL_ERROR;
  else if (err.status == 408)
    code = OracledbErrorCode.NETWORK_ISSUE;
  else
    code = OracledbErrorCode.UNKNOWN;

  let error = new OracledbError(code, err.message, err.stack);

  return error;
}

/**
 * OracledbError - Class representing errors thrown by Oracledb Service.
 * @extends Error
 */
export class OracledbError extends Error {

  /**
   * @property {String} code
   * Oracledb Error Code
   */
  code = 'oracledb/'

  /**
   * Creates a new OracledbError.
   * @param {string} code - The error code (without the 'oracledb/' prefix).
   * @param {string} message - The error message.
   * @param {string} [stack] - The stack trace.
   */
  constructor(code, message, stack) {
    super(message);
    this.code = this.code + code;
    this.name = 'OracledbError';
    this.stack = stack;
  }
}

/**
 * Map of all hardcoded error messages.
 */
export const errorMessages = {
  deleteFieldNotAllowedInSet: 'Delete FieldValue is not allowed in set method.',
  serverTimestampNotSupported: 'FieldValue.serverTimestamp is not supported in oracledb version 1',
  valueCannotBeNull: 'Value cannot be null or undefined',
  NETWORK_ISSUE: 'Network issue.',
  expectedType: 'Expected one of {0} but got {1}',
  expectedInstance: 'Expected instance of {0} but got {1}',
  unknownError: 'Unknown',
  invalidSecondsRange: 'Seconds must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive.',
  invalidNanosecondsRange: 'Nanoseconds must be from 0 to 999,999,999 inclusive.',
  notTimestampInstance: 'The provided object must be an instance of Timestamp.',
  invalidTimestampString: 'Invalid timestamp string: {0}',
  transactionEnded: 'Transaction has ended!',
  invalidDocumentReference: 'Invalid document reference passed',
  notSnapshotMetadataInstance: 'The other instance to be compared should be an instance of SnapshotMetadata',
  cannotSetNullEntry: "Can't set null entry!",
  entryNotFound: 'Entry not found!',
  unsupportedBundleDataType: 'Supported data types for bundle load are ArrayBuffer, ReadableStream <Uint8Array> and string',
  documentDataNotPresent: 'Document data is not present.',
  unsupportedDataType: 'Unsupported data type',
  viewNameCannotBeEmpty: 'View name cannot be empty for a duality view collection!',
  incorrectDualityViewPath: 'Incorrect path for DualityView',
  docIdNotReturned: 'DocID not returned!',
  notDualityViewColReference: 'The other instance to be compared should be an instance of DualityViewColReference',
  pathAndParentCannotBeNull: 'Both path and parent cannot be null!',
  incorrectDualityViewDocId: 'Incorrect duality view document id!',
  parentCollectionCannotBeNull: "Parent Collection can't be null",
  incorrectDualityViewDocPath: 'Incorrect path for DuaityView document',
  notDualityViewDocReference: 'The other instance to be compared should be an instance of DualityViewDocReference',
  documentIdNotFound: 'DocumentID not found',
  errorFetchingDocumentUpdate: 'Error occured while fetching docunent during update.',
  noSuchDocument: 'No such doc exists!',
  unsubscribeCalled: 'Unsubscribe called!',
  notFieldPathInstance: 'The other instance to be compared should be a FieldPath.',
  notFieldValueInstance: 'The provided object must be an instance of FieldValue.',
  collectionPathCannotBeEmpty: 'Path cannot be empty for a collection!',
  incorrectCollectionPath: 'Incorrect path for Collection',
  notCollectionReference: 'The other instance to be compared should be an instance of CollectionReference',
  incorrectDocumentId: 'Incorrect document id!',
  notDocumentReference: 'The other instance to be compared should be an instance of DocumentReference',
  notQuerySnapshot: 'The other instance to be compared should be an instance of QuerySnapshot',
  documentDoesNotExist: 'Document does not exist!',
  notDocumentSnapshot: 'The other instance to be compared should be an instance of DocumentSnapshot',
  notAggregateField: 'The other instance to be compared should be an instance of AggregateField.',
  notAggregateQuery: 'The other instance to be compared should be an instance of AggregateQuery.',
  notAggregateQuerySnapshot: 'The other instance to be compared should be an instance of AggregateQuerySnapshot.',
  notQueryInstance: 'The other instance to be compared should be an instance of Query.',
  operationNotSupportedInNamedQuery: 'Operation is not supported in namedQuery',
  invalidArrayContainsCombination: "array-contains-any can't be used with array-contains.",
  incorrectComparisonOperator: 'Incorrect comparison operator',
  invalidDirection: 'Invalid direction.',
  invalidLimit: 'Invalid limit provided.',
  lastSnapshotNotFound: 'Could not locate last snapshot in indexed db'
};

/**
 * Formats a message template with provided arguments.
 * @param {string} template - The message template with {0}, {1}, etc. placeholders.
 * @param {...any} args - The values to insert into the template.
 * @returns {string} The formatted message.
 */
export function formatMessage(template, ...args) {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = args[parseInt(index, 10)];
    return value !== undefined ? value : match;
  });
}
