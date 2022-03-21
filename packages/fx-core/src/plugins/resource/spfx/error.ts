// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./utils/constants";
import * as util from "util";
import { getLocalizedString } from "../../../common/localizeUtils";

export function ScaffoldError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return returnSystemError(error, Constants.PLUGIN_NAME, "SPFxScaffoldError");
  }
}

export function NoSPPackageError(distFolder: string): UserError {
  return returnUserError(
    new Error(getLocalizedString("plugins.spfx.cannotFindPackage", distFolder)),
    Constants.PLUGIN_NAME,
    "NoSharePointPackage"
  );
}

export function BuildSPPackageError(error: Error): UserError | SystemError {
  if (error instanceof UserError || error instanceof SystemError) {
    return error;
  } else {
    return returnUserError(error, Constants.PLUGIN_NAME, "BuildSPFxPackageFail");
  }
}

export function NoManifestFileError(distFolder: string): UserError {
  return returnUserError(
    new Error(getLocalizedString("plugins.spfx.cannotFindManifest", distFolder)),
    Constants.PLUGIN_NAME,
    "NoManifestFile"
  );
}

export function GetSPOTokenFailedError(): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.cannotGetSPOToken")),
    Constants.PLUGIN_NAME,
    "GetSPOTokenFailed"
  );
}

export function GetGraphTokenFailedError(): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.cannotGetGraphToken")),
    Constants.PLUGIN_NAME,
    "GetGraphTokenFailed"
  );
}

export function InsufficientPermissionError(appCatalog: string): UserError {
  return returnUserError(
    new Error(getLocalizedString("plugins.spfx.insufficientPermission", appCatalog)),
    Constants.PLUGIN_NAME,
    "InsufficientPermission"
  );
}

export function CreateAppCatalogFailedError(error: Error): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.createAppcatalogFail", error.message, error.stack)),
    Constants.PLUGIN_NAME,
    "CreateAppCatalogFailed"
  );
}

export function GetTenantFailedError(username?: string, error?: Error): SystemError {
  return returnSystemError(
    new Error(
      `Cannot get tenant ` +
        (username ? `for user ${username} ` : "") +
        (error ? `due to error ${error.message}` : "")
    ),
    Constants.PLUGIN_NAME,
    "GetTenantFailedError"
  );
}

export function UploadAppPackageFailedError(error: Error): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.uploadAppcatalogFail", error.message)),
    Constants.PLUGIN_NAME,
    "UploadAppCatalogFailed"
  );
}

export function NpmNotFoundError(): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.error.npmNotFound")),
    Constants.PLUGIN_NAME,
    "NpmNotFound"
  );
}

export function NpmInstallError(error: Error): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.error.npmInstallFailed", error.message)),
    Constants.PLUGIN_NAME,
    "NpmInstallFailed"
  );
}

export function DependencyValidateError(dependency: string): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.error.invalidDependency", dependency)),
    Constants.PLUGIN_NAME,
    "InvalidDependency"
  );
}

export function DependencyInstallError(dependency: string): SystemError {
  return returnSystemError(
    new Error(getLocalizedString("plugins.spfx.error.installDependency", dependency)),
    Constants.PLUGIN_NAME,
    "DependencyInstallFailed"
  );
}
