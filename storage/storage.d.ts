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

import { Storage } from "./types/storage";
import { Reference } from "./types/ref";
import { ListResult } from "./types/list";
import { UploadTask, UploadTaskSnapshot } from "./types/upload";
import { TaskEvent, TaskState } from "./types/taskstate";
import { StorageError, StorageErrorCode } from "./errors";

/**
 * @module storage
 * @description Exports storage-related classes and constants.
 */
declare const storage: {
  Storage: typeof Storage;
  Reference: typeof Reference;
  ListResult: typeof ListResult;
  UploadTask: typeof UploadTask;
  UploadTaskSnapshot: typeof UploadTaskSnapshot;
  TaskEvent: typeof TaskEvent;
  TaskState: typeof TaskState;
  StorageError: typeof StorageError;
  StorageErrorCode: typeof StorageErrorCode;
};
export default storage;
