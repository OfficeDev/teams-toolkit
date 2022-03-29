// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { FunctionPluginInfo } from "../constants";
import { tips } from "../resources/errors";

export class ValidationError extends UserError {
  constructor(key: string) {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.ValidationError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.ValidationError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      )
    );
  }
}

export class FetchConfigError extends UserError {
  constructor(key: string) {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.FetchConfigError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FetchConfigError", key),
        [tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(" ")
      )
    );
  }
}

export class FunctionNameConflictError extends UserError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.FunctionNameConfigError"),
        tips.checkLog
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FunctionNameConfigError"),
        tips.checkLog
      )
    );
  }
}

export class FindAppError extends SystemError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.FunctionAppError"),
        [tips.doProvision].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.FunctionAppError"),
        [tips.doProvision].join(" ")
      )
    );
  }
}

export class InitAzureSDKError extends UserError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.InitAzureSDKError"),
        [tips.checkCredential, tips.checkSubscriptionId].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InitAzureSDKError"),
        [tips.checkCredential, tips.checkSubscriptionId].join(" ")
      )
    );
  }
}

export class InstallNpmPackageError extends UserError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.InstallNpmPackageError"),
        [tips.checkPackageJson].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InstallNpmPackageError"),
        [tips.checkPackageJson].join(" ")
      )
    );
  }
}

export class ConfigFunctionAppError extends UserError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.ConfigFunctionAppError"),
        [tips.checkSubscriptionId, tips.checkNetwork, tips.retryRequest].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.ConfigFunctionAppError"),
        [tips.checkSubscriptionId, tips.checkNetwork, tips.retryRequest].join(" ")
      )
    );
  }
}

export class InstallTeamsFxBindingError extends UserError {
  constructor() {
    super(
      FunctionPluginInfo.alias,
      new.target.name,
      getDefaultString(
        "plugins.baseErrorMessage",
        getDefaultString("error.function.InstallTeamsFxBindingError"),
        [tips.checkFunctionExtVersion].join(" ")
      ),
      getLocalizedString(
        "plugins.baseErrorMessage",
        getLocalizedString("error.function.InstallTeamsFxBindingError"),
        [tips.checkFunctionExtVersion].join(" ")
      )
    );
  }
}
