// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { Constants, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { tips } from "../resources/errors";
import * as path from "path";
export class UnauthenticatedError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to get user login information. Suggestions: ${tips.doLogin}`,
      FrontendPluginInfo.ShortName
    );
  }
}

export class EnableStaticWebsiteError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to enable static website feature for Azure Storage Account. Suggestions: ${[
        tips.checkSystemTime,
        tips.checkStoragePermissions,
      ].join(" ")}`,
      FrontendPluginInfo.ShortName,
      undefined,
      FrontendPluginInfo.HelpLink
    );
  }
}

export class NpmInstallError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to run 'npm install' for Tab app. Suggestions: ${[
        tips.doNpmInstall,
        tips.checkLog,
      ].join(" ")}`,
      FrontendPluginInfo.ShortName
    );
  }
}

export class BuildError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to build Tab app. Suggestions: ${[tips.doBuild, tips.checkLog].join(" ")}`,
      FrontendPluginInfo.ShortName
    );
  }
}

export class GetContainerError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to get container. '${
        Constants.AzureStorageWebContainer
      }' from Azure Storage Account. Suggestions: ${[
        tips.checkSystemTime,
        tips.checkStoragePermissions,
        tips.checkNetwork,
      ].join(" ")}`,
      FrontendPluginInfo.ShortName
    );
  }
}

export class ClearStorageError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to clear Azure Storage Account. Suggestions: ${[
        tips.checkSystemTime,
        tips.checkNetwork,
      ].join(" ")}`,
      FrontendPluginInfo.ShortName
    );
  }
}

export class UploadToStorageError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to upload local path ${path.join(
        FrontendPathInfo.WorkingDir,
        FrontendPathInfo.BuildPath
      )} to Azure Storage Account. Suggestions: ${[tips.checkSystemTime, tips.checkNetwork].join(
        " "
      )}`,
      FrontendPluginInfo.ShortName
    );
  }
}
