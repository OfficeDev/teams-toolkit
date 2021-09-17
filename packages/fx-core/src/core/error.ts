// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  assembleError,
  Func,
  FxError,
  Inputs,
  Stage,
  SystemError,
  UserError,
  Json,
} from "@microsoft/teamsfx-api";

export const CoreSource = "Core";

export function ProjectFolderExistError(path: string): UserError {
  return new UserError(
    "ProjectFolderExistError",
    `Path ${path} already exists. Select a different folder.`,
    CoreSource
  );
}

export function ProjectFolderNotExistError(path: string): UserError {
  return new UserError(
    "ProjectFolderNotExistError",
    `Path ${path} does not exist. Select a different folder.`,
    CoreSource
  );
}

export function EmptyProjectFolderError(): SystemError {
  return new SystemError("EmptyProjectFolderError", "Project path is empty", CoreSource);
}

export function MigrateNotImplementError(path: string): SystemError {
  return new SystemError(
    "MigrateNotImplemented",
    `Migrate V1 Project is not implemented.`,
    CoreSource
  );
}

export function WriteFileError(e: Error): SystemError {
  return new SystemError(e, CoreSource, "WriteFileError");
}

export function ReadFileError(e: Error): SystemError {
  return new SystemError(e, CoreSource, "ReadFileError");
}

export function CopyFileError(e: Error): SystemError {
  return new SystemError(e, CoreSource, "CopyFileError");
}

export function NoneFxError(e: any): FxError {
  const err = assembleError(e);
  err.name = "NoneFxError";
  return err;
}

export function NoProjectOpenedError(): UserError {
  return new UserError(
    "NoProjectOpened",
    "No project opened, you can create a new project or open an existing one.",
    CoreSource
  );
}

export function InvalidV1ProjectError(message?: string) {
  return new UserError(
    "InvalidV1Project",
    `The project is not a valid Teams Toolkit V1 project. ${message}`,
    CoreSource
  );
}

export function PathNotExistError(path: string): UserError {
  return new UserError("PathNotExist", `The path not exist: ${path}`, CoreSource);
}

export function InvalidProjectError(msg?: string): UserError {
  return new UserError(
    "InvalidProject",
    `The command only works for project created by Teamsfx Toolkit. ${msg ? ": " + msg : ""}`,
    CoreSource
  );
}

export class ConcurrentError extends UserError {
  constructor() {
    super(
      new.target.name,
      "Concurrent operation error, please wait until the running task finish or you can reload the window to cancel it.",
      CoreSource
    );
  }
}

export function InvalidProjectSettingsFileError(msg?: string): UserError {
  return new UserError(
    "InvalidProjectSettingsFile",
    `The projectSettings.json file is corrupted.`,
    CoreSource
  );
}

export function TaskNotSupportError(task: Stage | string): SystemError {
  return new SystemError("TaskNotSupport", `Task is not supported yet: ${task}`, CoreSource);
}

export function FetchSampleError(): UserError {
  return new UserError("FetchSampleError", "Failed to download sample app", CoreSource);
}

export function InvalidInputError(reason: string, inputs?: Inputs): UserError {
  return new UserError(
    "InvalidInput",
    inputs
      ? `Invalid inputs: ${reason}, inputs: ${JSON.stringify(inputs)}`
      : `Invalid inputs: ${reason}`,
    CoreSource
  );
}

export function FunctionRouterError(func: Func): UserError {
  return new UserError(
    "FunctionRouterError",
    `Failed to route function call:${JSON.stringify(func)}`,
    CoreSource
  );
}

export function ContextUpgradeError(error: any, isUserError = false): FxError {
  if (isUserError) {
    return new UserError(
      "ContextUpgradeError",
      `Failed to update context: ${error.message}`,
      CoreSource,
      undefined,
      error
    );
  } else {
    return new SystemError(
      "ContextUpgradeError",
      `Failed to update context: ${error.message}`,
      CoreSource,
      undefined,
      error
    );
  }
}

export function InvalidProfileError(pluginName: string, profile: Json): SystemError {
  return new SystemError(
    CoreSource,
    "InvalidProfileError",
    `Plugin ${pluginName}'s profile(${JSON.stringify(profile)}) is invalid`
  );
}

export function PluginHasNoTaskImpl(pluginName: string, task: string): SystemError {
  return new SystemError(
    "PluginHasNoTaskImplError",
    `Plugin ${pluginName} has not implemented method: ${task}`,
    CoreSource
  );
}

export function ProjectSettingsUndefinedError(): SystemError {
  return new SystemError(
    "ProjectSettingsUndefinedError",
    "Project settings is undefined",
    CoreSource
  );
}

export function ProjectEnvNotExistError(env: string): UserError {
  return new UserError(
    "ProjectEnvNotExistError",
    `Environment ${env} not found. Make sure the config.${env}.json exist.`,
    CoreSource
  );
}

export function InvalidEnvNameError(): UserError {
  return new UserError(
    "InvalidEnvNameError",
    `Environment name can only contain letters, digits, _ and -.`,
    CoreSource
  );
}

export function ProjectEnvAlreadyExistError(env: string): FxError {
  return new UserError(
    "ProjectEnvAlreadyExistError",
    `Project environment ${env} already exists.`,
    CoreSource
  );
}

export function InvalidEnvConfigError(env: string, errorMsg: string): UserError {
  return new UserError(
    "InvalidEnvConfigError",
    `The configuration config.${env}.json is invalid, details: ${errorMsg}.`,
    CoreSource
  );
}

export function NonExistEnvNameError(env: string): UserError {
  return new UserError("NonExistEnvNameError", `Can not find environment ${env}.`, CoreSource);
}

export function NonActiveEnvError(): UserError {
  return new UserError("NonActiveEnvError", `Can not find active environment.`, CoreSource);
}

export function ModifiedSecretError(): UserError {
  return new UserError("ModifiedSecretError", "The secret file has been changed.", CoreSource);
}

export class LoadSolutionError extends SystemError {
  constructor() {
    super(new.target.name, "Failed to load solution", CoreSource);
  }
}

export class NotImplementedError extends SystemError {
  constructor(method: string) {
    super(new.target.name, `Method not implemented:${method}`, CoreSource);
  }
}

export class ObjectIsUndefinedError extends SystemError {
  constructor(name: string) {
    super(new.target.name, `Object ${name} is undefined, which is not expected`, CoreSource);
  }
}

export function SolutionConfigError(): UserError {
  return new UserError("SolutionConfigError", "Load solution context failed.", CoreSource);
}

export function ProjectSettingError(): UserError {
  return new UserError("ProjectSettingError", "Load project settings failed.", CoreSource);
}
