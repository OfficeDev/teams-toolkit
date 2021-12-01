// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  assembleError,
  Func,
  FxError,
  Inputs,
  SystemError,
  UserError,
  Json,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
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

export function ArchiveUserFileError(path: string, reason: string): UserError {
  return new UserError(
    "ArchiveUserFileError",
    `Failed to archive path '${path}'. ${reason}. You can refer to .archive.log which provides detailed information about the archive process.`,
    CoreSource
  );
}

export function ArchiveProjectError(reason: string): UserError {
  return new UserError(
    "ArchiveProjectError",
    `Failed to archive the project. ${reason}. You can refer to .archive.log which provides detailed information about the archive process.`,
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

export function V1ProjectNotSupportedError(message?: string) {
  return new UserError(
    "V1ProjectNotSupported",
    `Command is not supported in the project migrated from Teams Toolkit V1`,
    CoreSource
  );
}

export function PathNotExistError(path: string): UserError {
  return new UserError("PathNotExist", `The path not exist: ${path}`, CoreSource);
}

export function InvalidProjectError(msg?: string): UserError {
  return new UserError(
    "InvalidProject",
    `The command only works for project created by Teams Toolkit. ${msg ? ": " + msg : ""}`,
    CoreSource
  );
}

export function InvalidProjectSettingsFileError(msg?: string): UserError {
  return new UserError(
    "InvalidProjectSettingsFile",
    `The projectSettings.json file is corrupted.`,
    CoreSource
  );
}

export class TaskNotSupportError extends SystemError {
  constructor(task: string) {
    super(new.target.name, `Task is not supported yet: ${task}`, CoreSource);
  }
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

export function InvalidStateError(pluginName: string, state: Json): SystemError {
  return new SystemError(
    CoreSource,
    "InvalidProfileError",
    `Plugin ${pluginName}'s state(${JSON.stringify(state)}) is invalid`
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

export function MultipleEnvNotEnabledError(): SystemError {
  return new SystemError(
    "MultipleEnvNotEnabledError",
    "MultipleEnv feature is not enabled",
    CoreSource
  );
}

export function ProjectEnvNotExistError(env: string): UserError {
  return new UserError(
    "ProjectEnvNotExistError",
    `Environment ${env} not found. Make sure the config.${env}.json file exist.`,
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
    `The configuration ${EnvConfigFileNameTemplate.replace(
      EnvNamePlaceholder,
      env
    )} is invalid, details: ${errorMsg}.`,
    CoreSource
  );
}

export function NonExistEnvNameError(env: string): UserError {
  return new UserError("NonExistEnvNameError", `Can not find environment ${env}.`, CoreSource);
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

export function UpgradeCanceledError(): UserError {
  return new UserError(
    // @see tools.isUserCancelError()
    "UserCancel",
    "If you don't want to upgrade your project, please install another version of Teams Toolkit (version <= 2.10.0).",
    CoreSource
  );
}

export function NotJsonError(err: Error): UserError {
  return new UserError(err, CoreSource, "NotJsonError");
}

export function FailedToParseResourceIdError(name: string, resourceId: string): UserError {
  return new UserError(
    "FailedToParseResourceIdError",
    `Failed to get '${name}' from resource id: '${resourceId}'`,
    CoreSource
  );
}

export function SPFxConfigError(file: string): UserError {
  return new UserError("SPFxConfigError", `Load SPFx config ${file} failed.`, CoreSource);
}
