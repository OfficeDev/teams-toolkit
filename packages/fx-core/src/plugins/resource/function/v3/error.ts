// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { FunctionPluginInfo } from "../constants";
import { tips } from "../resources/errors";

export class ValidationError extends UserError {
  constructor(key: string) {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.ValidationError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class FetchConfigError extends UserError {
  constructor(key: string) {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FetchConfigError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class FunctionNameConflictError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FunctionNameConfigError"),
        tips.checkLog
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class FindAppError extends SystemError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FunctionAppError"),
        [tips.doProvision].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class InitAzureSDKError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InitAzureSDKError"),
        [tips.checkCredential, tips.checkSubscriptionId].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class InstallNpmPackageError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InstallNpmPackageError"),
        [tips.checkPackageJson].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class ConfigFunctionAppError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.ConfigFunctionAppError"),
        [tips.checkSubscriptionId, tips.checkNetwork, tips.retryRequest].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}

export class InstallTeamsFxBindingError extends UserError {
  constructor() {
    super(
      new.target.name,
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InstallTeamsFxBindingError"),
        [tips.checkFunctionExtVersion].join(" ")
      ),
      FunctionPluginInfo.alias
    );
  }
}
