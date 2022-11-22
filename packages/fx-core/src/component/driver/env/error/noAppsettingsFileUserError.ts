// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "NoAppsettingsFileUserError";
const messageKey = "driver.env.error.noAppsettingsFileUserError";

export class NoAppsettingsFileUserError extends UserError {
  constructor(actionName: string, fileName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, fileName),
      displayMessage: getLocalizedString(messageKey, fileName),
    });
  }
}
