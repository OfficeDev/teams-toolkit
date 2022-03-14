// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { FunctionPluginInfo } from "../constants";
import { tips } from "../resources/errors";

export class ValidationError extends UserError {
  constructor(key: string) {
    super(
      new.target.name,
      `Invalid ${key}. Suggestions: ${[tips.recoverTeamsFxConfigFiles, tips.recreateProject].join(
        " "
      )}`,
      FunctionPluginInfo.alias
    );
  }
}

export class FetchConfigError extends UserError {
  constructor(key: string) {
    super(
      new.target.name,
      `Failed to find ${key} from configuration. Suggestions: ${[
        tips.recoverTeamsFxConfigFiles,
        tips.recreateProject,
      ].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}

export class FunctionNameConflictError extends UserError {
  constructor() {
    super(
      new.target.name,
      "Function already exists, please choose another name.",
      FunctionPluginInfo.alias
    );
  }
}

export class FindAppError extends SystemError {
  constructor() {
    super(
      new.target.name,
      `Failed to find the function app. Suggestions: ${[tips.doProvision].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}

export class InitAzureSDKError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to initialize Azure SDK Client. Suggestions: ${[
        tips.checkCredential,
        tips.checkSubscriptionId,
      ].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}

export class InstallNpmPackageError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to install NPM packages. Suggestions: ${[tips.checkPackageJson].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}

export class ConfigFunctionAppError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to retrieve or update function app settings. Suggestions: ${[
        tips.checkSubscriptionId,
        tips.checkNetwork,
        tips.retryRequest,
      ].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}

export class InstallTeamsFxBindingError extends UserError {
  constructor() {
    super(
      new.target.name,
      `Failed to install Azure Functions bindings. Suggestions: ${[
        tips.checkFunctionExtVersion,
      ].join(" ")}`,
      FunctionPluginInfo.alias
    );
  }
}
