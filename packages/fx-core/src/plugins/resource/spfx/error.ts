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
