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

import { AggregateField, AggregateQuery, AggregateQuerySnapshot } from "./collection/aggregate.js";
import { LoadBundleTask, LoadBundleTaskProgress } from "./internal/bundle.js";
import { Oracledb } from "./internal/core.js";
import { SnapshotMetadata } from "./listener/snapshot.js";
import { Timestamp } from "./types/timestamp.js";
import { FieldPath } from "./field/path.js";
import { FieldValue } from "./field/value.js";
import { CollectionReference } from "./collection/reference.js";
import { DocumentReference } from "./collection/reference.js";
import { DualityViewColReference, DualityViewDocReference } from "./dualityview/reference.js";
import { Query } from "./collection/query.js";
import { QuerySnapshot, DocumentSnapshot, QueryDocumentSnapshot } from "./collection/snapshot.js";
import { OracledbError, OracledbErrorCode } from "./errors.js";
import { Transaction, WriteBatch } from "./transaction/batch.js";
import { TaskState } from "./utils/utils.js";
import LogLevel from "../logger.js";

/**
 * @module oracledb
 * @description Exports oracledb-related classes and constants.
 */
const oracledb = {
  Timestamp: Timestamp,
  FieldValue: FieldValue,
  Oracledb: Oracledb,
  CollectionReference: CollectionReference,
  DocumentReference: DocumentReference,
  DualityViewColReference: DualityViewColReference,
  DualityViewDocReference: DualityViewDocReference,
  Query: Query,
  DocumentSnapshot: DocumentSnapshot,
  QuerySnapshot: QuerySnapshot,
  FieldPath: FieldPath,
  OracledbError: OracledbError,
  AggregateField: AggregateField,
  AggregateQuery: AggregateQuery,
  OracledbErrorCode: OracledbErrorCode,
  AggregateQuerySnapshot: AggregateQuerySnapshot,
  Transaction: Transaction,
  WriteBatch: WriteBatch,
  SnapshotMetadata: SnapshotMetadata,
  QueryDocumentSnapshot: QueryDocumentSnapshot,
  LoadBundleTask: LoadBundleTask,
  LoadBundleTaskProgress: LoadBundleTaskProgress,
  TaskState: TaskState,
  LogLevel: LogLevel
};

export default oracledb;
