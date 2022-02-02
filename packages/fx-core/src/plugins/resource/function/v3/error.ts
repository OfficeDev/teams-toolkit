// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { FunctionPluginInfo } from "../constants";
import { tips } from "../resources/errors";

export class ValidationError extends UserError {
  constructor(key: string) {
    super(
      new.target.name,
      `Invalid ${key}. Suggestions: ${[tips.recoverTeamsfxConfigFiles, tips.recreateProject].join(
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
        tips.recoverTeamsfxConfigFiles,
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
