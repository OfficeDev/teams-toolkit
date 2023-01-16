// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "FileNotFound";
const messageKey = "driver.m365.error.fileNotFound";

export class FileNotFoundUserError extends UserError {
  constructor(actionName: string, filePath: string, helpLink: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, actionName, filePath),
      displayMessage: getLocalizedString(messageKey, actionName, filePath),
      helpLink: helpLink,
    });
  }
}
