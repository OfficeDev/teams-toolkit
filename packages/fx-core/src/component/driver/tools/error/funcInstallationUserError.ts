// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { DepsCheckerError } from "../../../../common/deps-checker/depsError";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "FuncInstallationError";
const messageKey = "driver.prerequisite.error.funcInstallationError";

export class FuncInstallationUserError extends UserError {
  constructor(actionName: string, error: any) {
    super({
      source: actionName,
      name: errorCode,
      message: error instanceof DepsCheckerError ? error.message : getDefaultString(messageKey),
      displayMessage:
        error instanceof DepsCheckerError ? error.message : getLocalizedString(messageKey),
    });
  }
}
