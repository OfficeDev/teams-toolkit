// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "UnexpectedEmptyBotPassword";
const messageKey = "driver.botAadApp.error.unexpectedEmptyBotPassword";

export class UnexpectedEmptyBotPasswordError extends UserError {
  constructor(actionName: string, helpLink: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, actionName),
      displayMessage: getLocalizedString(messageKey, actionName),
      helpLink: helpLink,
    });
  }
}
