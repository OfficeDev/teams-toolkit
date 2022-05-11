// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { Constants, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { tips } from "../resources/errors";
import * as path from "path";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

export class UnauthenticatedError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.UnauthenticatedError"),
        tips.doLogin
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.UnauthenticatedError"),
        tips.doLogin
      )
    );
  }
}

export class EnableStaticWebsiteError extends UserError {
  constructor() {
    super({
      message: getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.EnableStaticWebsiteError"),
        [tips.checkSystemTime, tips.checkStoragePermissions].join(" ")
      ),
      displayMessage: getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.EnableStaticWebsiteError"),
        [tips.checkSystemTime, tips.checkStoragePermissions].join(" ")
      ),
      source: FrontendPluginInfo.ShortName,
      helpLink: FrontendPluginInfo.HelpLink,
    });
  }
}

export class NpmInstallError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.NpmInstallError"),
        [tips.doNpmInstall, tips.checkLog].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.NpmInstallError"),
        [tips.doNpmInstall, tips.checkLog].join(" ")
      )
    );
  }
}

export class BuildError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.BuildError"),
        [tips.doBuild, tips.checkLog].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.BuildError"),
        [tips.doBuild, tips.checkLog].join(" ")
      )
    );
  }
}

export class GetContainerError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
        [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
        [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork].join(" ")
      )
    );
  }
}

export class ClearStorageError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.frontend.ClearStorageError"),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.ClearStorageError"),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      )
    );
  }
}

export class UploadToStorageError extends UserError {
  constructor() {
    super(
      FrontendPluginInfo.ShortName,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      )
    );
  }
}
