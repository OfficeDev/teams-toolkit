// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "OauthFailedToGetDomain";
const messageKey = "driver.apiKey.error.failedToGetDomain";

export class OauthFailedToGetDomainError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
    });
  }
}
