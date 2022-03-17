// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { Constants, FrontendPathInfo, FrontendPluginInfo } from "../constants";
import { tips } from "../resources/errors";
import * as path from "path";
import { getLocalizedString } from "../../../../common/localizeUtils";

export class UnauthenticatedError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.UnauthenticatedError"),
        tips.doLogin
      ),
      FrontendPluginInfo.ShortName
    );
  }
}

export class EnableStaticWebsiteError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.EnableStaticWebsiteError"),
        [tips.checkSystemTime, tips.checkStoragePermissions].join(" ")
      ),
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
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.NpmInstallError"),
        [tips.doNpmInstall, tips.checkLog].join(" ")
      ),
      FrontendPluginInfo.ShortName
    );
  }
}

export class BuildError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.BuildError"),
        [tips.doBuild, tips.checkLog].join(" ")
      ),
      FrontendPluginInfo.ShortName
    );
  }
}

export class GetContainerError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.GetContainerError", Constants.AzureStorageWebContainer),
        [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork].join(" ")
      ),
      FrontendPluginInfo.ShortName
    );
  }
}

export class ClearStorageError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.frontend.ClearStorageError"),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      ),
      FrontendPluginInfo.ShortName
    );
  }
}

export class UploadToStorageError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        path.join(FrontendPathInfo.WorkingDir, FrontendPathInfo.BuildPath),
        [tips.checkSystemTime, tips.checkNetwork].join(" ")
      ),
      FrontendPluginInfo.ShortName
    );
  }
}
