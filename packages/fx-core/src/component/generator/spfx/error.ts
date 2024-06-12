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

export function DependencyValidateError(dependency: string): SystemError {
  return new SystemError(
    Constants.PLUGIN_NAME,
    "InvalidDependency",
    getDefaultString("plugins.spfx.error.invalidDependency", dependency),
    getLocalizedString("plugins.spfx.error.invalidDependency", dependency)
  );
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

export function PackageTargetVersionInstallError(
  packageName: string,
  version: string
): SystemError {
  const fxFolderPath = "HOME/.fx";
  const packageInfo = `${packageName}@${version}`;
  return new SystemError(
    Constants.PLUGIN_NAME,
    "PackageTargetVersionInstallError",
    getDefaultString(
      "plugins.spfx.error.installDependencyError",
      fxFolderPath,
      Constants.AddWebpartHelpLink,
      packageInfo
    ),
    getLocalizedString(
      "plugins.spfx.error.installDependencyError",
      fxFolderPath,
      Constants.AddWebpartHelpLink,
      packageInfo
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

export function CopyExistingSPFxSolutionError(e: Error): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "CopyExistingSPFxSolutioinFailed",
    message: getDefaultString("plugins.spfx.error.import.copySPFxSolution", e.message),
    displayMessage: getLocalizedString("plugins.spfx.error.import.copySPFxSolution", e.message),
    helpLink: Constants.IMPORT_HELP_LINK,
  });
}

export function RetrieveSPFxInfoError(): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "RetrieveSPFxInfoFailed",
    message: getDefaultString("plugins.spfx.error.import.retrieveSolutionInfo"),
    displayMessage: getLocalizedString("plugins.spfx.error.import.retrieveSolutionInfo"),
    helpLink: Constants.IMPORT_HELP_LINK,
  });
}

export function UpdateSPFxTemplateError(e: Error): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "UpdateSPFxTemplateFailed",
    message: getDefaultString("plugins.spfx.error.import.updateSPFxTemplate", e.message),
    displayMessage: getLocalizedString("plugins.spfx.error.import.updateSPFxTemplate", e.message),
    helpLink: Constants.IMPORT_HELP_LINK,
  });
}

export function ImportSPFxSolutionError(e: Error): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "ImportSPFxSolutionFailed",
    message: getDefaultString("plugins.spfx.error.import.common", e.message),
    displayMessage: getLocalizedString("plugins.spfx.error.import.common", e.message),
    helpLink: Constants.IMPORT_HELP_LINK,
  });
}

export function PathAlreadyExistsError(path: string): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "PathAlreadyExists",
    message: getDefaultString("core.QuestionAppName.validation.pathExist", path),
    displayMessage: getLocalizedString("core.QuestionAppName.validation.pathExist", path),
  });
}

export function SolutionVersionMissingError(path: string): UserError {
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "SolutionVersionMissing",
    message: getDefaultString("plugins.spfx.addWebPart.cannotFindSolutionVersion", path),
    displayMessage: getLocalizedString("plugins.spfx.addWebPart.cannotFindSolutionVersion", path),
  });
}

export function CannotFindPropertyfromJsonError(field: string): UserError {
  const message = `Cannot find property "${field}" from json.`;
  return new UserError({
    source: Constants.PLUGIN_NAME,
    name: "CannotFindPropertyfromJson",
    message,
    displayMessage: message, // This message won't be shown to users. No need to localize.
  });
}
