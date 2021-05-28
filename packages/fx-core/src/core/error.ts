// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "@microsoft/teamsfx-api";

export const CoreSource = "Core";

export enum CoreErrorNames {
  InvalidInput = "InvalidInput",
  ProjectFolderExist = "ProjectFolderExist",
  WriteFileError = "WriteFileError",
  ReadFileError = "ReadFileError",
  CallFuncRouteFailed = "CallFuncRouteFailed",
  getQuestionsForUserTaskRouteFailed = "getQuestionsForUserTaskRouteFailed",
  executeUserTaskRouteFailed = "executeUserTaskRouteFailed",
  InvalidContext = "InvalidContext",
  EnvAlreadyExist = "EnvAlreadyExist",
  EnvNotExist = "EnvNotExist",
  LoadSolutionFailed = "LoadSolutionFailed",
  FileNotFound = "FileNotFound",
  UncatchedError = "UncatchedError",
  NotSupportedProjectType = "NotSupportedProjectType",
  InitError = "InitError",
  DownloadSampleFail = "DownloadSampleFail",
  NoSubscriptionSelected = "NoSubscriptionSelected",
  NoneFxError = "NoneFxError"
}

export function InvalidContext(): UserError {
  return returnUserError(new Error("InvalidContext"), CoreSource, CoreErrorNames.InvalidContext);
}

export function WriteFileError(e: Error): SystemError {
  return returnSystemError(e, CoreSource, CoreErrorNames.WriteFileError);
}

export function ReadFileError(e: Error): SystemError {
  return returnSystemError(e, CoreSource, CoreErrorNames.ReadFileError);
}

export function EnvAlreadyExist(param: any): UserError {
  return returnUserError(
    new Error(`Environment already exists: ${param}`),
    CoreSource,
    CoreErrorNames.EnvAlreadyExist
  );
}
export function UncatchedError(error: Error): SystemError {
  return new SystemError( CoreErrorNames.UncatchedError,
    "Uncatched Error",
    CoreSource
  );
}
export function EnvNotExist(param: any): UserError {
  return returnUserError(
    new Error(`Environment does not exist: ${param}`),
    CoreSource,
    CoreErrorNames.EnvNotExist
  );
}

export const NoProjectOpenedError = new UserError(
  "NoProjectOpened",
  "No project opened, you can create a new project or open an existing one.",
  CoreSource
);

export const InvalidProjectError = new UserError(
  "InvalidProject",
  "The project type is invalid",
  CoreSource
);

export const ConcurrentError = new UserError(
  "ConcurrentOperation",
  "Concurrent operation",
  CoreSource
);

export const TaskNotSupportError = new SystemError("TaskNotSupport", "TaskNotSupport", CoreSource);

export const CreateContextError = new SystemError("CreateContextError","Failed to create SolutioContext",CoreSource);

export function DownloadSampleFail(): SystemError {
  return returnUserError(
    new Error("Failed to download sample app"),
    CoreSource,
    CoreErrorNames.DownloadSampleFail
  );
}
