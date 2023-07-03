// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "InvalidBotId";
const messageKey = "driver.botFramework.error.InvalidBotId";

export class InvalidBotIdUserError extends UserError {
  constructor(actionName: string, botId: string, helpLink: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, botId),
      displayMessage: getLocalizedString(messageKey, botId),
      helpLink: helpLink,
    });
  }
}
