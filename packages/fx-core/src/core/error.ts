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
  Stage,
} from "@microsoft/teamsfx-api";
import { HelpLinks } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export const CoreSource = "Core";

export class ProjectFolderExistError extends UserError {
  constructor(path: string) {
    super({
      message: getDefaultString("error.ProjectFolderExistError", path),
      showMessage: getLocalizedString("error.ProjectFolderExistError", path),
      source: CoreSource,
    });
  }
}

export class ProjectFolderInvalidError extends UserError {
  constructor(path: string) {
    super(
      new.target.name,
      getDefaultString("error.ProjectFolderExistError", path),
      CoreSource,
      undefined,
      undefined,
      undefined,
      getLocalizedString("error.ProjectFolderInvalidError", path)
    );
  }
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

export class NoProjectOpenedError extends UserError {
  constructor() {
    super(new.target.name, getLocalizedString("error.NoProjectOpenedError"), CoreSource);
  }
}

export class PathNotExistError extends UserError {
  constructor(path: string) {
    super(new.target.name, getLocalizedString("error.PathNotExistError", path), CoreSource);
  }
}

export class InvalidProjectError extends UserError {
  constructor(msg?: string) {
    super(new.target.name, getLocalizedString("error.InvalidProjectError", msg || ""), CoreSource);
  }
}

export class InvalidProjectSettingsFileError extends UserError {
  constructor(msg?: string) {
    super(
      new.target.name,
      getLocalizedString("error.InvalidProjectSettingsFileError", msg || ""),
      CoreSource
    );
  }
}

export class TaskNotSupportError extends SystemError {
  constructor(task: string) {
    super(new.target.name, getLocalizedString("error.TaskNotSupportError", task), CoreSource);
  }
}

export class FetchSampleError extends UserError {
  constructor(sampleId: string) {
    super(new.target.name, getLocalizedString("error.FetchSampleError", sampleId), CoreSource);
  }
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
    getLocalizedString("error.ProjectEnvNotExistError", env, env),
    CoreSource
  );
}

export function InvalidEnvNameError(): UserError {
  return new UserError(
    "InvalidEnvNameError",
    getLocalizedString("error.InvalidEnvNameError"),
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
    getLocalizedString("error.UpgradeCanceledError"),
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

export function NpmInstallError(path: string, e: Error): SystemError {
  return new SystemError(e, CoreSource, "NpmInstallError");
}

export function LoadPluginError(): SystemError {
  return new SystemError("LoadPluginError", "Failed to load plugin", CoreSource);
}

export class OperationNotPermittedError extends UserError {
  constructor(operation: string) {
    super(
      new.target.name,
      getLocalizedString("error.OperationNotPermittedError", operation),
      CoreSource
    );
  }
}

export class NoCapabilityFoundError extends UserError {
  constructor(operation: Stage) {
    super(
      new.target.name,
      getLocalizedString("core.deploy.noCapabilityFound", operation),
      CoreSource,
      undefined,
      HelpLinks.HowToAddCapability
    );
  }
}
