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
      displayMessage: getLocalizedString("error.ProjectFolderExistError", path),
      source: CoreSource,
    });
  }
}

export class ProjectFolderInvalidError extends UserError {
  constructor(path: string) {
    super({
      message: getDefaultString("error.ProjectFolderInvalidError", path),
      displayMessage: getLocalizedString("error.ProjectFolderInvalidError", path),
      source: CoreSource,
    });
  }
}

export function WriteFileError(e: Error): SystemError {
  return new SystemError({
    message: "WriteFileError",
    source: CoreSource,
    error: e,
  });
}

export function ReadFileError(e: Error): SystemError {
  return new SystemError({
    message: "ReadFileError",
    source: CoreSource,
    error: e,
  });
}

export function CopyFileError(e: Error): SystemError {
  return new SystemError({
    message: "CopyFileError",
    source: CoreSource,
    error: e,
  });
}

export class NoProjectOpenedError extends UserError {
  constructor() {
    super({
      message: getDefaultString("error.NoProjectOpenedError"),
      displayMessage: getLocalizedString("error.NoProjectOpenedError"),
      source: CoreSource,
    });
  }
}

export class PathNotExistError extends UserError {
  constructor(path: string) {
    super({
      message: getDefaultString("error.PathNotExistError", path),
      displayMessage: getLocalizedString("error.PathNotExistError", path),
      source: CoreSource,
    });
  }
}

export class InvalidProjectError extends UserError {
  constructor(msg?: string) {
    super({
      message: getDefaultString("error.InvalidProjectError", msg || ""),
      displayMessage: getLocalizedString("error.InvalidProjectError", msg || ""),
      source: CoreSource,
    });
  }
}

export class InvalidProjectSettingsFileError extends UserError {
  constructor(msg?: string) {
    super({
      message: getDefaultString("error.InvalidProjectSettingsFileError", msg || ""),
      displayMessage: getLocalizedString("error.InvalidProjectSettingsFileError", msg || ""),
      source: CoreSource,
    });
  }
}

export class TaskNotSupportError extends SystemError {
  constructor(task: string) {
    super({
      message: getDefaultString("error.TaskNotSupportError", task),
      displayMessage: getLocalizedString("error.TaskNotSupportError", task),
      source: CoreSource,
    });
  }
}

export class FetchSampleError extends UserError {
  constructor(sampleId: string) {
    super({
      message: getDefaultString("error.FetchSampleError", sampleId),
      displayMessage: getLocalizedString("error.FetchSampleError", sampleId),
      source: CoreSource,
    });
  }
}

export function InvalidInputError(reason: string, inputs?: Inputs): UserError {
  const txt = inputs ? `${reason}, inputs: ${JSON.stringify(inputs)}` : reason;
  return new UserError(
    CoreSource,
    "InvalidInput",
    getDefaultString("error.InvalidInputError", txt),
    getLocalizedString("error.InvalidInputError", txt)
  );
}

export function FunctionRouterError(func: Func): UserError {
  const param = JSON.stringify(func);
  return new UserError(
    CoreSource,
    "FunctionRouterError",
    getDefaultString("error.FunctionRouterError", param),
    getLocalizedString("error.FunctionRouterError", param)
  );
}

export function ContextUpgradeError(error: any, isUserError = false): FxError {
  if (isUserError) {
    return new UserError({
      name: "ContextUpgradeError",
      message: getDefaultString("error.ContextUpgradeError", error.message),
      displayMessage: getLocalizedString("error.ContextUpgradeError", error.message),
      source: CoreSource,
    });
  } else {
    return new SystemError({
      name: "ContextUpgradeError",
      message: getDefaultString("error.ContextUpgradeError", error.message),
      displayMessage: getLocalizedString("error.ContextUpgradeError", error.message),
      source: CoreSource,
    });
  }
}

export function InvalidStateError(pluginName: string, state: Json): SystemError {
  return new SystemError(
    CoreSource,
    "InvalidProfileError",
    getDefaultString("error.InvalidProfileError", pluginName, JSON.stringify(state)),
    getLocalizedString("error.InvalidProfileError", pluginName, JSON.stringify(state))
  );
}

export function PluginHasNoTaskImpl(pluginName: string, task: string): SystemError {
  return new SystemError(
    CoreSource,
    "PluginHasNoTaskImplError",
    getDefaultString("error.PluginHasNoTaskImplError", pluginName, task),
    getLocalizedString("error.PluginHasNoTaskImplError", pluginName, task)
  );
}

export function ProjectSettingsUndefinedError(): SystemError {
  return new SystemError(
    CoreSource,
    "ProjectSettingsUndefinedError",
    getDefaultString("error.ProjectSettingsUndefinedError"),
    getLocalizedString("error.ProjectSettingsUndefinedError")
  );
}

export function MultipleEnvNotEnabledError(): SystemError {
  return new SystemError(
    CoreSource,
    "MultipleEnvNotEnabledError",
    getDefaultString("error.MultipleEnvNotEnabledError"),
    getLocalizedString("error.MultipleEnvNotEnabledError")
  );
}

export function ProjectEnvNotExistError(env: string): UserError {
  return new UserError(
    CoreSource,
    "ProjectEnvNotExistError",
    getDefaultString("error.ProjectEnvNotExistError", env, env),
    getLocalizedString("error.ProjectEnvNotExistError", env, env)
  );
}

export function InvalidEnvNameError(): UserError {
  return new UserError(
    CoreSource,
    "InvalidEnvNameError",
    getDefaultString("error.InvalidEnvNameError"),
    getLocalizedString("error.InvalidEnvNameError")
  );
}

export function ProjectEnvAlreadyExistError(env: string): FxError {
  return new UserError(
    CoreSource,
    "ProjectEnvAlreadyExistError",
    getDefaultString("error.ProjectEnvAlreadyExistError", env),
    getLocalizedString("error.ProjectEnvAlreadyExistError", env)
  );
}

export function InvalidEnvConfigError(env: string, errorMsg: string): UserError {
  const param1 = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, env);
  const param2 = errorMsg;
  return new UserError(
    CoreSource,
    "InvalidEnvConfigError",
    getDefaultString("error.InvalidEnvConfigError", param1, param2),
    getLocalizedString("error.InvalidEnvConfigError", param1, param2)
  );
}

export function NonExistEnvNameError(env: string): UserError {
  return new UserError(
    CoreSource,
    "NonExistEnvNameError",
    getDefaultString("error.NonExistEnvNameError", env),
    getLocalizedString("error.ProjectEnvAlreadyExistError", env)
  );
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
