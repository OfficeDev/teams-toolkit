// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { maxDomainPerApiKey } from "../utility/constants";

const errorCode = "ApiKeyDomainInvalid";
const messageKey = "driver.apiKey.error.domainInvalid";

export class ApiKeyDomainInvalidError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey, maxDomainPerApiKey),
    });
  }
}
