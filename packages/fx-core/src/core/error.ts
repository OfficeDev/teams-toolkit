// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
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
export const UpgradeSource = "Upgrade";

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
    name: "WriteFileError",
    source: CoreSource,
    error: e,
  });
}

export function ReadFileError(e: Error): SystemError {
  return new SystemError({
    name: "ReadFileError",
    source: CoreSource,
    error: e,
  });
}

export function MigrationError(e: Error, name: string, helpLink?: string): UserError {
  return new UserError({
    name: name,
    source: UpgradeSource,
    error: e,
    // the link show to user will be helpLink+ # + source + name
    helpLink: helpLink,
  });
}

export function CopyFileError(e: Error): SystemError {
  return new SystemError({
    name: "CopyFileError",
    source: CoreSource,
    error: e,
  });
}

export class InitializedFileAlreadyExistError extends UserError {
  constructor(filePath: string) {
    super({
      message: getDefaultString("error.InitializedFileExistError", filePath),
      displayMessage: getLocalizedString("error.InitializedFileExistError", filePath),
      source: CoreSource,
    });
  }
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
    "PluginHasNoTaskImpl",
    getDefaultString("error.PluginHasNoTaskImpl", pluginName, task),
    getLocalizedString("error.PluginHasNoTaskImpl", pluginName, task)
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
    getLocalizedString("error.NonExistEnvNameError", env)
  );
}

export function ModifiedSecretError(): UserError {
  return new UserError(
    CoreSource,
    "ModifiedSecretError",
    getDefaultString("error.ModifiedSecretError"),
    getLocalizedString("error.ModifiedSecretError")
  );
}

export class LoadSolutionError extends SystemError {
  constructor() {
    super(
      CoreSource,
      new.target.name,
      getDefaultString("error.LoadSolutionError"),
      getLocalizedString("error.LoadSolutionError")
    );
  }
}

export class NotImplementedError extends SystemError {
  constructor(method: string) {
    super(
      CoreSource,
      new.target.name,
      getDefaultString("error.NotImplementedError", method),
      getLocalizedString("error.NotImplementedError", method)
    );
  }
}

export class ObjectIsUndefinedError extends SystemError {
  constructor(name: string) {
    super(
      CoreSource,
      new.target.name,
      getDefaultString("error.NotImplementedError", name),
      getLocalizedString("error.NotImplementedError", name)
    );
  }
}

export function SolutionConfigError(): UserError {
  return new UserError(
    CoreSource,
    "SolutionConfigError",
    getDefaultString("error.SolutionConfigError"),
    getLocalizedString("error.SolutionConfigError")
  );
}

export function ProjectSettingError(): UserError {
  return new UserError(
    CoreSource,
    "ProjectSettingError",
    getDefaultString("error.ProjectSettingError"),
    getLocalizedString("error.ProjectSettingError")
  );
}

export function UpgradeCanceledError(): UserError {
  return new UserError(
    CoreSource,
    "UserCancel", // @see tools.isUserCancelError()
    getDefaultString("error.UpgradeCanceledError"),
    getLocalizedString("error.UpgradeCanceledError")
  );
}

export function UpgradeV3CanceledError(): UserError {
  return new UserError(
    CoreSource,
    "UserCancel", // @see tools.isUserCancelError()
    getDefaultString("error.UpgradeV3CanceledError"),
    getLocalizedString("error.UpgradeV3CanceledError")
  );
}

export function ToolkitNotSupportError(): UserError {
  return new UserError(
    CoreSource,
    "ToolkitNotSupport",
    getDefaultString("core.migrationV3.CreateNewProject"),
    getLocalizedString("core.migrationV3.CreateNewProject")
  );
}

export function AbandonedProjectError(): UserError {
  return new UserError(
    CoreSource,
    "AbandonedProject",
    getDefaultString("core.migrationV3.abandonedProject"),
    getLocalizedString("core.migrationV3.abandonedProject")
  );
}

export function ConsolidateCanceledError(): UserError {
  return new UserError(
    CoreSource,
    // @see tools.isUserCancelError()
    "UserCancel",
    getDefaultString("error.ConsolidateCanceledError"),
    getLocalizedString("error.ConsolidateCanceledError")
  );
}

export function NotJsonError(err: Error): UserError {
  return new UserError({ error: err, source: CoreSource });
}

export function FailedToParseResourceIdError(name: string, resourceId: string): UserError {
  return new UserError(
    CoreSource,
    "FailedToParseResourceIdError",
    getDefaultString("error.FailedToParseResourceIdError", name, resourceId),
    getLocalizedString("error.FailedToParseResourceIdError", name, resourceId)
  );
}

export function SPFxConfigError(file: string): UserError {
  return new UserError(
    CoreSource,
    "SPFxConfigError",
    getDefaultString("error.SPFxConfigError", file),
    getLocalizedString("error.SPFxConfigError", file)
  );
}

export function NpmInstallError(path: string, e: Error): SystemError {
  return new SystemError({ error: e, source: CoreSource });
}

export function LoadPluginError(): SystemError {
  return new SystemError(
    CoreSource,
    "LoadPluginError",
    getDefaultString("error.LoadPluginError"),
    getLocalizedString("error.LoadPluginError")
  );
}

export class OperationNotPermittedError extends UserError {
  constructor(operation: string) {
    super(
      CoreSource,
      new.target.name,
      getDefaultString("error.OperationNotPermittedError", operation),
      getLocalizedString("error.OperationNotPermittedError", operation)
    );
  }
}

export class NoCapabilityFoundError extends UserError {
  constructor(operation: Stage) {
    super({
      source: CoreSource,
      message: getDefaultString("core.deploy.noCapabilityFound", operation),
      displayMessage: getLocalizedString("core.deploy.noCapabilityFound", operation),
    });
  }
}

export class VideoFilterAppRemoteNotSupportedError extends UserError {
  constructor() {
    super({
      source: CoreSource,
      name: VideoFilterAppRemoteNotSupportedError.name,
      message: getLocalizedString("error.VideoFilterAppNotRemoteSupported"),
      displayMessage: getLocalizedString("error.VideoFilterAppNotRemoteSupported"),
    });
  }
}

export class NotAllowedMigrationError extends UserError {
  constructor() {
    super({
      source: CoreSource,
      name: NotAllowedMigrationError.name,
      message: getLocalizedString("core.migrationV3.notAllowedMigration"),
      displayMessage: getLocalizedString("core.migrationV3.notAllowedMigration"),
    });
  }
}
