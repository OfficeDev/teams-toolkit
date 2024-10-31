// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "ApiKeyAuthMissingInSpec";
const messageKey = "driver.apiKey.error.authMissingInSpec";

export class ApiKeyAuthMissingInSpecError extends UserError {
  constructor(actionName: string, authName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey, authName),
      displayMessage: getLocalizedString(messageKey, authName),
    });
  }
}
