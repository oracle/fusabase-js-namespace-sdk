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

import { Storage } from "./types/storage.js";
import { Reference } from "./types/ref.js";
import { ListResult } from "./types/list.js";
import { UploadTask, UploadTaskSnapshot } from "./types/upload.js";
import { TaskEvent, TaskState } from "./types/taskstate.js";
import {
  StorageError,
  StorageErrorCode,
  StorageErrorMessages,
  storageErrorHandler
} from "./errors.js";

function assertReference(ref) {
  if (!(ref instanceof Reference)) {
    const error = new Error(StorageErrorMessages.INVALID_REFERENCE_PATH);
    error.status = 400;
    throw storageErrorHandler(error);
  }
}

function validateMaxDownloadSizeBytes(maxDownloadSizeBytes) {
  if (maxDownloadSizeBytes == null) {
    return null;
  }

  if (!Number.isSafeInteger(maxDownloadSizeBytes) || maxDownloadSizeBytes <= 0) {
    const error = new Error(StorageErrorMessages.INVALID_MAX_DOWNLOAD_SIZE);
    error.status = 400;
    throw storageErrorHandler(error);
  }

  return maxDownloadSizeBytes;
}

async function validateMetadataDownloadSize(ref, maxDownloadSizeBytes) {
  if (maxDownloadSizeBytes == null) {
    return;
  }

  const metadata = await ref.getMetadata();
  const metadataSize = Number(metadata?.size);
  if (!Number.isFinite(metadataSize) || metadataSize < 0) {
    const error = new Error(StorageErrorMessages.INVALID_DOWNLOAD_METADATA_SIZE);
    error.status = 500;
    throw storageErrorHandler(error);
  }

  if (metadataSize > maxDownloadSizeBytes) {
    throw new StorageError(
      StorageErrorCode.DOWNLOAD_SIZE_EXCEEDED,
      StorageErrorMessages.DOWNLOAD_SIZE_EXCEEDED
    );
  }
}

/**
 * @module storage
 * @description Exports storage-related classes and constants.
 */
var storage = {
  Storage: Storage,
  Reference: Reference,
  ListResult: ListResult,
  UploadTask: UploadTask,
  UploadTaskSnapshot: UploadTaskSnapshot,
  TaskEvent: TaskEvent,
  TaskState: TaskState,
  StorageError: StorageError,
  StorageErrorCode:StorageErrorCode
};
export default storage;
