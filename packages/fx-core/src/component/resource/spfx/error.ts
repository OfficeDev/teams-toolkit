// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./utils/constants";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export function ScaffoldError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return new SystemError({
      error: error,
      source: Constants.PLUGIN_NAME,
      name: "SPFxScaffoldError",
    });
  }
}

export function NoSPPackageError(distFolder: string): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    "NoSharePointPackage",
    getDefaultString("plugins.spfx.cannotFindPackage", distFolder),
    getLocalizedString("plugins.spfx.cannotFindPackage", distFolder)
  );
}

export function BuildSPPackageError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return new UserError({ error, source: Constants.PLUGIN_NAME, name: "BuildSPFxPackageFail" });
  }
}

export function NoManifestFileError(distFolder: string): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    "NoManifestFile",
    getDefaultString("plugins.spfx.cannotFindManifest", distFolder),
    getLocalizedString("plugins.spfx.cannotFindManifest", distFolder)
  );
}

export function GetSPOTokenFailedError(): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "GetSPOTokenFailed",
    getDefaultString("plugins.spfx.cannotGetSPOToken"),
    getLocalizedString("plugins.spfx.cannotGetSPOToken")
  );
}

export function GetGraphTokenFailedError(): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "GetGraphTokenFailed",
    getDefaultString("plugins.spfx.cannotGetGraphToken"),
    getLocalizedString("plugins.spfx.cannotGetGraphToken")
  );
}

export function InsufficientPermissionError(appCatalog: string): UserError {
  return new UserError(
    Constants.PLUGIN_NAME,
    "InsufficientPermission",
    getDefaultString("plugins.spfx.insufficientPermission", appCatalog),
    getLocalizedString("plugins.spfx.insufficientPermission", appCatalog)
  );
}

export function CreateAppCatalogFailedError(error: Error): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "CreateAppCatalogFailed",
    getDefaultString("plugins.spfx.createAppcatalogFail", error.message, error.stack),
    getLocalizedString("plugins.spfx.createAppcatalogFail", error.message, error.stack)
  );
}

export function GetTenantFailedError(username?: string, error?: Error): SystemError {
  const param1 = username ? `for user ${username} ` : "";
  const param2 = error ? `due to error ${error.message}` : "";
  return new SystemError(
    Constants.PLUGIN_NAME,
    "GetTenantFailedError",
    getDefaultString("plugins.spfx.GetTenantFailedError", param1, param2),
    getLocalizedString("plugins.spfx.GetTenantFailedError", param1, param2)
  );
}

export function UploadAppPackageFailedError(error: Error): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "UploadAppCatalogFailed",
    getDefaultString("plugins.spfx.uploadAppcatalogFail", error.message),
    getLocalizedString("plugins.spfx.uploadAppcatalogFail", error.message)
  );
}

export function NpmNotFoundError(): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "NpmNotFound",
    message: getDefaultString("plugins.spfx.error.npmNotFound"),
    displayMessage: getLocalizedString("plugins.spfx.error.npmNotFound"),
    helpLink: Constants.SPFX_HELP_LINK,
  });
}

export function NpmVersionNotSupportedError(version: string): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "NpmVersionNotSupported",
    message: getDefaultString(
      "plugins.spfx.error.npmVersionNotSupported",
      version,
      Constants.SPFX_VERSION
    ),
    displayMessage: getLocalizedString(
      "plugins.spfx.error.npmVersionNotSupported",
      version,
      Constants.SPFX_VERSION
    ),
    helpLink: Constants.SPFX_HELP_LINK,
  });
}

export function NodeVersionNotSupportedError(version: string): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "NodeVersionNotSupported",
    message: getDefaultString(
      "plugins.spfx.error.nodeVersionNotSupported",
      version,
      Constants.SPFX_VERSION
    ),
    displayMessage: getLocalizedString(
      "plugins.spfx.error.nodeVersionNotSupported",
      version,
      Constants.SPFX_VERSION
    ),
    helpLink: Constants.SPFX_HELP_LINK,
  });
}

export function NpmInstallError(error: Error): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "NpmInstallFailed",
    getDefaultString("plugins.spfx.error.npmInstallFailed", error.message),
    getLocalizedString("plugins.spfx.error.npmInstallFailed", error.message)
  );
}

export function DependencyValidateError(dependency: string): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "InvalidDependency",
    getDefaultString("plugins.spfx.error.invalidDependency", dependency),
    getLocalizedString("plugins.spfx.error.invalidDependency", dependency)
  );
}

export function DependencyInstallError(dependency: string): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "DependencyInstallFailed",
    getDefaultString("plugins.spfx.error.installDependency", dependency),
    getLocalizedString("plugins.spfx.error.installDependency", dependency)
  );
}

export function NoConfigurationError(): SystemError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "NoConfigurationFile",
    message: getDefaultString("plugins.spfx.error.noConfiguration"),
    displayMessage: getLocalizedString("plugins.spfx.error.noConfiguration"),
    helpLink: Constants.SPFX_HELP_LINK,
  });
}

export function DevEnvironmentSetupError(): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "DevEnvironmentSetupError",
    message: getDefaultString("plugins.spfx.error.devEnvironmentNotSetup"),
    displayMessage: getLocalizedString("plugins.spfx.error.devEnvironmentNotSetup"),
    helpLink: Constants.SetUpDevEnvironmentHelpLink,
  });
}

export function LatestPackageInstallError(): SystemError {
  const fxFolderPath = "HOME/.fx";
  return new SystemError(
    Constants.PLUGIN_NAME,
    "LatestPackageInstallFailed",
    getDefaultString(
      "plugins.spfx.error.installLatestDependencyError",
      fxFolderPath,
      Constants.SetUpDevEnvironmentHelpLink
    ),
    getLocalizedString(
      "plugins.spfx.error.installLatestDependencyError",
      fxFolderPath,
      Constants.SetUpDevEnvironmentHelpLink
    )
  );
}

export function YoGeneratorScaffoldError(): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "ScaffoldFailed",
    message: getDefaultString(
      "plugins.spfx.error.scaffoldError",
      "command:fx-extension.showOutputChannel"
    ),
    displayMessage: getLocalizedString(
      "plugins.spfx.error.scaffoldError",
      "command:fx-extension.showOutputChannel"
    ),
    helpLink: Constants.ScaffoldHelpLink,
  });
}
