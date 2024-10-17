// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { camelCase } from "lodash";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { DepsCheckerError } from "../../../../error/depCheck";

const errorCode = "DotnetInstallationError";
const messageKey = "driver.prerequisite.error.dotnetInstallationError";

export class DotnetInstallationUserError extends UserError {
  constructor(actionName: string, error: any, helpLink?: string) {
    super({
      source: camelCase(actionName),
      name: errorCode,
      message: error instanceof DepsCheckerError ? error.message : getDefaultString(messageKey),
      displayMessage:
        error instanceof DepsCheckerError ? error.message : getLocalizedString(messageKey),
      helpLink: helpLink,
    });
  }
}
