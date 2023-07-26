// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { FxError, Inputs, SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export const CoreSource = "Core";
export const UpgradeSource = "Upgrade";

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

export class NoProjectOpenedError extends UserError {
  constructor() {
    super({
      message: getDefaultString("error.NoProjectOpenedError"),
      displayMessage: getLocalizedString("error.NoProjectOpenedError"),
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

export function UpgradeV3CanceledError(): UserError {
  return new UserError(
    CoreSource,
    "UserCancel", // @see tools.isUserCancelError()
    getDefaultString("error.UpgradeV3CanceledError"),
    getLocalizedString("error.UpgradeV3CanceledError")
  );
}

export function IncompatibleProjectError(messageKey: string): UserError {
  return new UserError(
    CoreSource,
    "IncompatibleProject",
    getDefaultString(messageKey),
    getLocalizedString(messageKey)
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

export function FailedToParseResourceIdError(name: string, resourceId: string): UserError {
  return new UserError(
    CoreSource,
    "FailedToParseResourceIdError",
    getDefaultString("error.FailedToParseResourceIdError", name, resourceId),
    getLocalizedString("error.FailedToParseResourceIdError", name, resourceId)
  );
}

export function NpmInstallError(path: string, e: Error): SystemError {
  return new SystemError({ error: e, source: CoreSource });
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

export class FailedToLoadManifestId extends UserError {
  constructor(manifestPath: string) {
    super({
      source: CoreSource,
      name: FailedToLoadManifestId.name,
      message: getDefaultString("error.core.failedToLoadManifestId", manifestPath),
      displayMessage: getLocalizedString("error.core.failedToLoadManifestId", manifestPath),
    });
  }
}

export class AppIdNotExist extends UserError {
  constructor(appId: string) {
    super({
      source: CoreSource,
      name: AppIdNotExist.name,
      message: getDefaultString("error.core.appIdNotExist", appId),
      displayMessage: getLocalizedString("error.core.appIdNotExist", appId),
    });
  }
}
