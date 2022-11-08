// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "BotRegistrationNotFound";
const messageKey = "driver.m365Bot.error.botRegistrationNotFound";

export class BotRegistrationNotFoundError extends UserError {
  constructor(actionName: string, botId: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, actionName, botId),
      displayMessage: getLocalizedString(messageKey, actionName, botId),
    });
  }
}
